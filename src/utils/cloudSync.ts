/**
 * Cloud Synchronization & Storage Utilities
 * Handles communication with the backend cloud store and real-time SSE updates.
 */

export interface CloudVaultPayload {
  tools: any[];
  notes: any[];
  media: any[];
  settings: any;
  version?: number;
  updatedAt?: string;
  isMongoConnected?: boolean;
}

export interface MongoStatus {
  ok: boolean;
  isMongoConnected: boolean;
  hasCustomMongo: boolean;
  mongoUriMasked?: string;
  storageType: string;
}

export interface StorageUsageEntry {
  label: string;
  bytes: number;
  count: number;
}

export interface StorageUsage {
  ok: boolean;
  usedBytes: number;
  limitBytes: number;
  remainingBytes: number;
  percentUsed: number;
  planName: string;
  source: 'mongodb' | 'local';
  measuredBy: 'atlas-dbstats' | 'vault-document';
  isMongoConnected: boolean;
  breakdown: StorageUsageEntry[];
  updatedAt?: string;
}

/**
 * Measure the vault against the MongoDB Atlas free plan allowance.
 */
export async function fetchStorageUsage(): Promise<StorageUsage | null> {
  try {
    const res = await fetch('/api/cloud/storage-usage');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as StorageUsage;
    if (json.ok === false) return null;
    return json;
  } catch {
    return null;
  }
}

/**
 * Fetch the latest vault snapshot from the cloud server.
 */
export async function fetchCloudVault(): Promise<{
  ok: boolean;
  data?: CloudVaultPayload;
  error?: string;
}> {
  try {
    const res = await fetch('/api/cloud/data');
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = (await res.json()) as { ok?: boolean; data?: CloudVaultPayload; error?: string };
    if (json.ok === false || !json.data) {
      return { ok: false, error: json.error || 'Cloud vault is unavailable' };
    }
    return { ok: true, data: json.data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to fetch cloud vault',
    };
  }
}

/**
 * Push updated vault data to the cloud in the background.
 */
export async function pushCloudVault(
  clientId: string,
  payload: {
    tools: any[];
    notes: any[];
    media: any[];
    settings: any;
  }
): Promise<{ ok: boolean; version?: number; error?: string }> {
  try {
    const res = await fetch('/api/cloud/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clientId,
        ...payload,
      }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const json = (await res.json()) as { ok?: boolean; version?: number; error?: string };
    if (json.ok === false) {
      return { ok: false, error: json.error || 'Cloud vault could not be saved' };
    }
    return { ok: true, version: json.version };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to push vault data',
    };
  }
}

/**
 * Fetch MongoDB Atlas integration status.
 */
export async function fetchMongoStatus(): Promise<MongoStatus> {
  try {
    const res = await fetch('/api/cloud/mongo-status');
    if (!res.ok) throw new Error('Status check failed');
    return await res.json();
  } catch {
    return {
      ok: false,
      isMongoConnected: false,
      hasCustomMongo: false,
      storageType: 'Persistent Cloud Store',
    };
  }
}

/**
 * Connect to external MongoDB / MongoDB Atlas.
 */
export async function setMongoConnection(uri: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch('/api/cloud/mongo-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uri }),
    });
    return await res.json();
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Network error connecting to MongoDB',
    };
  }
}

/**
 * Initialize real-time multi-device synchronization via Server-Sent Events (SSE).
 */
export function setupRealtimeSync(
  clientId: string,
  onRemoteUpdate: (data: CloudVaultPayload) => void,
  onStatusChange?: (status: 'connected' | 'disconnected' | 'reconnecting') => void
): () => void {
  let eventSource: EventSource | null = null;
  let reconnectTimer: any = null;
  let isClosed = false;
  let retryCount = 0;

  function connect() {
    if (isClosed) return;

    try {
      eventSource = new EventSource(`/api/cloud/events?clientId=${encodeURIComponent(clientId)}`);

      eventSource.addEventListener('connected', () => {
        retryCount = 0;
        onStatusChange?.('connected');
      });

      eventSource.addEventListener('vault_update', (e: MessageEvent) => {
        try {
          const payload = JSON.parse(e.data);
          // If the update came from another device, apply it seamlessly
          if (payload && payload.senderClientId !== clientId) {
            onRemoteUpdate(payload);
          }
        } catch (parseErr) {
          console.warn('[RealtimeSync] Could not parse vault_update event:', parseErr);
        }
      });

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        onStatusChange?.('reconnecting');
        if (!isClosed) {
          const delay = Math.min(1000 * Math.pow(1.5, retryCount), 15000);
          retryCount++;
          reconnectTimer = setTimeout(connect, delay);
        }
      };
    } catch (err) {
      console.warn('[RealtimeSync] Connection failed, retrying...', err);
      if (!isClosed) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    }
  }

  // Focus and visibility listeners: whenever user returns to the tab on phone or desktop, re-sync immediately
  const handleVisibilityOrFocus = async () => {
    if (document.visibilityState === 'visible') {
      try {
        const res = await fetchCloudVault();
        if (res.ok && res.data) {
          onRemoteUpdate(res.data);
        }
      } catch {}
    }
  };

  window.addEventListener('visibilitychange', handleVisibilityOrFocus);
  window.addEventListener('focus', handleVisibilityOrFocus);

  // Background fallback poll every 20s for serverless environments (like Vercel)
  const pollInterval = setInterval(async () => {
    if (document.visibilityState === 'visible') {
      try {
        const res = await fetchCloudVault();
        if (res.ok && res.data) {
          onRemoteUpdate(res.data);
        }
      } catch {}
    }
  }, 20000);

  return () => {
    isClosed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (pollInterval) clearInterval(pollInterval);
    window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    window.removeEventListener('focus', handleVisibilityOrFocus);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    onStatusChange?.('disconnected');
  };
}
