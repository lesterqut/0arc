import type { ApiRequest, ApiResponse } from '../_lib/http';
import { registerSseClient } from '../_lib/cloudStore';

export default function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  const clientId =
    typeof req.query?.clientId === 'string' && req.query.clientId.trim()
      ? req.query.clientId.trim()
      : `device-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  registerSseClient(clientId, res);
}
