const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../utils/db');

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  console.log('👉 LOGIN BODY:', req.body); // DEBUG

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ VALIDATION ERRORS:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 🔍 Check DB response
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    console.log('👉 DB RESULT:', result.rows);

    const user = result.rows[0];

    if (!user) {
      console.log('❌ USER NOT FOUND');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 🔍 Check password field exists
    if (!user.password_hash) {
      console.error('❌ password_hash missing in DB:', user);
      return res.status(500).json({ error: 'User data corrupted' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      console.log('❌ INVALID PASSWORD');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 🔍 Check JWT secret
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET is missing in .env');
      return res.status(500).json({ error: 'Server misconfiguration' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        warehouse_id: user.warehouse_id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    console.log('✅ LOGIN SUCCESS:', user.email);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error('🔥 LOGIN ERROR:', err); // VERY IMPORTANT
    res.status(500).json({ error: err.message }); // show real error
  }
});


// POST /api/auth/register
router.post('/register', [
  body('email').isEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty(),
], async (req, res) => {
  console.log('👉 REGISTER BODY:', req.body);

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('❌ VALIDATION ERRORS:', errors.array());
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, name, role = 'operator', warehouse_id } = req.body;

  try {
    const hash = await bcrypt.hash(password, 10);

    const result = await db.query(
      'INSERT INTO users (email, password_hash, name, role, warehouse_id) VALUES ($1,$2,$3,$4,$5) RETURNING id, email, name, role',
      [email, hash, name, role, warehouse_id || null]
    );

    console.log('✅ USER CREATED:', result.rows[0]);

    res.status(201).json({ user: result.rows[0] });

  } catch (err) {
    console.error('🔥 REGISTER ERROR:', err);

    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }

    res.status(500).json({ error: err.message });
  }
});

module.exports = router;