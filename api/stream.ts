import type { VercelRequest, VercelResponse } from '@vercel/node';
import http from 'http';
import https from 'https';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { source } = req.query;

  // URLs nativas dos streams
  const targetUrl =
    source === 'marcoense'
      ? 'http://stream.mfradio.pt:8002/stream'
      : 'https://rhoster.pt/listen/circuito_interno/radio.mp3';

  const client = targetUrl.startsWith('https') ? https : http;

  // Cabeçalhos HTTP para transmissão nativa e suporte de background audio no iOS Safari
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Cache-Control', 'no-cache, no-store, transform');
  res.setHeader('Connection', 'keep-alive');

  const request = client.get(targetUrl, (stream) => {
    // Pipe direto sem re-compressão de áudio (Qualidade HD 128/192kbps)
    stream.pipe(res);
  });

  request.on('error', () => {
    if (!res.headersSent) {
      res.status(500).send('Erro na transmissão');
    }
  });

  req.on('close', () => {
    request.destroy();
  });
}