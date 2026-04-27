'use strict';
require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const rateLimit    = require('express-rate-limit');

const issuesRouter      = require('./routes/issues');
const volunteersRouter  = require('./routes/volunteers');
const matchRouter       = require('./routes/match');
const assignmentsRouter = require('./routes/assignments');
const dashboardRouter   = require('./routes/dashboard');
const analyticsRouter   = require('./routes/analytics');

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '2mb' }));
app.use(morgan('dev'));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({ windowMs: 60_000, max: 200, standardHeaders: true });
app.use(limiter);

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({
  status: 'ok',
  service: 'ngo-smart-resource-api',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
}));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/v1/issues',     issuesRouter);
app.use('/v1/volunteers', volunteersRouter);
app.use('/v1/match',      matchRouter);
app.use('/v1/assignments',assignmentsRouter);
app.use('/v1/dashboard',  dashboardRouter);
app.use('/v1/analytics',  analyticsRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } }));

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: { code: err.code || 'INTERNAL_ERROR', message: err.message } });
});

app.listen(PORT, () => console.log(`\n🚀  NGO Smart Resource API running on http://localhost:${PORT}\n`));

module.exports = app;
