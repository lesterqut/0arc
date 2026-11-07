/**
 * 0arc Backend Server
 * Provides full-stack API capabilities:
 * - Real-time cross-device synchronization via Server-Sent Events (SSE)
 * - Persistent cloud database (Server-side document store + MongoDB Atlas integration)
 * - IMDb and Gemini media lookup integration
 * - Development Vite middleware & Production static serving
 */
import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { lookupMedia, resolveMediaDetails, searchImdb, type MediaKind } from './api/_lib/media';
import {
  initCloudStore,
  getVaultData,
  saveVaultData,
  registerSseClient,
  connectMongo,
} from './api/_lib/cloudStore';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize persistent storage engine on startup
initCloudStore().catch((err) => {
  console.error('[0arc] Failed to initialize cloud storage:', err);
});

// -------------------------------------------------------------
// IMDb & Gemini Media APIs
// -------------------------------------------------------------

app.get('/api/imdb/search', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const type = typeof req.query.type === 'string' ? req.query.type.trim() : undefined;

  if (!query) {
    return res.json({ results: [] });
  }

  return res.json({ results: await searchImdb(query, type) });
});

app.get('/api/imdb/q', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const type = typeof req.query.type === 'string' ? req.query.type.trim() : undefined;

  if (!query) {
    return res.json({ results: [] });
  }

  return res.json({ results: await searchImdb(query, type) });
});

app.post('/api/imdb/details', async (req, res) => {
  const { title, year, type, posterUrl } = req.body ?? {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const requestedType: MediaKind = type === 'series' || type === 'anime' ? type : 'movie';
  const details = await resolveMediaDetails(
    title.trim(),
    year ? Number(year) : undefined,
    requestedType,
    typeof posterUrl === 'string' ? posterUrl : undefined
  );

  return res.json(details);
});

app.post('/api/gemini/media-lookup', async (req, res) => {
  const { title, type } = req.body ?? {};

  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' });
  }

  return res.json(await lookupMedia(title.trim(), typeof type === 'string' ? type : 'movie'));
});

// -------------------------------------------------------------
// Cloud Vault & Real-Time Sync APIs
// -------------------------------------------------------------

/**
 * Fetch all cloud vault data for the user/browser.
 */
app.get('/api/cloud/data', async (_req, res) => {
  try {
    const data = await getVaultData();
    return res.json({ ok: true, data });
  } catch (err) {
    console.error('[API] /api/cloud/data error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to load vault data' });
  }
});

/**
 * Save vault changes to the cloud and broadcast to other open devices.
 */
app.post('/api/cloud/sync', async (req, res) => {
  try {
    const { clientId, tools, notes, media, settings } = req.body ?? {};
    const result = await saveVaultData(
      {
        tools,
        notes,
        media,
        settings,
      },
      typeof clientId === 'string' ? clientId : undefined
    );
    return res.json(result);
  } catch (err) {
    console.error('[API] /api/cloud/sync error:', err);
    return res.status(500).json({ ok: false, error: 'Failed to synchronize vault data' });
  }
});

/**
 * Real-time Server-Sent Events (SSE) connection stream.
 * Automatically broadcasts updates across all open browsers and devices in real-time.
 */
app.get('/api/cloud/sync/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId =
    typeof req.query.clientId === 'string' && req.query.clientId.trim()
      ? req.query.clientId.trim()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  registerSseClient(clientId, res);
});

/**
 * Check MongoDB connection status and settings.
 */
app.get('/api/cloud/mongo-status', async (_req, res) => {
  try {
    const data = await getVaultData();
    let maskedUri = '';
    if (data.mongoUri) {
      try {
        const parsed = new URL(data.mongoUri);
        if (parsed.password) {
          parsed.password = '******';
        }
        maskedUri = parsed.toString();
      } catch {
        maskedUri = 'Configured (Masked)';
      }
    }
    return res.json({
      ok: true,
      isMongoConnected: data.isMongoConnected,
      hasCustomMongo: Boolean(data.mongoUri),
      mongoUriMasked: maskedUri,
      storageType: data.isMongoConnected ? 'MongoDB Atlas' : 'Persistent Cloud Store',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to inspect database status' });
  }
});

/**
 * Connect to external MongoDB / MongoDB Atlas.
 */
app.post('/api/cloud/mongo-config', async (req, res) => {
  const { uri } = req.body ?? {};
  if (typeof uri !== 'string') {
    return res.status(400).json({ ok: false, message: 'MongoDB connection URI is required.' });
  }

  const result = await connectMongo(uri.trim());
  return res.status(result.ok ? 200 : 400).json(result);
});

/**
 * Legacy Supabase bridge fallback for backwards compatibility.
 */
app.all('/api/supabase/*', async (req, res) => {
  try {
    if (req.path === '/api/supabase/data') {
      if (req.body && Object.keys(req.body).length > 0) {
        const saveRes = await saveVaultData(req.body);
        return res.json(saveRes);
      }
      const data = await getVaultData();
      return res.json({ ok: true, data });
    }
    return res.json({ ok: true });
  } catch {
    return res.json({ ok: true });
  }
});

// -------------------------------------------------------------
// Vite Middleware / Static Server
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`0arc cloud server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
