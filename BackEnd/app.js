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
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
};

app.use(cors(corsOptions));

app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic Route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Nexora API', version: '1.0.0' });
});

// Static files — avatars
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth',                      require('./routes/authRoutes'));
app.use('/api/companies',                  require('./routes/companyRoutes'));
app.use('/api/companies/:id/users',        require('./routes/usersRoutes'));
app.use('/api/companies/:id',              require('./routes/commercialRoutes'));
app.use('/api/companies/:id',              require('./routes/companyConfigRoutes'));
app.use('/api/solicitudes',                require('./routes/solicitudesRoutes'));
app.use('/api/subscriptions',              require('./routes/subscriptionRoutes'));
app.use('/api/stats',                      require('./routes/statsRoutes'));
app.use('/api/modules',                    require('./routes/modulesRoutes'));
app.use('/api/profiles',                   require('./routes/profilesRoutes'));

const authMiddleware  = require('./middleware/authMiddleware');
const usersController = require('./controllers/usersController');
const upload          = require('./utils/upload');

app.get('/api/users',          authMiddleware, usersController.getAllUsers);
app.post('/api/users/avatar',  authMiddleware, upload.single('avatar'), usersController.uploadAvatar);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message, err.stack);
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Something went wrong!' });
});

module.exports = app;
