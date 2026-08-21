require('dotenv').config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`FATAL: Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const app = require('./app');
const { runMigrations } = require('./migrations/runner');

const PORT = process.env.PORT || 8090;

(async () => {
  try {
    await runMigrations();
  } catch (err) {
    console.error('FATAL: migration bootstrap failed:', err.message);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
})();
