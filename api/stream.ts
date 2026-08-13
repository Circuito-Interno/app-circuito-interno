import type { VercelRequest, VercelResponse } from '@vercel/node';
import http from 'http';
import https from 'https';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const { source } = req.query;

  // URLs diretos dos streams
  const streamUrl =
    source === 'marcoense'
      ? 'https://stream.dominioglobal.pt/8024/stream'
      : 'https://rhoster.pt/listen/circuito_interno/radio.mp3';

  // Configurar cabeçalhos de áudio para o browser
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Connection', 'keep-alive');

  const client = streamUrl.startsWith('https') ? https : http;

  const request = client.get(streamUrl, (streamRes) => {
    // Fazer pipe do áudio diretamente para a resposta da Vercel
    streamRes.pipe(res);
  });

  request.on('error', () => {
    if (!res.headersSent) {
      res.status(500).end();
    }
  });

  // Fechar a ligação original se o utilizador parar o áudio
  req.on('close', () => {
    request.destroy();
  });
}