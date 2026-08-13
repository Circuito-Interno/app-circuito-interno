import type { VercelRequest, VercelResponse } from '@vercel/node';
import https from 'https';
import http from 'http';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { source } = req.query;

  const targetUrl =
    source === 'marcoense'
      ? 'http://stream.dominioglobal.pt:8024/stream'
      : 'https://rhoster.pt/listen/circuito_interno/radio.mp3';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'audio/mpeg');

  const client = targetUrl.startsWith('https') ? https : http;

  client.get(targetUrl, (streamRes) => {
    res.writeHead(streamRes.statusCode || 200, {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-cache, no-store',
    });
    streamRes.pipe(res);
  }).on('error', () => {
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erro ao ligar à emissora' });
    }
  });
}