import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { MongoClient, Db } from 'mongodb';

dotenv.config({ path: path.resolve(process.cwd(), '.env.development.local') });
dotenv.config();

export interface CloudVaultData {
  tools: any[];
  notes: any[];
  media: any[];
  settings: {
    confirmBeforeDelete: boolean;
    defaultArchiveView: string;
    [key: string]: any;
  };
  version: number;
  updatedAt: string;
  mongoUri?: string;
}

const isVercel = Boolean(process.env.VERCEL);
const DATA_DIR = isVercel ? '/tmp/0arc-data' : path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'vault.json');

const INITIAL_DATA: CloudVaultData = {
  tools: [],
  notes: [],
  media: [],
  settings: {
    confirmBeforeDelete: true,
    defaultArchiveView: 'overview',
  },
  version: 1,
  updatedAt: new Date().toISOString(),
};

// Memory cache for immediate 0ms retrieval
let cachedVault: CloudVaultData = { ...INITIAL_DATA };
let isInitialized = false;

// Active SSE client connections for real-time syncing
interface SseClient {
  id: string;
  res: any;
  connectedAt: Date;
}
const sseClients = new Map<string, SseClient>();

// MongoDB connection reference
let mongoClient: MongoClient | null = null;
let mongoDb: Db | null = null;
let activeMongoUri: string = process.env.MONGODB_URI || '';

/**
 * Ensure storage directory and load persisted vault data from disk or MongoDB.
 */
export async function initCloudStore(): Promise<CloudVaultData> {
  if (isInitialized) return cachedVault;

  // Read the injected Atlas URI at request time as well as module load time.
  // This supports Vercel serverless functions and local dev env hot reloads.
  activeMongoUri = process.env.MONGODB_URI || activeMongoUri;

  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      cachedVault = {
        tools: Array.isArray(parsed.tools) ? parsed.tools : [],
        notes: Array.isArray(parsed.notes) ? parsed.notes : [],
        media: Array.isArray(parsed.media) ? parsed.media : [],
        settings: parsed.settings || INITIAL_DATA.settings,
        version: typeof parsed.version === 'number' ? parsed.version : 1,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
      };
    } else {
      // First run: save initial empty vault
      saveToDisk(cachedVault);
    }
  } catch (err) {
    console.error('[CloudStore] Error initializing from disk:', err);
  }

  // Try connecting to MongoDB if URI is set
  if (activeMongoUri) {
    await connectMongo(activeMongoUri).catch((err) => {
      console.warn('[CloudStore] Initial MongoDB connect failed (will use persistent cloud file):', err?.message);
    });
  }

  isInitialized = true;
  return cachedVault;
}

function saveToDisk(data: CloudVaultData): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const tempFile = `${DATA_FILE}.tmp.${Date.now()}`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, DATA_FILE);
  } catch (err) {
    console.error('[CloudStore] Error saving vault to disk:', err);
  }
}

/**
 * Connect to MongoDB instance or MongoDB Atlas cluster.
 */
export async function connectMongo(uri: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const cleanUri = uri.trim();
    if (!cleanUri) {
      if (mongoClient) {
        await mongoClient.close();
        mongoClient = null;
        mongoDb = null;
      }
      activeMongoUri = '';
      saveToDisk(cachedVault);
      return { ok: true, message: 'Disconnected from external MongoDB.' };
    }

    const client = new MongoClient(cleanUri, {
      connectTimeoutMS: 8000,
      serverSelectionTimeoutMS: 8000,
    });

    await client.connect();
    const db = client.db('0arc_vault');
    await db.command({ ping: 1 });

    mongoClient = client;
    mongoDb = db;
    activeMongoUri = cleanUri;

    // Check if MongoDB already has saved data
    const vaultCollection = db.collection('vault_snapshot');
    const existingDoc = await vaultCollection.findOne({ _id: 'main' as any });
    if (existingDoc && (existingDoc.tools || existingDoc.notes || existingDoc.media)) {
      cachedVault.tools = Array.isArray(existingDoc.tools) ? existingDoc.tools : [];
      cachedVault.notes = Array.isArray(existingDoc.notes) ? existingDoc.notes : [];
      cachedVault.media = Array.isArray(existingDoc.media) ? existingDoc.media : [];
      if (existingDoc.settings) cachedVault.settings = existingDoc.settings;
      if (typeof existingDoc.version === 'number') cachedVault.version = existingDoc.version;
      if (existingDoc.updatedAt) cachedVault.updatedAt = existingDoc.updatedAt;
    } else {
      // Sync local vault into MongoDB Atlas
      await syncToMongo(cachedVault);
    }
    saveToDisk(cachedVault);

    return { ok: true, message: 'Connected to MongoDB successfully.' };
  } catch (err) {
    console.error('[CloudStore] MongoDB connection error:', err);
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Failed to connect to MongoDB.',
    };
  }
}

