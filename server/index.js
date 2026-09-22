import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import { connectDatabase } from './config/db.js';
import { Branch, Category, User } from './models/index.js';
import authRoutes from './routes/auth.js';
import medicineRoutes from './routes/medicines.js';
import inventoryRoutes from './routes/inventory.js';
import salesRoutes from './routes/sales.js';
import reportRoutes from './routes/reports.js';
import dashboardRoutes from './routes/dashboard.js';
import auditRoutes from './routes/audit.js';
import adminRoutes from './routes/admin.js';
import { errorHandler, notFound } from './middleware/error.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGINS) throw new Error('CORS_ORIGINS is required in production');
await connectDatabase();

async function bootstrap() {
  let mainBranch = await Branch.findOne({ isMain: true });
  if (!mainBranch) mainBranch = await Branch.create({ name: 'Main Pharmacy', code: 'MAIN', isMain: true, isActive: true });
  const defaultCategories = ['Analgesics', 'Antibiotics', 'Antihistamines', 'Gastrointestinal', 'Cardiovascular', 'Diabetes', 'Vitamins & Supplements', 'Dermatology', 'Respiratory', 'Other'];
  for (const name of defaultCategories) await Category.updateOne({ name }, { $setOnInsert: { name, isActive: true } }, { upsert: true });

  const adminEmail = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  if (adminEmail && adminPassword && !(await User.exists({ email: adminEmail }))) {
    if (adminPassword.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
    await User.create({ fullName: process.env.ADMIN_NAME || 'System Admin', email: adminEmail, role: 'admin', branch: mainBranch._id, passwordHash: await User.hashPassword(adminPassword) });
    console.log(`Bootstrap admin created: ${adminEmail}`);
  }
}
await bootstrap();

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));
app.use(cookieParser());
app.use(mongoSanitize());

const allowedOrigins = (process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, cb) {
    if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
}));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'pharmapos-api' }));
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/admin', adminRoutes);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(__dirname, '../dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(dist, { maxAge: '1h', etag: true }));
  app.get('*', (req, res, next) => req.path.startsWith('/api/') ? next() : res.sendFile(path.join(dist, 'index.html')));
}

app.use(notFound);
app.use(errorHandler);

const port = Number(process.env.PORT || 4000);
app.listen(port, () => console.log(`PharmaPOS server listening on :${port}`));
