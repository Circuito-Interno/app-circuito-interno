import type { VercelRequest, VercelResponse } from '@vercel/node';

interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  category: string;
}

interface FeedConfig {
  url: string;
  source: string;
  category: string;
}

const FEEDS: FeedConfig[] = [
  {
    url: 'https://www.rtp.pt/noticias/rss/cultura',
    source: 'RTP Cultura',
    category: 'Música',
  },
  {
    url: 'https://artesonora.pt/feed/',
    source: 'Arte Sonora',
    category: 'Música',
  },
  {
    url: 'https://www.musicaemdx.pt/feed/',
    source: 'Música em DX',
    category: 'Música',
  },
  {
    url: 'https://www.rimasebatidas.pt/feed/',
    source: 'Rimas e Batidas',
    category: 'Música',
  },
];

function extractTag(
  block: string,
  tag: string
): string {
  const match = block.match(
    new RegExp(
      `<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`,
      'i'
    )
  );

  if (!match) return '';

  return match[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

async function readFeed(
  feed: FeedConfig
): Promise<NewsItem[]> {
  try {
    const response = await fetch(feed.url, {
      headers: {
        'User-Agent':
          'Circuito-Interno-Radar-Musical/1.0',
      },
    });

    if (!response.ok) {
      console.error(
        `Feed ${feed.source} respondeu ${response.status}`
      );

      return [];
    }

    const xml = await response.text();

    const blocks =
      xml.match(
        /<item\b[\s\S]*?<\/item>/gi
      ) || [];

    return blocks
      .map((block, index) => {
        const title =
          extractTag(block, 'title');

        const link =
          extractTag(block, 'link');

        const publishedAt =
          extractTag(block, 'pubDate') ||
          extractTag(block, 'dc:date');

        if (!title || !link) {
          return null;
        }

        return {
          id: `${feed.source}-${index}-${encodeURIComponent(link)}`,
          title,
          link,
          source: feed.source,
          publishedAt:
            publishedAt ||
            new Date().toISOString(),
          category: feed.category,
        };
      })
      .filter(
        (
          item
        ): item is NewsItem =>
          item !== null
      );
  } catch (error) {
    console.error(
      `Erro no feed ${feed.source}:`,
      error
    );

    return [];
  }
}



function isMusicNews(
  item: NewsItem
): boolean {
  /*
   * As publicações especializadas em música são aceites
   * diretamente.
   */
  if (
    item.source === 'Arte Sonora' ||
    item.source === 'Música em DX' ||
    item.source === 'Rimas e Batidas'
  ) {
    return true;
  }

  /*
   * A RTP Cultura é uma fonte generalista.
   * Aqui só aceitamos notícias com indicadores musicais
   * fortes. Evitamos termos demasiado genéricos como
   * "festival", "artista" ou "palco", que também aparecem
   * em notícias de cinema, teatro e outras artes.
   */
  const text = item.title.toLowerCase();

  const strongMusicTerms = [
    'música',
    'musica',
    'músico',
    'musico',
    'cantor',
    'cantora',
    'banda',
    'álbum',
    'album',
    'single',
    'concerto',
    'concertos',
    'digressão',
    'digressao',
    'turné',
    'turne',
    'dj ',
    'rapper',
    'rap ',
    'hip-hop',
    'hip hop',
    'rock',
    'indie',
    'pop',
    'jazz',
    'punk',
    'metal',
    'fado',
    'eletrónica',
    'eletronica',
    'electrónica',
    'electronica',
    'festival de música',
    'festival musical',
    'banda sonora',
    'novo disco',
    'novo álbum',
    'novo album',
    'novo single',
    'lança single',
    'lanca single',
    'lança álbum',
    'lanca album',
    'estreia single',
    'estreia álbum',
    'estreia album',
    'atua em',
    'atuará',
    'atuara',
    'atua no',
    'atuou',
    'concertação musical',
  ];

  return strongMusicTerms.some(
    (term) => text.includes(term)
  );
}

async function translateToPortuguese(
  text: string
): Promise<string> {
  try {
    // Protege moedas para impedir que o tradutor converta
    // euros para reais, dólares, etc.
    const currencyTokens: string[] = [];

    const protectedText = text.replace(
      /\b(euros?|dólares?|dollars?|reais?|pounds?|libras?)\b|€|R\$|US\$/gi,
      (match) => {
        const index = currencyTokens.length;
        currencyTokens.push(match);

        return `__CURRENCY_${index}__`;
      }
    );

    const url =
      'https://translate.googleapis.com/translate_a/single' +
      `?client=gtx&sl=auto&tl=pt-PT&dt=t&q=${encodeURIComponent(
        protectedText
      )}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Circuito-Interno-Radar-Musical/1.0',
      },
    });

    if (!response.ok) {
      console.error(
        `Tradução respondeu ${response.status}`
      );

      return text;
    }

    const data = await response.json();

    if (
      !Array.isArray(data) ||
      !Array.isArray(data[0])
    ) {
      return text;
    }

    let translated = data[0]
      .map(
        (part: unknown) =>
          Array.isArray(part) &&
          typeof part[0] === 'string'
            ? part[0]
            : ''
      )
      .filter(Boolean)
      .join('')
      .trim();

    if (!translated) {
      return text;
    }

    // Restaura as moedas exatamente como estavam no original.
    currencyTokens.forEach((currency, index) => {
      translated = translated.replace(
        new RegExp(`__CURRENCY_${index}__`, 'g'),
        currency
      );
    });

    // Correções pontuais para português europeu.
    translated = translated
      .replace(/\bbilheterias\b/gi, 'bilheteiras')
      .replace(/\bbilheteria\b/gi, 'bilheteira')
      .replace(/\bse apresentaram\b/gi, 'atuaram')
      .replace(/\bano que vem\b/gi, 'próximo ano')
      .replace(/\blançará\b/gi, 'vai lançar')
      .replace(
        /\bganhou o Leopardo de Ouro\b/gi,
        'venceu o Leopardo de Ouro'
      );

    return translated.trim();
  } catch (error) {
    console.error(
      'Erro na tradução:',
      error
    );

    return text;
  }
}
async function translateNewsItems(
  items: NewsItem[]
): Promise<NewsItem[]> {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      title:
        await translateToPortuguese(
          item.title
        ),
    }))
  );
}

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
    'Cache-Control',
    's-maxage=300, stale-while-revalidate=600'
  );

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const results =
    await Promise.all(
      FEEDS.map(readFeed)
    );

  const allItems =
    results.flat();

  const uniqueItems =
    Array.from(
      new Map(
        allItems
          .filter(isMusicNews)
          .map(
            (item) => [
              item.link,
              {
                ...item,
                category: 'Música',
              },
            ]
          )
      ).values()
    );

  const sortedItems =
    uniqueItems
      .sort(
        (a, b) =>
          new Date(
            b.publishedAt
          ).getTime() -
          new Date(
            a.publishedAt
          ).getTime()
      )
      .slice(0, 20);

  const items =
    await translateNewsItems(
      sortedItems
    );

  return res.status(200).json({
    ok: true,
    source: 'Circuito Interno',
    updatedAt:
      new Date().toISOString(),
    count: items.length,
    items,
  });
}
