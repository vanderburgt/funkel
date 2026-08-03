import './env.js';
import express from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { sessionMiddleware } from './session.js';
import { api } from './routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(compression());
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// No third parties anywhere: everything the app needs is same-origin.
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  next();
});

app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use('/api', sessionMiddleware, api);

// Static frontend (production build)
const webDist = path.resolve(__dirname, '../../web/dist');
if (fs.existsSync(webDist)) {
  app.use(express.static(webDist, {
    maxAge: '1y',
    immutable: true,
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));
  app.get(/^\/(?!api\/).*/, (req, res) => res.sendFile(path.join(webDist, 'index.html')));
}

app.listen(PORT, () => console.log(`[funkel] listening on :${PORT}`));
