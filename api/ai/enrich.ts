import { generateText, Output } from 'ai';
import { z } from 'zod';

const enrichmentSchema = z.object({
  title: z.string().describe('A concise canonical name.'),
  description: z.string().describe('A useful, factual description in 1-2 sentences.'),
  url: z.string().nullable().describe('The canonical official URL when known, otherwise null.'),
  category: z.enum(['AI Tools', 'Development', 'Design', 'Productivity', 'Websites', 'Software', 'Learning', 'Other']),
  tags: z.array(z.string()).max(8),
  rating: z.number().min(0).max(10).nullable().describe('Known rating out of 10, or null when it cannot be verified.'),
  ratingSource: z.string().nullable().describe('The source name for the rating, or null.'),
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
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12000);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const input = req.body as EnrichmentRequest;
  let pageContext = '';

  try {
    if (!input || !['tool', 'media'].includes(input.kind) || !input.title?.trim()) {
      res.status(400).json({ ok: false, error: 'A name and enrichment type are required.' });
      return;
    }
    if (input.kind === 'tool' && input.url) {
      try {
        const response = await fetch(input.url, {
          headers: { 'User-Agent': '0arc enrichment bot' },
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) pageContext = cleanPageText(await response.text());
      } catch {
        pageContext = '';
      }
    }

    const { output } = await generateText({
      model: 'google/gemini-2.5-flash-lite',
      output: Output.object({ schema: enrichmentSchema }),
      system: `You enrich an archive entry. Be conservative: never invent a URL, rating, company fact, or feature. Preserve user-provided values when they are present. For movie and series ratings, use a known IMDb rating only when you are confident; otherwise return null. For tools, use the supplied webpage text as the primary source. Return plain text without markdown.`,
      prompt: JSON.stringify({
        kind: input.kind,
        userFields: input,
        webpageText: pageContext,
      }),
    });

    res.status(200).json({ ok: true, data: output });
  } catch (error) {
    console.error('[v0] AI enrichment failed', error);

    // Keep the Find action useful when a local preview has no Gateway credentials.
    // Never invent ratings or facts; preserve verified user input and leave unknowns blank.
    const category = enrichmentSchema.shape.category.options.includes(input.category as never)
      ? (input.category as z.infer<typeof enrichmentSchema>['category'])
      : 'Other';
    const fallbackDescription = input.description?.trim() ||
      (pageContext ? pageContext.slice(0, 240).trim() : '');

    res.status(200).json({
      ok: true,
      data: {
        title: (input.title ?? '').trim(),
        description: fallbackDescription,
        url: input.url?.trim() || null,
        category,
        tags: input.tags ?? [],
        rating: null,
        ratingSource: null,
      },
      fallback: true,
    });
  }
}