/**
 * Sync active vault state into MongoDB collections.
 */
async function syncToMongo(data: CloudVaultData): Promise<void> {
  if (!mongoDb) return;
  try {
    const vaultCollection = mongoDb.collection('vault_snapshot');
    await vaultCollection.updateOne(
      { _id: 'main' as any },
      {
        $set: {
          tools: data.tools,
          notes: data.notes,
          media: data.media,
          settings: data.settings,
          version: data.version,
          updatedAt: data.updatedAt,
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.warn('[CloudStore] Background sync to MongoDB failed:', err);
  }
}

/**
 * Get current vault snapshot.
 */
export async function getVaultData(): Promise<CloudVaultData & { isMongoConnected: boolean }> {
  if (!isInitialized) {
    await initCloudStore();
  }

  // In serverless environments, query the latest document directly from MongoDB
  if (mongoDb) {
    try {
      const doc = await mongoDb.collection('vault_snapshot').findOne({ _id: 'main' as any });
      if (doc) {
        if (Array.isArray(doc.tools)) cachedVault.tools = doc.tools;
        if (Array.isArray(doc.notes)) cachedVault.notes = doc.notes;
        if (Array.isArray(doc.media)) cachedVault.media = doc.media;
        if (doc.settings) cachedVault.settings = doc.settings;
        if (typeof doc.version === 'number') cachedVault.version = doc.version;
        if (doc.updatedAt) cachedVault.updatedAt = doc.updatedAt;
      }
    } catch (err) {
      console.warn('[CloudStore] Error reading from MongoDB in getVaultData:', err);
    }
  }

  const { mongoUri: _mongoUri, ...safeVault } = cachedVault;
  return {
    ...safeVault,
    isMongoConnected: Boolean(mongoDb),
  };
}

/**
 * Save new vault data, persist to cloud disk + MongoDB, and broadcast to all connected devices.
 */
export async function saveVaultData(
  updates: Partial<Pick<CloudVaultData, 'tools' | 'notes' | 'media' | 'settings'>>,
  senderClientId?: string
): Promise<{ ok: boolean; version: number; updatedAt: string }> {
  if (!isInitialized) {
    await initCloudStore();
  }

  const now = new Date().toISOString();
  const nextVersion = (cachedVault.version || 0) + 1;

  if (updates.tools !== undefined) cachedVault.tools = updates.tools;
  if (updates.notes !== undefined) cachedVault.notes = updates.notes;
  if (updates.media !== undefined) cachedVault.media = updates.media;
  if (updates.settings !== undefined) {
    cachedVault.settings = { ...cachedVault.settings, ...updates.settings };
  }
  cachedVault.version = nextVersion;
  cachedVault.updatedAt = now;

  // Persist locally
  saveToDisk(cachedVault);

  // Persist to MongoDB if active
  if (mongoDb) {
    syncToMongo(cachedVault).catch(() => {});
  }

  // Broadcast to all other devices in real-time
  broadcastVaultUpdate(senderClientId, {
    version: cachedVault.version,
    updatedAt: cachedVault.updatedAt,
    tools: cachedVault.tools,
    notes: cachedVault.notes,
    media: cachedVault.media,
    settings: cachedVault.settings,
  });

  return { ok: true, version: nextVersion, updatedAt: now };
}

/**
 * Register SSE client for real-time synchronization.
 */
export function registerSseClient(id: string, res: any): void {
  sseClients.set(id, {
    id,
    res,
    connectedAt: new Date(),
  });

  // Send initial connected event
  res.write(`event: connected\ndata: ${JSON.stringify({ clientId: id, version: cachedVault.version })}\n\n`);

  res.on('close', () => {
    sseClients.delete(id);
  });
}

/**
 * Broadcast vault updates to all connected devices except the sender.
 */
export function broadcastVaultUpdate(senderClientId: string | undefined, payload: any): void {
  const message = `event: vault_update\ndata: ${JSON.stringify({ ...payload, senderClientId })}\n\n`;

  for (const [id, client] of sseClients.entries()) {
    if (senderClientId && id === senderClientId) {
      continue; // Don't send echo to the client that initiated the edit
    }
    try {
      client.res.write(message);
    } catch (err) {
      sseClients.delete(id);
    }
  }
}

// Keep SSE connections active with a light heartbeat every 25 seconds
setInterval(() => {
  for (const [id, client] of sseClients.entries()) {
    try {
      client.res.write(': heartbeat\n\n');
    } catch {
      sseClients.delete(id);
    }
  }
}, 25000);
