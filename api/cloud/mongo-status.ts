import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { getVaultData } from '../_lib/cloudStore.js';

export default async function handler(_req: ApiRequest, res: ApiResponse) {
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
    return res.status(200).json({
      ok: true,
      isMongoConnected: data.isMongoConnected,
      hasCustomMongo: Boolean(data.mongoUri),
      mongoUriMasked: maskedUri,
      storageType: data.isMongoConnected ? 'MongoDB Atlas' : 'Persistent Cloud Store',
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: 'Failed to inspect database status' });
  }
}
