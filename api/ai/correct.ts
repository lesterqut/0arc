import { generateText, Output } from 'ai';
import { z } from 'zod';

const correctionSchema = z.object({
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()).max(12),
});

const commonCorrections: Record<string, string> = {
  accomodate: 'accommodate',
  definately: 'definitely',
  favrite: 'favorite',
  recieve: 'receive',
  seperate: 'separate',
  occured: 'occurred',
  alot: 'a lot',
  teh: 'the',
  thier: 'their',
  graet: 'great',
  grate: 'great',
};

function fallbackCorrect(value: string) {
  return value
    .replace(/\b[A-Za-z]+\b/g, (word) => commonCorrections[word.toLowerCase()] || word)
    .replace(/(^|[.!?]\s+)([a-z])/g, (_, prefix, letter) => `${prefix}${letter.toUpperCase()}`);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  const input = req.body as { title?: string; content?: string; tags?: string[] };
  if (!input || (!input.title?.trim() && !input.content?.trim() && !input.tags?.length)) {
    res.status(400).json({ ok: false, error: 'Text is required.' });
    return;
  }

  try {
    const { output } = await generateText({
      model: 'google/gemini-2.5-flash-lite',
      output: Output.object({ schema: correctionSchema }),
      system: 'Correct spelling, grammar, and accidental lowercase/capitalization errors. Preserve intentional brand names, URLs, acronyms, markdown, punctuation, tone, and meaning. Do not add facts or rewrite stylistically. Return only the corrected fields.',
      prompt: JSON.stringify({
        title: input.title ?? '',
        content: input.content ?? '',
        tags: input.tags ?? [],
      }),
    });

    res.status(200).json({ ok: true, data: output });
  } catch (error) {
    console.error('[v0] Text correction failed', error);
    res.status(200).json({
      ok: true,
      fallback: true,
      data: {
        title: fallbackCorrect(input.title ?? ''),
        content: fallbackCorrect(input.content ?? ''),
        tags: (input.tags ?? []).map((tag) => fallbackCorrect(tag)),
      },
    });
  }
}
