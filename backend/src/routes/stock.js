const router = require('express').Router();
const db = require('../utils/db');
const auth = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// GET /api/stock — stock overview across all warehouses
router.get('/', auth(), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        s.id, s.quantity, s.min_threshold, s.updated_at,
        w.id AS warehouse_id, w.name AS warehouse_name, w.address, w.lat, w.lng,
        r.id AS resource_id, r.name AS resource_name, r.unit, r.category,
        CASE 
          WHEN s.quantity <= s.min_threshold THEN 'critical'
          WHEN s.quantity <= s.min_threshold * 2 THEN 'low'
          ELSE 'ok'
        END AS stock_status
      FROM stock s
      JOIN warehouses w ON s.warehouse_id = w.id
      JOIN resources r ON s.resource_id = r.id
      WHERE w.is_active = true
      ORDER BY w.name, r.category, r.name
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stock/nearest — find nearest warehouses with a specific resource
router.get('/nearest', auth(), async (req, res) => {
  const { resource_id, lat, lng, quantity = 1 } = req.query;
  if (!resource_id || !lat || !lng) {
    return res.status(400).json({ error: 'resource_id, lat, lng are required' });
  }
  try {
    // Distance in km using Haversine approximation in SQL
    const result = await db.query(`
      SELECT 
        w.id, w.name, w.address, w.lat, w.lng,
        s.quantity, s.min_threshold,
        r.name AS resource_name, r.unit,
        (
          6371 * acos(
            cos(radians($2)) * cos(radians(w.lat)) *
            cos(radians(w.lng) - radians($3)) +
            sin(radians($2)) * sin(radians(w.lat))
          )
        ) AS distance_km
      FROM stock s
      JOIN warehouses w ON s.warehouse_id = w.id
      JOIN resources r ON s.resource_id = r.id
      WHERE s.resource_id = $1
        AND (s.quantity - s.min_threshold) >= $4
        AND w.is_active = true
      ORDER BY distance_km ASC
      LIMIT 5
    `, [resource_id, parseFloat(lat), parseFloat(lng), parseFloat(quantity)]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/stock/:warehouse_id/:resource_id — update stock level
router.patch('/:warehouse_id/:resource_id', auth(['admin', 'dispatcher']), [
  body('quantity').isFloat({ min: 0 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { warehouse_id, resource_id } = req.params;
  const { quantity, min_threshold } = req.body;
  try {
    const result = await db.query(`
      INSERT INTO stock (warehouse_id, resource_id, quantity, min_threshold)
      VALUES ($1, $2, $3, COALESCE($4, 0))
      ON CONFLICT (warehouse_id, resource_id)
      DO UPDATE SET quantity = $3, min_threshold = COALESCE($4, stock.min_threshold), updated_at = NOW()
      RETURNING *
    `, [warehouse_id, resource_id, quantity, min_threshold]);

    if (req.io) req.io.emit('stock_updated', result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stock/warehouses
router.get('/warehouses', auth(), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM warehouses WHERE is_active = true ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stock/resources
router.get('/resources', auth(), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM resources ORDER BY category, name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stock/delivery-points
router.get('/delivery-points', auth(), async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM delivery_points WHERE is_active = true ORDER BY name');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stock/stats — dashboard summary
router.get('/stats', auth(), async (req, res) => {
  try {
    const [critical, pending, inProgress, fulfilled] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM supply_requests WHERE status IN ('pending','in_progress') AND priority = 'critical'`),
      db.query(`SELECT COUNT(*) FROM supply_requests WHERE status = 'pending'`),
      db.query(`SELECT COUNT(*) FROM supply_requests WHERE status = 'in_progress'`),
      db.query(`SELECT COUNT(*) FROM supply_requests WHERE status = 'fulfilled' AND updated_at > NOW() - INTERVAL '24h'`),
    ]);
    res.json({
      critical_alerts: parseInt(critical.rows[0].count),
      pending_requests: parseInt(pending.rows[0].count),
      in_progress: parseInt(inProgress.rows[0].count),
      fulfilled_today: parseInt(fulfilled.rows[0].count),
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
