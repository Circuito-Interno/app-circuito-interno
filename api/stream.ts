export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const { searchParams } = new URL(req.url);
  const source = searchParams.get('source');

  const targetUrl =
    source === 'marcoense'
      ? 'http://stream.dominioglobal.pt:8024/stream'
      : 'https://rhoster.pt/listen/circuito_interno/radio.mp3';

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'audio/mpeg, audio/*',
      },
    });

    if (!response.ok || !response.body) {
      return new Response('Erro ao aceder à rádio', { status: 500 });
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    return new Response('Erro na ligação', { status: 500 });
  }
}