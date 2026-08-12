import type { VercelRequest, VercelResponse } from '@vercel/node';

const STREAMS = {
  circuito:
    'https://azuracast.rhoster.pt/listen/circuito_interno/radio.mp3',

  marcoense:
    'http://137.74.160.250:8000/;stream/1',
} as const;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Range, Content-Type'
  );

  res.setHeader(
    'Access-Control-Expose-Headers',
    'Content-Type, Icy-MetaInt, Icy-Name, Icy-Genre'
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      error: 'Method Not Allowed',
    });
    return;
  }

  const source =
    typeof req.query.source === 'string'
      ? req.query.source
      : 'circuito';

  if (
    source !== 'circuito' &&
    source !== 'marcoense'
  ) {
    res.status(400).json({
      error: 'Fonte de áudio inválida.',
    });
    return;
  }

  const targetUrl = STREAMS[source];

  const headers: Record<string, string> = {
    'User-Agent':
      'CircuitoInterno/1.0 Radio Player',

    Accept:
      'audio/mpeg,audio/*;q=0.9,*/*;q=0.8',

    'Icy-MetaData': '1',

    Connection: 'keep-alive',
  };

  const rangeHeader = req.headers.range;

  if (typeof rangeHeader === 'string') {
    headers.Range = rangeHeader;
  }

  let response: Response;

  try {
    response = await fetch(targetUrl, {
      method: 'GET',
      headers,
      redirect: 'follow',
    });
  } catch (error) {
    console.error(
      'Erro ao ligar ao stream:',
      error
    );

    res.status(502).json({
      error:
        'Não foi possível ligar ao servidor da rádio.',
    });

    return;
  }

  if (!response.ok && response.status !== 206) {
    console.error(
      'Stream respondeu:',
      response.status,
      response.statusText
    );

    res.status(502).json({
      error:
        `Servidor da rádio respondeu ${response.status}.`,
    });

    return;
  }

  const contentType =
    response.headers.get('content-type') ||
    'audio/mpeg';

  res.status(
    response.status === 206 ? 206 : 200
  );

  res.setHeader(
    'Content-Type',
    contentType.includes('audio')
      ? contentType
      : 'audio/mpeg'
  );

  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate, proxy-revalidate'
  );

  res.setHeader(
    'Pragma',
    'no-cache'
  );

  res.setHeader(
    'Expires',
    '0'
  );

  const icyMetaInt =
    response.headers.get('icy-metaint');

  const icyName =
    response.headers.get('icy-name');

  const icyGenre =
    response.headers.get('icy-genre');

  if (icyMetaInt) {
    res.setHeader(
      'Icy-MetaInt',
      icyMetaInt
    );
  }

  if (icyName) {
    res.setHeader(
      'Icy-Name',
      icyName
    );
  }

  if (icyGenre) {
    res.setHeader(
      'Icy-Genre',
      icyGenre
    );
  }

  const contentLength =
    response.headers.get('content-length');

  if (contentLength) {
    res.setHeader(
      'Content-Length',
      contentLength
    );
  }

  const contentRange =
    response.headers.get('content-range');

  if (contentRange) {
    res.setHeader(
      'Content-Range',
      contentRange
    );
  }

  res.setHeader(
    'Accept-Ranges',
    'bytes'
  );

  if (!response.body) {
    res.status(502).json({
      error:
        'O servidor da rádio não devolveu um stream de áudio.',
    });

    return;
  }

  try {
    const reader =
      response.body.getReader();

    while (true) {
      const { done, value } =
        await reader.read();

      if (done) {
        break;
      }

      if (value) {
        res.write(
          Buffer.from(value)
        );
      }
    }

    res.end();
  } catch (error) {
    console.error(
      'Erro durante transmissão do áudio:',
      error
    );

    try {
      res.end();
    } catch {
      // ligação já encerrada
    }
  }
}