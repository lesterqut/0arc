import type { ApiRequest, ApiResponse } from '../_lib/http.js';
import { getVaultData } from '../_lib/cloudStore.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  try {
    const data = await getVaultData();
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ ok: true, data });
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to fetch vault data',
    });
  }
}
