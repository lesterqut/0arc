import type { ApiRequest, ApiResponse } from '../_lib/http';
import { saveVaultData } from '../_lib/cloudStore';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    let body = req.body as any;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {}
    }

    const { clientId, tools, notes, media, settings } = body ?? {};
    const result = await saveVaultData(
      {
        tools,
        notes,
        media,
        settings,
      },
      typeof clientId === 'string' ? clientId : undefined
    );

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to save vault data',
    });
  }
}
