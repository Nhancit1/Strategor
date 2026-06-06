import dotenv from 'dotenv';
dotenv.config();

const required = (key, fallback) => {
  const v = process.env[key] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
};

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/strategor',

  jwt: {
    secret: required('JWT_SECRET', 'CHANGEME-dev-secret-min-32-chars-XXXXXXXXXXXXXX'),
    accessTtlSeconds: parseInt(process.env.JWT_EXPIRY || '900', 10), // 15 min; client auto-refreshes
    refreshTtlSeconds: parseInt(process.env.JWT_REFRESH_EXPIRY || '2592000', 10),
  },

  cors: {
    origins: (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  },

  // Python AI/export microservice
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    // Shared secret: Node <-> Python internal calls
    internalToken: process.env.INTERNAL_TOKEN || 'dev-internal-token-change-me',
  },

  // AI cost reporting. We ALERT (never block) once a project's all-in AI cost
  // crosses this threshold. Default $2.00. Admin-facing only.
  cost: {
    alertThresholdCents: parseInt(process.env.COST_ALERT_THRESHOLD_CENTS || '200', 10),
  },

  // Public base URL Node exposes to Python for callbacks (its own address)
  selfUrl: process.env.SELF_URL || 'http://localhost:4000',

  upload: {
    dir: process.env.UPLOAD_PATH || '/tmp/strategor-uploads',
    maxBytes: parseInt(process.env.UPLOAD_MAX_BYTES || '26214400', 10), // 25 MB
    maxPerProject: parseInt(process.env.UPLOAD_MAX_PER_PROJECT || '5', 10),
  },

  email: {
    enabled: (process.env.EMAIL_ENABLED || 'false') === 'true',
    from: process.env.EMAIL_FROM || 'noreply@strategor.local',
  },

  // SMTP (used to send admin-provisioned credentials when EMAIL_ENABLED=true).
  smtp: {
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASSWORD || '',
  },

  appUrl: process.env.APP_URL || 'http://localhost:5173',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
};

if (Buffer.byteLength(config.jwt.secret, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be at least 256 bits (32 chars).');
}

// Refuse to boot in production with shipped/default secrets.
if (config.nodeEnv === 'production') {
  if (config.jwt.secret.startsWith('CHANGEME')) {
    throw new Error('Refuse to start in production with a default JWT_SECRET. Set a strong JWT_SECRET.');
  }
  if (config.aiService.internalToken === 'dev-internal-token-change-me') {
    throw new Error('Refuse to start in production with the default INTERNAL_TOKEN. Set a strong INTERNAL_TOKEN.');
  }
}
