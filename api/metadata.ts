import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

  try {
    const response = await fetch('https://rhoster.pt/api/nowplaying/1', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) {
      return res.status(200).json({ title: 'Rádio Circuito Interno' });
    }

    const data = await response.json();
    if (data?.now_playing?.song) {
      const song = data.now_playing.song;
      const fullTitle = `${song.title} - ${song.artist}`;
      return res.status(200).json({ title: fullTitle });
    }

    return res.status(200).json({ title: 'Rádio Circuito Interno' });
  } catch {
    return res.status(200).json({ title: 'Rádio Circuito Interno' });
  }
}