import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    'Content-Type'
  );

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({
      error: 'Method Not Allowed'
    });
    return;
  }

  try {
    const response = await fetch(
      'https://api.zeno.fm/mounts/metadata/subscribe/f326190m038uv',
      {
        headers: {
          'User-Agent':
            'CircuitoInterno/1.0'
        }
      }
    );

    if (!response.ok) {
      res.status(502).json({
        error: 'Erro ao obter metadados'
      });
      return;
    }

    const text = await response.text();

    /*
     * Procurar streamTitle dentro da resposta.
     */

    const match = text.match(
      /"streamTitle"\s*:\s*"([^"]+)"/
    );

    if (match?.[1]) {
      res.status(200).json({
        streamTitle: match[1]
      });
      return;
    }

    /*
     * Algumas respostas podem vir
     * diretamente como JSON.
     */

    try {
      const data = JSON.parse(text);

      if (data?.streamTitle) {
        res.status(200).json({
          streamTitle: data.streamTitle
        });
        return;
      }
    } catch {
      // Continua para resposta vazia.
    }

    res.status(200).json({
      streamTitle: null
    });

  } catch (error) {
    console.error(
      'Erro nos metadados:',
      error
    );

    res.status(502).json({
      error:
        'Não foi possível obter os metadados.'
    });
  }
}
