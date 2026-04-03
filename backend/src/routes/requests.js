const router = require('express').Router();
const db = require('../utils/db');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const PRIORITY_WEIGHT = { critical: 100, elevated: 50, normal: 10 };

// GET /api/requests — list all requests, sorted by priority score
router.get('/', auth(), async (req, res) => {
  try {
    const { status, priority } = req.query;
    let where = 'WHERE 1=1';
    const params = [];
    if (status) { params.push(status); where += ` AND sr.status = $${params.length}`; }
    if (priority) { params.push(priority); where += ` AND sr.priority = $${params.length}`; }

    const result = await db.query(`
      SELECT 
        sr.id, sr.priority, sr.status, sr.requested_quantity, sr.fulfilled_quantity,
        sr.notes, sr.created_at, sr.updated_at,
        dp.name AS delivery_point, dp.address AS delivery_address,
        dp.lat, dp.lng,
        r.name AS resource_name, r.unit,
        w.name AS assigned_warehouse,
        u.name AS created_by_name,
        CASE sr.priority
          WHEN 'critical' THEN 100
          WHEN 'elevated' THEN 50
          ELSE 10
        END AS priority_score
      FROM supply_requests sr
      JOIN delivery_points dp ON sr.delivery_point_id = dp.id
      JOIN resources r ON sr.resource_id = r.id
      LEFT JOIN warehouses w ON sr.assigned_warehouse_id = w.id
      LEFT JOIN users u ON sr.created_by = u.id
      ${where}
      ORDER BY priority_score DESC, sr.created_at ASC
    `, params);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/requests — create new request
router.post('/', auth(), [
  body('delivery_point_id').isUUID(),
  body('resource_id').isUUID(),
  body('requested_quantity').isFloat({ min: 0.01 }),
  body('priority').isIn(['normal', 'elevated', 'critical']),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { delivery_point_id, resource_id, requested_quantity, priority, notes } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO supply_requests (delivery_point_id, resource_id, requested_quantity, priority, notes, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [delivery_point_id, resource_id, requested_quantity, priority, notes || null, req.user.id]);

    const request = result.rows[0];

    // Emit via socket if critical
    if (priority === 'critical' && req.io) {
      req.io.emit('critical_request', { request });
    }

    res.status(201).json(request);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/requests/:id/priority — update priority (recalculate)
router.patch('/:id/priority', auth(['admin', 'dispatcher']), [
  body('priority').isIn(['normal', 'elevated', 'critical']),
], async (req, res) => {
  const { priority } = req.body;
  try {
    const result = await db.query(`
      UPDATE supply_requests SET priority = $1, updated_at = NOW()
      WHERE id = $2 RETURNING *
    `, [priority, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });

    if (req.io) req.io.emit('request_updated', { id: req.params.id, priority });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/requests/:id/status
router.patch('/:id/status', auth(), [
  body('status').isIn(['pending', 'in_progress', 'fulfilled', 'cancelled']),
  body('fulfilled_quantity').optional().isFloat({ min: 0 }),
], async (req, res) => {
  const { status, fulfilled_quantity } = req.body;
  try {
    const result = await db.query(`
      UPDATE supply_requests 
      SET status = $1, fulfilled_quantity = COALESCE($2, fulfilled_quantity), updated_at = NOW()
      WHERE id = $3 RETURNING *
    `, [status, fulfilled_quantity, req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });

    if (req.io) req.io.emit('request_updated', { id: req.params.id, status });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/requests/:id/allocate — smart allocation algorithm
router.post('/:id/allocate', auth(['admin', 'dispatcher', 'operator']), async (req, res) => {
  const { id } = req.params;
  try {
    // Get request details
    const reqResult = await db.query(`
      SELECT sr.*, r.name as resource_name
      FROM supply_requests sr
      JOIN resources r ON sr.resource_id = r.id
      WHERE sr.id = $1 AND sr.status IN ('pending', 'in_progress')
    `, [id]);
    const request = reqResult.rows[0];
    if (!request) return res.status(404).json({ error: 'Request not found or already fulfilled' });

    const needed = request.requested_quantity - request.fulfilled_quantity;

    // Find warehouses with available stock, sorted by available qty descending
    const stockResult = await db.query(`
      SELECT s.warehouse_id, s.quantity, s.min_threshold, w.name, w.lat, w.lng
      FROM stock s
      JOIN warehouses w ON s.warehouse_id = w.id
      WHERE s.resource_id = $1 AND s.quantity > s.min_threshold AND w.is_active = true
      ORDER BY (s.quantity - s.min_threshold) DESC
    `, [request.resource_id]);

    if (stockResult.rows.length === 0) {
      return res.status(409).json({ error: 'No stock available across all warehouses' });
    }

    // Greedy allocation: fill from best warehouse first
    let remaining = needed;
    const allocations = [];
    for (const wh of stockResult.rows) {
      if (remaining <= 0) break;
      const available = wh.quantity - wh.min_threshold;
      const toAllocate = Math.min(available, remaining);
      allocations.push({ warehouse_id: wh.warehouse_id, warehouse_name: wh.name, quantity: toAllocate });
      remaining -= toAllocate;
    }

    const totalAllocated = needed - remaining;

    // Apply allocations in DB
    for (const alloc of allocations) {
      await db.query(`
        UPDATE stock SET quantity = quantity - $1, updated_at = NOW()
        WHERE warehouse_id = $2 AND resource_id = $3
      `, [alloc.quantity, alloc.warehouse_id, request.resource_id]);

      await db.query(`
        INSERT INTO allocations (request_id, warehouse_id, resource_id, quantity, allocated_by)
        VALUES ($1, $2, $3, $4, $5)
      `, [id, alloc.warehouse_id, request.resource_id, alloc.quantity, req.user.id]);
    }

    const newStatus = remaining <= 0 ? 'fulfilled' : 'in_progress';
    await db.query(`
      UPDATE supply_requests
      SET fulfilled_quantity = fulfilled_quantity + $1, status = $2, 
          assigned_warehouse_id = $3, updated_at = NOW()
      WHERE id = $4
    `, [totalAllocated, newStatus, allocations[0].warehouse_id, id]);

    if (req.io) req.io.emit('request_updated', { id, status: newStatus, allocations });

    res.json({ allocations, total_allocated: totalAllocated, status: newStatus, remaining_shortage: remaining > 0 ? remaining : 0 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
