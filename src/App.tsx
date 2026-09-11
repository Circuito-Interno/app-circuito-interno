import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Calendar,
  Car,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  MessageCircle,
} from 'lucide-react';

/* =========================================================
   TIPOS
   ========================================================= */

type AudioSource =
  | 'circuito'
  | 'marcoense';

type PlayerMode =
  | 'radio';

interface NowPlayingSong {
  id: string;
  art: string;
  artist: string;
  title: string;
  album: string;
  genre: string;
}

interface NowPlayingData {
  now_playing?: {
    song?: NowPlayingSong;
    elapsed?: number;
    remaining?: number;
  };
  playing_next?: {
    song?: NowPlayingSong;
  };
  is_online?: boolean;
}

interface ScheduleItem {
  id: string;
  title: string;
  day: string;
  time: string;
  description: string;
}

interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  category: 'Portugal' | 'Mundo';
}

function cleanNewsTitle(title: string): string {
  return title
    .replace(/([a-záéíóúàâêôãõç])([A-ZÁÉÍÓÚÀÂÊÔÃÕÇ])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
}

/* =========================================================
   STREAMS & ASSETS
   ========================================================= */

const STREAMS: Record<AudioSource, string> = {
  circuito:
    'https://azuracast.rhoster.pt/listen/circuito_interno/radio.mp3',

  marcoense:
    'https://streaming.shoutcast.com/marcoense-fm',
};

const NOW_PLAYING_URL =
  'https://azuracast.rhoster.pt/api/nowplaying/circuito_interno';

// Imagem SVG nativa oficial da Rádio Marcoense 93.3 FM (Offline & CORS Free)
const MARCOENSE_LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'><rect width='512' height='512' fill='%23080808'/><circle cx='256' cy='256' r='200' fill='%230066CC' stroke='%23ffffff' stroke-width='12'/><circle cx='256' cy='256' r='140' fill='%23101828'/><rect x='216' y='140' width='80' height='120' rx='40' fill='%23E1E1E6'/><text x='256' y='210' font-family='sans-serif' font-weight='bold' font-size='32' fill='%230066CC' text-anchor='middle'>93.3</text></svg>`;

/* =========================================================
   PROGRAMAÇÃO
   ========================================================= */

const SCHEDULE: ScheduleItem[] = [
  {
    id: '1',
    title: 'O Homem do Leme by Circuito Interno',
    day: 'Terça a Quinta',
    time: '22h00 às 24h00',
    description:
      'As melhores baladas e músicas românticas para embalar a sua noite.',
  },
  {
    id: '2',
    title: 'Lado B by Circuito Interno',
    day: 'Sexta',
    time: '22h00 às 24h00',
    description:
      'Uma seleção com o melhor do Rock clássico, Indie e música alternativa.',
  },
  {
    id: '3',
    title: 'Marcas do Tempo by Circuito Interno',
    day: 'Sábado',
    time: '13h00 às 15h00',
    description:
      'Os intemporais que marcaram gerações e fizeram história na música.',
  },
];

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playerModeRef = useRef<PlayerMode>('radio');
  const audioSourceRef = useRef<AudioSource>('circuito');
  const volumeRef = useRef(0.8);
  const mutedRef = useRef(false);

  const radioReconnectTimerRef = useRef<number | null>(null);
  const radioReconnectWantedRef = useRef(false);
  const lastTimeRef = useRef<number>(0);

  /* =======================================================
     ESTADOS
     ======================================================= */

  const [expandedBox, setExpandedBox] = useState<AudioSource | null>('circuito');

  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>('circuito');
  const [playerMode, setPlayerMode] = useState<PlayerMode>('radio');

  const [loading, setLoading] = useState(false);
  const [carMode, setCarMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [nowPlaying, setNowPlaying] = useState<NowPlayingSong | null>(null);
  const [songElapsed, setSongElapsed] = useState(0);
  const [songRemaining, setSongRemaining] = useState(0);

  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);

  useEffect(() => { playerModeRef.current = playerMode; }, [playerMode]);
  useEffect(() => { audioSourceRef.current = audioSource; }, [audioSource]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);
  useEffect(() => { mutedRef.current = muted; }, [muted]);

  /* =========================================================
     RECONEXÃO AUTOMÁTICA E PROTEÇÃO CONTRA CORTE DE STREAM
     ========================================================= */
  const forceReconnectStream = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    console.warn('Corte detetado. A restabelecer emissão...');
    setLoading(true);

    audio.pause();
    audio.removeAttribute('src');
    audio.load();

    const currentSrc = audioSourceRef.current;
    const baseUrl = STREAMS[currentSrc].split('?')[0];
    audio.src = `${baseUrl}?nocache=${Date.now()}`;
    audio.preload = 'auto';
    audio.load();

    audio.play()
      .then(() => {
        setPlaying(true);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Falha ao reconectar:', err);
        setLoading(false);
        setPlaying(false);
      });
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let stallTimer: number;

    const handleStreamStall = () => {
      if (radioReconnectWantedRef.current) {
        clearTimeout(stallTimer);
        stallTimer = window.setTimeout(() => {
          if (audio.paused || audio.readyState < 3) {
            forceReconnectStream();
          }
        }, 1500);
      }
    };

    audio.addEventListener('stalled', handleStreamStall);
    audio.addEventListener('error', handleStreamStall);

    return () => {
      audio.removeEventListener('stalled', handleStreamStall);
      audio.removeEventListener('error', handleStreamStall);
      clearTimeout(stallTimer);
    };
  }, [forceReconnectStream]);

  /* =========================================================
     MONITORIZAÇÃO DE BUFFER CONGELADO (HEARTBEAT)
     ========================================================= */
  useEffect(() => {
    const interval = window.setInterval(() => {
      const audio = audioRef.current;
      if (!audio || !playing || !radioReconnectWantedRef.current) return;

      if (audio.currentTime === lastTimeRef.current && !audio.paused) {
        console.warn('Stream congelado em silêncio. A forçar reconexão...');
        forceReconnectStream();
      } else {
        lastTimeRef.current = audio.currentTime;
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [playing, forceReconnectStream]);

  /* =========================================================
     RETOMAR EMISSÃO INSTANTANEAMENTE AO VOLTAR À APP
     ========================================================= */
  useEffect(() => {
    const handleVisibilityChange = () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (document.visibilityState === 'visible' && radioReconnectWantedRef.current) {
        if (audio.paused || audio.readyState < 3) {
          forceReconnectStream();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [forceReconnectStream]);

  /* =========================================================
     RADAR MUSICAL — CARREGAR NOTÍCIAS (A CADA 1 HORA)
     ========================================================= */
  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      try {
        const response = await fetch('/api/news');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();

        if (!cancelled && Array.isArray(data.items)) {
          setNewsItems(data.items);
        }
      } catch (err) {
        console.error('Erro ao carregar Radar Musical:', err);
      }
    };

    loadNews();
    const interval = window.setInterval(loadNews, 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  const cancelRadioReconnect = useCallback(() => {
    radioReconnectWantedRef.current = false;

    if (radioReconnectTimerRef.current !== null) {
      window.clearTimeout(radioReconnectTimerRef.current);
      radioReconnectTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volumeRef.current;
    audio.muted = mutedRef.current;

    const handlePlay = () => { setPlaying(true); setLoading(false); };
    const handlePause = () => { setPlaying(false); setLoading(false); };
    const handleWaiting = () => { setLoading(true); };
    const handlePlaying = () => {
      if (radioReconnectTimerRef.current !== null) {
        window.clearTimeout(radioReconnectTimerRef.current);
        radioReconnectTimerRef.current = null;
      }
      setPlaying(true);
      setLoading(false);
    };
    const handleError = () => { setPlaying(false); setLoading(false); };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  /* =========================================================
     NOW PLAYING — AZURACAST
     ========================================================= */
  useEffect(() => {
    if (playerMode !== 'radio' || audioSource !== 'circuito') {
      setNowPlaying(null);
      setSongElapsed(0);
      setSongRemaining(0);
      return;
    }

    let cancelled = false;

    const fetchNowPlaying = async () => {
      try {
        const response = await fetch(`${NOW_PLAYING_URL}?_=${Date.now()}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = (await response.json()) as NowPlayingData;

        if (cancelled) return;
        setNowPlaying(data.now_playing?.song ?? null);
        setSongElapsed(data.now_playing?.elapsed ?? 0);
        setSongRemaining(data.now_playing?.remaining ?? 0);
      } catch (err) {
        console.error('Erro no AzuraCast:', err);
      }
    };

    void fetchNowPlaying();
    const interval = window.setInterval(() => { void fetchNowPlaying(); }, 10000);
    return () => { cancelled = true; window.clearInterval(interval); };
  }, [playerMode, audioSource]);

  useEffect(() => {
    if (!playing || playerMode !== 'radio' || audioSource !== 'circuito') return;
    const interval = window.setInterval(() => {
      setSongElapsed((v) => v + 1);
      setSongRemaining((v) => (v > 0 ? v - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [playing, playerMode, audioSource]);

  /* =========================================================
     MEDIA SESSION API — LOCK SCREEN PNG & BACKGROUND STABLE
     ========================================================= */
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const isCircuito = audioSource === 'circuito';
    const artistText = isCircuito
      ? (nowPlaying?.artist && nowPlaying?.title ? `${nowPlaying.artist} • ${nowPlaying.title}` : 'Música que cria momentos')
      : '93.3 FM • Emissão Regional';

    const artworkUrl = isCircuito ? '/icons/artwork-solid.png' : '/icons/marcoense-solid.png';

    if (navigator.mediaSession.metadata) {
      navigator.mediaSession.metadata.title = isCircuito ? 'Circuito Interno' : 'Rádio Marcoense';
      navigator.mediaSession.metadata.artist = artistText;
      navigator.mediaSession.metadata.artwork = [
        { src: artworkUrl, sizes: '512x512', type: 'image/png' },
      ];
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: isCircuito ? 'Circuito Interno' : 'Rádio Marcoense',
      artist: artistText,
      album: isCircuito ? 'Rádio Online' : 'Marco de Canaveses',
      artwork: [
        { src: artworkUrl, sizes: '512x512', type: 'image/png' },
      ],
    });

    try {
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioRef.current) void audioRef.current.play();
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioRef.current) audioRef.current.pause();
      });
    } catch (e) {
      // Ignora avisos
    }
  }, [audioSource, nowPlaying?.artist, nowPlaying?.title]);

  /* =========================================================
     CONTROLO DE REPRODUÇÃO
     ========================================================= */
  const playSource = useCallback(
    async (source: AudioSource) => {
      const audio = audioRef.current;
      if (!audio) return;

      setLoading(true);

      try {
        playerModeRef.current = 'radio';
        setPlayerMode('radio');

        const sourceUrl = STREAMS[source];
        const currentSource = audio.getAttribute('src');

        if (audioSourceRef.current === source && currentSource === sourceUrl) {
          if (audio.paused) {
            radioReconnectWantedRef.current = true;
            await audio.play();
            setPlaying(true);
          } else {
            radioReconnectWantedRef.current = false;
            audio.pause();
            setPlaying(false);
          }
          setLoading(false);
          return;
        }

        audio.pause();
        audio.removeAttribute('src');
        audio.load();

        audioSourceRef.current = source;
        setAudioSource(source);
        audio.src = sourceUrl;
        audio.preload = 'auto';
        audio.volume = volumeRef.current;
        audio.muted = mutedRef.current;
        audio.load();

        radioReconnectWantedRef.current = true;

        await audio.play();
        setPlaying(true);
        setLoading(false);
      } catch (err) {
        console.error('Erro ao iniciar o stream:', err);
        setPlaying(false);
        setLoading(false);
        radioReconnectWantedRef.current = true;
      }
    },
    [cancelRadioReconnect]
  );

  const togglePlaySource = async (source: AudioSource, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (audioSource === source && playing) {
      const audio = audioRef.current;
      if (audio) {
        radioReconnectWantedRef.current = false;
        audio.pause();
      }
      return;
    }
    await playSource(source);
  };

  const toggleBox = (source: AudioSource) => {
    setExpandedBox((prev) => (prev === source ? null : source));
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value);
    setVolume(value);
    volumeRef.current = value;

    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = value;
    audio.muted = value === 0;
    mutedRef.current = value === 0;
    setMuted(value === 0);
  };

  const toggleMute = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const audio = audioRef.current;
    if (!audio) return;
    const newMuted = !muted;
    audio.muted = newMuted;
    mutedRef.current = newMuted;
    setMuted(newMuted);
  };

  const formatTime = (seconds: number) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    return `${minutes}:${(safeSeconds % 60).toString().padStart(2, '0')}`;
  };

  const totalDuration = songElapsed + songRemaining;
  const progress = totalDuration > 0 ? Math.min(100, (songElapsed / totalDuration) * 100) : 0;

  return (
    <>
      <style>{`
        @keyframes radarTicker {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .radar-ticker {
          display: flex;
          width: max-content;
          animation: radarTicker 100s linear infinite;
          will-change: transform;
        }

        .radar-ticker:hover {
          animation-play-state: paused;
        }

        .radar-ticker-track {
          display: flex;
          align-items: center;
          gap: 2.5rem;
          padding-right: 2.5rem;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .radar-ticker {
            animation-duration: 80s;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .radar-ticker {
            animation: none;
          }
        }
      `}</style>

      <div
        className={`min-h-screen ${
          darkMode ? 'bg-[#080808] text-white' : 'bg-zinc-100 text-zinc-900'
        } transition-colors duration-500 font-sans pb-12`}
      >
        {/* HEADER */}
        <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080808]/85 backdrop-blur-2xl">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 h-[68px] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Radio className="w-5 h-5 text-black" />
                {playing && (
                  <span className="absolute -right-1 -top-1 w-3 h-3 rounded-full bg-green-400 border-2 border-[#080808]" />
                )}
              </div>

              <div className="text-left">
                <div className="font-black tracking-[-0.03em] text-sm sm:text-base leading-none">
                  RÁDIO CIRCUITO INTERNO
                </div>
                <div className="text-[9px] sm:text-[10px] text-orange-400 uppercase tracking-[0.2em] font-bold mt-1">
                  Música • Rádio
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCarMode((v) => !v)}
                className={`shrink-0 flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 rounded-full text-[9px] sm:text-[10px] uppercase tracking-wider font-bold transition-all ${
                  carMode
                    ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20'
                    : 'bg-white/[0.06] text-zinc-400 hover:text-white hover:bg-white/[0.1]'
                }`}
              >
                <Car className="w-3.5 h-3.5" />
                <span className="sm:hidden">Carro</span>
                <span className="hidden sm:inline">Modo carro</span>
              </button>

              <button
                type="button"
                onClick={() => setDarkMode((v) => !v)}
                className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                aria-label="Alterar tema"
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12">
          
          {/* RADAR MUSICAL */}
          <section className="mb-10 sm:mb-12">
            <div className="flex items-center gap-3 mb-3">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              <span className="text-xs sm:text-sm uppercase tracking-[0.3em] font-black text-orange-400">
                Radar Musical
              </span>
              <span className="text-xs text-zinc-500 uppercase tracking-wider">
                Últimas notícias
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] shadow-[0_10px_40px_rgba(0,0,0,0.18)] min-h-[52px]">
              <div className="flex items-center h-full">
                <div className="shrink-0 flex items-center px-4 sm:px-5 py-4 bg-orange-500 text-black font-black text-xs uppercase tracking-[0.18em] z-10">
                  RADAR
                </div>

                <div className="min-w-0 flex-1 overflow-hidden">
                  {newsItems.length > 0 && (
                    <div className="radar-ticker">
                      <div className="radar-ticker-track">
                        {newsItems.map((item) => (
                          <div
                            key={item.id}
                            className="inline-flex items-center gap-4 text-base sm:text-lg text-zinc-200"
                          >
                            <span className="font-medium whitespace-nowrap">
                              {cleanNewsTitle(item.title)}
                            </span>
                            <span className="text-orange-500 font-bold text-sm">
                              •
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="radar-ticker-track" aria-hidden="true">
                        {newsItems.map((item) => (
                          <div
                            key={`duplicate-${item.id}`}
                            className="inline-flex items-center gap-4 text-base sm:text-lg text-zinc-200"
                          >
                            <span className="font-medium whitespace-nowrap">
                              {cleanNewsTitle(item.title)}
                            </span>
                            <span className="text-orange-500 font-bold text-sm">
                              •
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <div className="max-w-4xl mb-8 sm:mb-12">
            <div className="flex items-center gap-3 mb-3">
              <span className="w-8 h-px bg-orange-500" />
              <span className="text-[10px] sm:text-xs uppercase tracking-[0.35em] font-bold text-orange-400">
                A sua experiência de áudio
              </span>
            </div>

            <h2 className="text-3xl sm:text-5xl font-black tracking-[-0.05em] leading-[0.95]">
              Música que cria <span className="text-zinc-500">momentos.</span>
            </h2>
          </div>

          {/* CAIXAS DOS PLAYERS NA PÁGINA PRINCIPAL */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-12">
            
            {/* CAIXA 1: RÁDIO CIRCUITO INTERNO */}
            <div
              onClick={() => toggleBox('circuito')}
              className={`relative overflow-hidden rounded-[28px] lg:col-span-7 border border-white/[0.08] bg-[#111] p-6 sm:p-8 cursor-pointer transition-all duration-300 ${
                expandedBox === 'circuito'
                  ? 'border-orange-500/50 shadow-2xl shadow-orange-500/10 ring-1 ring-orange-500/20'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,115,0,0.15),transparent_45%)]" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
                      <Radio className="w-6 h-6 text-black" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-orange-400">
                        Rádio Online
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                        Circuito Interno
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {playing && audioSource === 'circuito' && (
                      <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        A Tocar
                      </span>
                    )}
                    <span className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400">
                      {expandedBox === 'circuito' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  </div>
                </div>

                {expandedBox === 'circuito' ? (
                  <div className="mt-6 pt-6 border-t border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
                    {nowPlaying ? (
                      <div className="mb-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] p-4 sm:p-5 flex gap-4 items-center">
                        {nowPlaying.art ? (
                          <img src={nowPlaying.art} alt="" className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0" />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] uppercase tracking-[0.2em] font-bold text-orange-400 mb-1">
                            A tocar agora
                          </div>
                          <div className="text-base sm:text-lg font-bold truncate">{nowPlaying.title}</div>
                          <div className="text-xs sm:text-sm text-zinc-400 truncate">{nowPlaying.artist}</div>

                          <div className="mt-3">
                            <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                              <span>{formatTime(songElapsed)}</span>
                              <span>-{formatTime(songRemaining)}</span>
                            </div>
                            <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400 mb-6">Música selecionada para ouvir sem interrupções, 24 horas por dia.</p>
                    )}

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={(e) => togglePlaySource('circuito', e)}
                          disabled={loading && audioSource === 'circuito'}
                          className="w-14 h-14 rounded-full bg-orange-500 hover:bg-orange-400 text-black flex items-center justify-center shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                          aria-label="Tocar Rádio Circuito Interno"
                        >
                          {playing && audioSource === 'circuito' ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                        </button>
                        <div>
                          <div className="text-xs font-bold">
                            {playing && audioSource === 'circuito' ? '● EM EMISSÃO' : 'Iniciar Emissão'}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {loading && audioSource === 'circuito' ? 'A ligar...' : '24 Horas no Ar'}
                          </div>
                        </div>
                      </div>

                      {!carMode && (
                        <div className="flex items-center gap-2 max-w-[140px]">
                          <button type="button" onClick={toggleMute} className="text-zinc-400 hover:text-white">
                            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={muted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full accent-orange-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mt-2">Clique na caixa para abrir o player da rádio</p>
                )}
              </div>
            </div>

            {/* CAIXA 2: RÁDIO MARCOENSE */}
            <div
              onClick={() => toggleBox('marcoense')}
              className={`relative overflow-hidden rounded-[28px] lg:col-span-5 border border-white/[0.08] bg-[#111] p-6 sm:p-8 cursor-pointer transition-all duration-300 ${
                expandedBox === 'marcoense'
                  ? 'border-red-500/50 shadow-2xl shadow-red-500/10 ring-1 ring-red-500/20'
                  : 'hover:border-white/20'
              }`}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(220,30,50,0.15),transparent_45%)]" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center overflow-hidden shadow-lg shrink-0">
  <img 
    src="/icons/marcoense-logo.png" 
    alt="Rádio Marcoense 93.3 FM" 
    className="w-full h-full object-cover"
  />
</div>
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-red-400">
                        Rádio Local
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                        Rádio Marcoense
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {playing && audioSource === 'marcoense' && (
                      <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold text-red-400">
                        <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                        A Tocar
                      </span>
                    )}
                    <span className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-400">
                      {expandedBox === 'marcoense' ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  </div>
                </div>

                {expandedBox === 'marcoense' ? (
                  <div className="mt-6 pt-6 border-t border-white/[0.08]" onClick={(e) => e.stopPropagation()}>
                    <p className="text-xs text-zinc-400 mb-6">Emissão regional em direto na frequência <strong className="text-white">93.3 FM</strong>.</p>

                    <div className="flex items-center justify-between gap-4 mb-6">
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={(e) => togglePlaySource('marcoense', e)}
                          disabled={loading && audioSource === 'marcoense'}
                          className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-400 text-black flex items-center justify-center shadow-lg shadow-red-500/20 active:scale-95 transition-all"
                          aria-label="Tocar Rádio Marcoense"
                        >
                          {playing && audioSource === 'marcoense' ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
                        </button>
                        <div>
                          <div className="text-xs font-bold">
                            {playing && audioSource === 'marcoense' ? '● EM EMISSÃO' : 'Iniciar 93.3 FM'}
                          </div>
                          <div className="text-[10px] text-zinc-500">
                            {loading && audioSource === 'marcoense' ? 'A ligar...' : 'Direto de Marco de Canaveses'}
                          </div>
                        </div>
                      </div>

                      {!carMode && (
                        <div className="flex items-center gap-2 max-w-[140px]">
                          <button type="button" onClick={toggleMute} className="text-zinc-400 hover:text-white">
                            {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                          </button>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={muted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full accent-red-500"
                          />
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.05] p-4">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-red-400 uppercase tracking-wider mb-3">
                        <Calendar className="w-3.5 h-3.5" /> Programação em Destaque
                      </div>
                      <div className="space-y-3">
                        {SCHEDULE.map((item) => (
                          <div key={item.id} className="text-xs border-b border-white/[0.04] pb-2 last:border-none">
                            <div className="text-zinc-400 font-semibold">{item.title}</div>
                            <div className="text-[10px] text-zinc-600">{item.day} • {item.time}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500 mt-2">Clique na caixa para abrir o player da rádio</p>
                )}
              </div>
            </div>

          </div>

          {/* CONTACTO WHATSAPP */}
          <section className="pt-4">
            <a
              href="https://wa.me/351963350373?text=Ol%C3%A1%20Paulo%21%20Estou%20a%20ouvir%20o%20Circuito%20Interno%20atrav%C3%A9s%20da%20app%20e%20queria%20deixar%20uma%20mensagem."
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full sm:w-auto sm:max-w-sm mx-auto px-5 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-all group"
            >
              <MessageCircle className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold">Conversar com o Circuito Interno</span>
              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
            </a>
          </section>

        </main>

        {/* PLAYER FLUTUANTE EM MOBILE */}
        {playing && !carMode && (
          <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3">
            <div className="rounded-2xl border border-white/10 bg-[#151515]/95 backdrop-blur-2xl shadow-2xl p-3 flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 shrink-0 flex items-center justify-center">
                {audioSource === 'circuito' && nowPlaying?.art ? (
                  <img src={nowPlaying.art} alt="" className="w-full h-full object-cover" />
                ) : audioSource === 'marcoense' ? (
                  <img src={MARCOENSE_LOGO_SVG} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Radio className="w-5 h-5 text-orange-400" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">
                  {audioSource === 'marcoense' ? 'Rádio Marcoense' : nowPlaying?.title || 'Circuito Interno'}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {audioSource === 'circuito' ? nowPlaying?.artist || 'Em emissão' : '93.3 FM'}
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => togglePlaySource(audioSource, e)}
                className={`w-10 h-10 rounded-full text-black flex items-center justify-center shrink-0 ${
                  audioSource === 'marcoense' ? 'bg-red-500' : 'bg-orange-500'
                }`}
                aria-label="Pausar"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <audio ref={audioRef} playsInline preload="auto" />
      </div>
    </>
  );
}