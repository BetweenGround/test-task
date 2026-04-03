require('dotenv').config({ path: __dirname + '/../.env' });
console.log('👉 ENV DATABASE_URL:', process.env.DATABASE_URL);
console.log('👉 ENV DB_USER:', process.env.DB_USER);
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const requestRoutes = require('./routes/requests');
const stockRoutes = require('./routes/stock');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);

// Socket.io for real-time updates
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || '*', methods: ['GET', 'POST'] }
});

// Security
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: 'Too many requests' });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: 'Too many auth attempts' });
app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Attach io to every request for route-level emit
app.use((req, _res, next) => { req.io = io; next(); });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/stock', stockRoutes);

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', ts: new Date() }));

// Socket authentication
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Unauthorized'));
  try {
    const jwt = require('jsonwebtoken');
    socket.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`[WS] Connected: ${socket.user?.email}`);
  socket.on('disconnect', () => console.log(`[WS] Disconnected: ${socket.user?.email}`));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 LogistiQ API running on port ${PORT}`));
