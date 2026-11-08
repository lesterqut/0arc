import { generateText, Output } from 'ai';
import { z } from 'zod';

const enrichmentSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string().nullable(),
  category: z.enum(['AI Tools', 'Development', 'Design', 'Productivity', 'Websites', 'Software', 'Learning', 'Other']),
  tags: z.array(z.string()).max(8),
  rating: z.number().min(0).max(10).nullable(),
  ratingSource: z.string().nullable(),
});

type EnrichmentRequest = {
  kind: 'tool' | 'media';
  title?: string;
  description?: string;
  url?: string;
  category?: string;
  tags?: string[];
  mediaType?: string;
};

function cleanPageText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 12000);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });
  const input = req.body as EnrichmentRequest;
  let pageContext = '';
  try {
    if (!input || !['tool', 'media'].includes(input.kind) || !input.title?.trim()) return res.status(400).json({ ok: false, error: 'A name and enrichment type are required.' });
    if (input.kind === 'tool' && input.url) {
      try {
        const response = await fetch(input.url, { headers: { 'User-Agent': '0arc enrichment bot' }, signal: AbortSignal.timeout(5000) });
        if (response.ok) pageContext = cleanPageText(await response.text());
      } catch { pageContext = ''; }
    }
    const { output } = await generateText({
      model: 'google/gemini-2.5-flash-lite',
      output: Output.object({ schema: enrichmentSchema }),
      system: 'Enrich an archive entry conservatively. Never invent URLs, ratings, company facts, or features. Preserve user-provided values. For movies and series, use a known IMDb rating only when confident; otherwise return null. For tools, use supplied webpage text as the primary source.',
      prompt: JSON.stringify({ kind: input.kind, userFields: input, webpageText: pageContext }),
    });
    return res.status(200).json({ ok: true, data: output });
  } catch (error) {
    console.error('[v0] AI enrichment failed', error);
    const category = ['AI Tools', 'Development', 'Design', 'Productivity', 'Websites', 'Software', 'Learning', 'Other'].includes(input?.category || '') ? input.category : 'Other';
    return res.status(200).json({ ok: true, fallback: true, data: { title: (input?.title ?? '').trim(), description: input?.description?.trim() || pageContext.slice(0, 240), url: input?.url?.trim() || null, category, tags: input?.tags ?? [], rating: null, ratingSource: null } });
  }
}
