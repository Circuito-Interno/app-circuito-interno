import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).send('Method Not Allowed');
  }

  const upstreamUrl =
    'https://azuracast.rhoster.pt/listen/circuito_interno/radio.mp3';

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Icy-MetaData': '1',
      },
      cache: 'no-store',
    });

    if (!upstream.ok || !upstream.body) {
      return res
        .status(upstream.status || 502)
        .send('Não foi possível ligar ao stream.');
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Cache-Control',
      'no-cache, no-store, must-revalidate'
    );
    res.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') || 'audio/mpeg'
    );

    const icyHeaders = [
      'icy-name',
      'icy-genre',
      'icy-br',
      'icy-sr',
      'icy-url',
      'icy-pub',
    ];

    for (const header of icyHeaders) {
      const value = upstream.headers.get(header);

      if (value) {
        res.setHeader(header, value);
      }
    }

    const reader = upstream.body.getReader();

    req.on('close', () => {
      reader.cancel().catch(() => {});
    });

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        if (value) {
          res.write(Buffer.from(value));
        }
      }
    } finally {
      reader.releaseLock();
    }

    res.end();
  } catch (error) {
    console.error('Erro no proxy do stream:', error);

    if (!res.headersSent) {
      return res
        .status(502)
        .send('Erro ao ligar ao stream.');
    }

    res.end();
  }
}
