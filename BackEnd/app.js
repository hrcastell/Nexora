const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
const path    = require('path');

const app = express();

// Middleware
app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://nexoragarage.hrcastell.com',
  'https://admin.nexoragarage.hrcastell.com'
];

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'x-auth-token'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Nexora API', version: '1.0.0' });
});

// Static files — avatars and garage uploads
// Cross-Origin-Resource-Policy must be cross-origin so browsers can load
// images from a different origin (e.g. nexoragarage.hrcastell.com served
// by the frontend at a different subdomain).
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Module guard (log-only by default; set MODULE_GUARD=strict to block).
// Mounted before routes so it inspects req.method + req.path for every /api/* call.
// It reads req.user from the JWT that individual route-middlewares populate; since
// this middleware runs BEFORE the per-route auth, it also runs a lightweight
// token decode itself so req.user is available here.
const moduleGuard = require('./middleware/requireModule');
const preAuthForGuard = require('./middleware/optionalAuth');
app.use('/api', preAuthForGuard, moduleGuard);

// Routes
app.use('/api/auth',                      require('./routes/authRoutes'));
app.use('/api/companies',                  require('./routes/companyRoutes'));
app.use('/api/companies/:id/users',            require('./routes/usersRoutes'));
app.use('/api/companies/:companyId/profiles',  require('./routes/companyProfilesRoutes'));
app.use('/api/companies/:id',                  require('./routes/commercialRoutes'));
app.use('/api/companies/:id',                  require('./routes/companyConfigRoutes'));
app.use('/api/solicitudes',                require('./routes/solicitudesRoutes'));
app.use('/api/subscriptions',              require('./routes/subscriptionRoutes'));
app.use('/api/subscription-plans',         require('./routes/subscriptionPlansRoutes'));
app.use('/api/stats',                      require('./routes/statsRoutes'));
app.use('/api/modules',                    require('./routes/modulesRoutes'));
app.use('/api/profiles',                   require('./routes/profilesRoutes'));
app.use('/api/catalog',                    require('./routes/catalogRoutes'));
app.use('/api/menu',                       require('./routes/menuRoutes'));
app.use('/api/companies/:id/modules',      require('./routes/companyModulesRoutes'));
app.use('/api/notifications',              require('./routes/notificationsRoutes'));
app.use('/api/maintenance',                require('./routes/maintenanceRoutes'));

// ── Core 1: Garage Operations ──────────────────────────────────
// Ruta directa (usuario opera en su propia empresa del token)
app.use('/api/garage',                     require('./routes/garage/garageRoutes'));
// Ruta cross-company (super_admin opera en empresa específica)
app.use('/api/companies/:id/garage',       require('./routes/garage/garageRoutes'));

// ── Core 2: Financial Core ─────────────────────────────────────
app.use('/api/financial',                  require('./routes/financial/financialRoutes'));
app.use('/api/companies/:id/financial',    require('./routes/financial/financialRoutes'));

// ── Core 3: Dental Core ──────────────────────────────────────
app.use('/api/dental',                     require('./routes/dental/dentalRoutes'));
app.use('/api/companies/:id/dental',       require('./routes/dental/dentalRoutes'));

// ── Core 4: Inventory ────────────────────────────────────────
app.use('/api/inventory',                  require('./routes/inventory/inventoryRoutes'));

// Core 5: Human Resources
app.use('/api/hr',                         require('./routes/hr/hrRoutes'));

// Core 6: Treasury and Collections
app.use('/api/treasury',                   require('./routes/treasury/treasuryRoutes'));

// ── Products (neutral catalog, OR-gated: garage_operations OR inventory) ──
app.use('/api/products',                   require('./routes/products/productsRoutes'));

// ── Cotizaciones (standalone module) ────────────────────────────
app.use('/api/cotizaciones',               require('./routes/cotizaciones/cotizacionesRoutes'));

const authMiddleware  = require('./middleware/authMiddleware');
const usersController = require('./controllers/usersController');
const upload          = require('./utils/upload');

app.get('/api/users',             authMiddleware, usersController.getAllUsers);
app.delete('/api/users/:userId',  authMiddleware, usersController.deleteUser);
app.post('/api/users/avatar',     authMiddleware, upload.single('avatar'), usersController.uploadAvatar);

// Error Handling Middleware
app.use((err, req, res, next) => {
  // Ensure CORS headers are present even when an error bypasses the cors() middleware
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
  }
  console.error('Unhandled error:', err.message, err.stack);
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
