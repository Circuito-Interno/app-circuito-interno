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
  ArrowLeft,
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

type AppSection =
  | 'home'
  | 'circuito'
  | 'marcoense';

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
   RADAR MUSICAL — TICKER
   ========================================================= */



/* =========================================================
   STREAMS
   ========================================================= */

const STREAMS: Record<AudioSource, string> = {
  circuito:
    'https://azuracast.rhoster.pt/listen/circuito_interno/radio.mp3',

  /*
   * Rádio Marcoense
   *
   * Stream HTTP direto do servidor.
   */
  marcoense:
    'https://shiny-fire-6999.marcoense-relay.workers.dev/stream',
};

const NOW_PLAYING_URL =
  'https://azuracast.rhoster.pt/api/nowplaying/circuito_interno';

/* =========================================================
   PROGRAMAÇÃO
   ========================================================= */

const SCHEDULE: ScheduleItem[] = [
  {
    id: '1',
    title: 'Circuito Interno - Romântico',
    day: 'Terça a Quinta',
    time: '22h00 às 24h00',
    description:
      'As melhores baladas e músicas românticas para embalar a sua noite.',
  },
  {
    id: '2',
    title: 'Circuito Interno - Rock & Indie Alternativo',
    day: 'Sexta',
    time: '22h00 às 24h00',
    description:
      'Uma seleção com o melhor do Rock clássico, Indie e música alternativa.',
  },
  {
    id: '3',
    title: 'Circuito Interno - Grandes Clássicos',
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
  const audioRef =
    useRef<HTMLAudioElement | null>(null);

  /*
   * Refs para evitar closures antigas nos
   * listeners do elemento <audio>.
   */
  const playerModeRef =
    useRef<PlayerMode>('radio');

  const audioSourceRef =
    useRef<AudioSource>('circuito');

  const volumeRef =
    useRef(0.8);

  const mutedRef =
    useRef(false);

  /*
   * Reconexão automática da Rádio Marcoense.
   */
  const radioReconnectTimerRef =
    useRef<number | null>(null);

  const radioReconnectWantedRef =
    useRef(false);

  const radioReconnectAttemptRef =
    useRef(0);

  /* =======================================================
     NAVEGAÇÃO
     ======================================================= */

  const [section, setSection] =
    useState<AppSection>('home');

  /* =======================================================
     PLAYER
     ======================================================= */

  const [playing, setPlaying] =
    useState(false);

  const [volume, setVolume] =
    useState(0.8);

  const [muted, setMuted] =
    useState(false);

  const [audioSource, setAudioSource] =
    useState<AudioSource>('circuito');

  const [playerMode, setPlayerMode] =
    useState<PlayerMode>('radio');

  /* =======================================================
     GINÁSIO
     ======================================================= */

  /* =======================================================
     UI PLAYER
     ======================================================= */

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState(false);

  const [carMode, setCarMode] =
    useState(false);

  const [darkMode, setDarkMode] =
    useState(true);

  /* =======================================================
     NOW PLAYING
     ======================================================= */

  const [nowPlaying, setNowPlaying] =
    useState<NowPlayingSong | null>(null);

  const [nextSong, setNextSong] =
    useState<NowPlayingSong | null>(null);

  const [songElapsed, setSongElapsed] =
    useState(0);

  const [songRemaining, setSongRemaining] =
    useState(0);

  /* =========================================================
     RADAR MUSICAL
     ========================================================= */

  const [newsItems, setNewsItems] =
    useState<NewsItem[]>([]);


  /* =========================================================
     SINCRONIZAR REFS
     ========================================================= */

  useEffect(() => {
    playerModeRef.current =
      playerMode;
  }, [playerMode]);

  useEffect(() => {
    audioSourceRef.current =
      audioSource;
  }, [audioSource]);

  useEffect(() => {
    volumeRef.current =
      volume;
  }, [volume]);

  useEffect(() => {
    mutedRef.current =
      muted;
  }, [muted]);

  /* =========================================================
     RADAR MUSICAL — CARREGAR NOTÍCIAS
     ========================================================= */

  useEffect(() => {
    let cancelled = false;

    const loadNews = async () => {
      try {
        const response =
          await fetch('/api/news');

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status}`
          );
        }

        const data =
          await response.json();

        if (
          !cancelled &&
          Array.isArray(data.items)
        ) {
          setNewsItems(
            data.items
          );
        }
      } catch (error) {
        console.error(
          'Erro ao carregar Radar Musical:',
          error
        );
      } finally {
      }
    };

    loadNews();

    const interval =
      window.setInterval(
        loadNews,
        5 * 60 * 1000
      );

    return () => {
      cancelled = true;
      window.clearInterval(
        interval
      );
    };
  }, []);

  /* =========================================================
     CANCELAR RECONEXÃO
     ========================================================= */

  const cancelRadioReconnect =
    useCallback(() => {
      radioReconnectWantedRef.current =
        false;

      radioReconnectAttemptRef.current =
        0;

      if (
        radioReconnectTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          radioReconnectTimerRef.current
        );

        radioReconnectTimerRef.current =
          null;
      }
    }, []);

  /* =========================================================
     AUDIO — CONFIGURAÇÃO E LISTENERS
     ========================================================= */

  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) return;

    audio.volume =
      volumeRef.current;

    audio.muted =
      mutedRef.current;

    const handlePlay = () => {
      setPlaying(true);
      setLoading(false);
      setError(false);
    };

    const handlePause = () => {
      setPlaying(false);
      setLoading(false);
    };

    const handleWaiting = () => {
      setLoading(true);
    };

    const handlePlaying = () => {
      /*
       * A emissão voltou.
       */
      if (
        radioReconnectTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          radioReconnectTimerRef.current
        );

        radioReconnectTimerRef.current =
          null;
      }

      radioReconnectAttemptRef.current =
        0;

      setPlaying(true);
      setLoading(false);
      setError(false);
    };

    const handleError = () => {
      /*
       * Erro normal do elemento de áudio.
       *
       * Não fazemos proxy nem reconexão automática.
       * Os streams de rádio devem ser reproduzidos
       * diretamente pela origem.
       */
      setPlaying(false);
      setLoading(false);
      setError(true);
    };

    audio.addEventListener(
      'play',
      handlePlay
    );

    audio.addEventListener(
      'pause',
      handlePause
    );

    audio.addEventListener(
      'waiting',
      handleWaiting
    );

    audio.addEventListener(
      'playing',
      handlePlaying
    );

    audio.addEventListener(
      'error',
      handleError
    );

    return () => {
      audio.removeEventListener(
        'play',
        handlePlay
      );

      audio.removeEventListener(
        'pause',
        handlePause
      );

      audio.removeEventListener(
        'waiting',
        handleWaiting
      );

      audio.removeEventListener(
        'playing',
        handlePlaying
      );

      audio.removeEventListener(
        'error',
        handleError
      );
    };
  }, []);

  /* =========================================================
     VOLUME / MUTE
     ========================================================= */

  useEffect(() => {
    const audio =
      audioRef.current;

    if (!audio) return;

    audio.volume =
      volume;

    audio.muted =
      muted;
  }, [
    volume,
    muted,
  ]);

  /* =========================================================
     NOW PLAYING — AZURACAST
     ========================================================= */

  useEffect(() => {
    if (
      playerMode !== 'radio' ||
      audioSource !== 'circuito'
    ) {
      setNowPlaying(null);
      setNextSong(null);
      setSongElapsed(0);
      setSongRemaining(0);

      return;
    }

    let cancelled =
      false;

    const fetchNowPlaying =
      async () => {
        try {
          const response =
            await fetch(
              `${NOW_PLAYING_URL}?_=${Date.now()}`,
              {
                cache: 'no-store',
              }
            );

          if (!response.ok) {
            throw new Error(
              `Now Playing HTTP ${response.status}`
            );
          }

          const data =
            (await response.json()) as NowPlayingData;

          if (cancelled) return;

          setNowPlaying(
            data.now_playing?.song ??
              null
          );

          setNextSong(
            data.playing_next?.song ??
              null
          );

          setSongElapsed(
            data.now_playing?.elapsed ??
              0
          );

          setSongRemaining(
            data.now_playing?.remaining ??
              0
          );
        } catch (err) {
          console.error(
            'Erro ao obter Now Playing do AzuraCast:',
            err
          );
        }
      };

    void fetchNowPlaying();

    const interval =
      window.setInterval(
        () => {
          void fetchNowPlaying();
        },
        10000
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval
      );
    };
  }, [
    playerMode,
    audioSource,
  ]);

  /* =========================================================
     CONTADOR LOCAL DO AZURACAST
     ========================================================= */

  useEffect(() => {
    if (
      !playing ||
      playerMode !== 'radio' ||
      audioSource !== 'circuito'
    ) {
      return;
    }

    const interval =
      window.setInterval(
        () => {
          setSongElapsed(
            (value) =>
              value + 1
          );

          setSongRemaining(
            (value) =>
              value > 0
                ? value - 1
                : 0
          );
        },
        1000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    playing,
    playerMode,
    audioSource,
  ]);

  /* =========================================================
     PLAY / MUDAR DE RÁDIO
     ========================================================= */

  const playSource =
    useCallback(
      async (
        source: AudioSource
      ) => {
        const audio =
          audioRef.current;

        if (!audio) return;

        setLoading(true);
        setError(false);

        try {
          playerModeRef.current =
            'radio';

          setPlayerMode(
            'radio'
          );

          /*
           * Apenas a Rádio Marcoense mantém
           * reconexão automática.
           */
          if (
            source !== 'marcoense'
          ) {
            cancelRadioReconnect();
          }

          const sourceUrl =
            STREAMS[source];

          const currentSource =
            audio.getAttribute(
              'src'
            );

          const hasCurrentSource =
            currentSource ===
            sourceUrl;

          /*
           * Já estamos no mesmo stream:
           * Play / Pause.
           */
          if (
            audioSourceRef.current ===
              source &&
            hasCurrentSource
          ) {
            if (
              audio.paused
            ) {
              /*
               * Se for Marcoense, continuar
               * a permitir reconexão.
               */
              radioReconnectWantedRef.current =
                source === 'marcoense';

              await audio.play();

              setPlaying(
                true
              );
            } else {
              radioReconnectWantedRef.current =
                false;

              if (
                radioReconnectTimerRef.current !==
                null
              ) {
                window.clearTimeout(
                  radioReconnectTimerRef.current
                );

                radioReconnectTimerRef.current =
                  null;
              }

              audio.pause();

              setPlaying(
                false
              );
            }

            setLoading(false);

            return;
          }

          /*
           * Parar completamente o áudio anterior.
           */
          audio.pause();

          audio.removeAttribute(
            'src'
          );

          audio.load();

          audioSourceRef.current =
            source;

          setAudioSource(
            source
          );

          /*
           * Definir novo stream.
           */
          audio.src =
            sourceUrl;

          audio.preload =
            'none';

          audio.volume =
            volumeRef.current;

          audio.muted =
            mutedRef.current;

          audio.load();

          /*
           * A Marcoense pode reconectar automaticamente.
           */
          radioReconnectWantedRef.current =
            source === 'marcoense';

          radioReconnectAttemptRef.current =
            0;

          /*
           * Iniciar emissão.
           */
          await audio.play();

          setPlaying(true);
          setLoading(false);
          setError(false);
        } catch (err) {
          console.error(
            'Erro ao iniciar o stream:',
            err
          );

          setPlaying(false);
          setLoading(false);
          setError(true);

          /*
           * Se for Marcoense, manter a intenção
           * de reconectar mesmo que o primeiro play()
           * falhe.
           */
          if (
            source === 'marcoense'
          ) {
            radioReconnectWantedRef.current =
              true;
          }
        }
      },
      [
        cancelRadioReconnect,
      ]
    );

  /* =========================================================
     PLAY / PAUSE
     ========================================================= */

  const togglePlay =
    async () => {
      const audio =
        audioRef.current;

      if (!audio) return;

      /*
       * Se estiver a tocar, pausa.
       */
      if (!audio.paused) {
        radioReconnectWantedRef.current =
          false;

        if (
          radioReconnectTimerRef.current !==
          null
        ) {
          window.clearTimeout(
            radioReconnectTimerRef.current
          );

          radioReconnectTimerRef.current =
            null;
        }

        audio.pause();

        return;
      }

      /*
       * Rádio atual.
       */
      await playSource(
        audioSourceRef.current
      );
    };

  /* =========================================================
     ALTERAR VOLUME
     ========================================================= */

  const handleVolumeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value =
      Number(
        e.target.value
      );

    setVolume(value);
    volumeRef.current =
      value;

    const audio =
      audioRef.current;

    if (!audio) return;

    audio.volume =
      value;

    if (value > 0) {
      audio.muted =
        false;

      mutedRef.current =
        false;

      setMuted(false);
    } else {
      audio.muted =
        true;

      mutedRef.current =
        true;

      setMuted(true);
    }
  };

  /* =========================================================
     MUTE
     ========================================================= */

  const toggleMute = () => {
    const audio =
      audioRef.current;

    if (!audio) return;

    const newMuted =
      !muted;

    audio.muted =
      newMuted;

    mutedRef.current =
      newMuted;

    setMuted(
      newMuted
    );
  };

  /* =========================================================
     NAVEGAÇÃO PARA RÁDIOS
     ========================================================= */

  const openRadioSection = (
    source: AudioSource
  ) => {
    const audio =
      audioRef.current;

    cancelRadioReconnect();

    /*
     * Se estamos a mudar de rádio,
     * parar completamente o áudio.
     */
    if (
      audio &&
      (
        playerModeRef.current !==
          'radio' ||
        audioSourceRef.current !==
          source
      )
    ) {
      audio.pause();

      audio.removeAttribute(
        'src'
      );

      audio.load();

      setPlaying(false);
      setLoading(false);
      setError(false);
    }

    playerModeRef.current =
      'radio';

    audioSourceRef.current =
      source;

    setPlayerMode(
      'radio'
    );

    setAudioSource(
      source
    );

    setSection(
      source
    );
  };

  /* =========================================================
     NAVEGAÇÃO GERAL
     ========================================================= */

  const openSection = (
    nextSection: AppSection
  ) => {
    if (
      nextSection ===
      'circuito'
    ) {
      openRadioSection(
        'circuito'
      );

      return;
    }

    if (
      nextSection ===
      'marcoense'
    ) {
      openRadioSection(
        'marcoense'
      );

      return;
    }

    setSection(
      nextSection
    );
  };

  const goHome = () => {
    setSection(
      'home'
    );
  };

  /* =========================================================
     FORMATAR TEMPO
     ========================================================= */

  const formatTime = (
    seconds: number
  ) => {
    const safeSeconds =
      Math.max(
        0,
        Math.floor(
          seconds
        )
      );

    const minutes =
      Math.floor(
        safeSeconds / 60
      );

    const remainingSeconds =
      safeSeconds % 60;

    return `${minutes}:${remainingSeconds
      .toString()
      .padStart(2, '0')}`;
  };

  /* =========================================================
     PROGRESSO
     ========================================================= */

  const totalDuration =
    songElapsed +
    songRemaining;

  const progress =
    totalDuration > 0
      ? Math.min(
          100,
          (songElapsed /
            totalDuration) *
            100
        )
      : 0;

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <>
      <style>{`
        @keyframes radarTicker {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }

        .radar-ticker {
          display: flex;
          width: max-content;
          animation: radarTicker 75s linear infinite;
          will-change: transform;
        }

        .radar-ticker:hover {
          animation-play-state: paused;
        }

        .radar-ticker-track {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding-right: 2rem;
          flex-shrink: 0;
        }

        @media (max-width: 640px) {
          .radar-ticker {
            animation-duration: 60s;
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
        darkMode
          ? 'bg-[#080808] text-white'
          : 'bg-zinc-100 text-zinc-900'
      } transition-colors duration-500 font-sans`}
    >
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#080808]/85 backdrop-blur-2xl">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 h-[68px] flex items-center justify-between">
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-3 group"
          >
            <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">
              <Radio className="w-5 h-5 text-white" />

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
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCarMode(
                  (value) =>
                    !value
                )
              }
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
              onClick={() =>
                setDarkMode(
                  (value) =>
                    !value
                )
              }
              className="w-9 h-9 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              aria-label="Alterar tema"
            >
              {darkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          MAIN
          ===================================================== */}

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">

        {/* ===================================================
            HOME
            =================================================== */}

        {section === 'home' && (
          <section className="py-10 sm:py-16 lg:py-24">

            {/* =================================================
                RADAR MUSICAL
                ================================================= */}

            <section className="mb-10 sm:mb-14">
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

              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.035] shadow-[0_10px_40px_rgba(0,0,0,0.18)]">

                <div className="flex items-center">

                  <div className="shrink-0 flex items-center px-4 sm:px-5 py-4 bg-orange-500 text-black font-black text-xs uppercase tracking-[0.18em] z-10">
                    RADAR
                  </div>

                  <div className="min-w-0 flex-1 overflow-hidden">

                    <div className="radar-ticker">

                      <div className="radar-ticker-track">

                        {newsItems.map((item) => (
                          <a
                            key={item.id}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-3 text-base sm:text-lg text-zinc-200 hover:text-white transition-colors"
                          >
                            <span
                              className={
                                item.category === 'Portugal'
                                  ? 'text-xs sm:text-sm uppercase tracking-[0.16em] font-black text-emerald-400'
                                  : 'text-xs sm:text-sm uppercase tracking-[0.16em] font-black text-sky-400'
                              }
                            >
                              {item.category}
                            </span>

                            <span className="font-medium">
                              {cleanNewsTitle(item.title)}
                            </span>

                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 shrink-0" />
                          </a>
                        ))}

                      </div>

                      <div className="radar-ticker-track" aria-hidden="true">

                        {newsItems.map((item) => (
                          <a
                            key={`duplicate-${item.id}`}
                            href={item.link}
                            tabIndex={-1}
                            className="group inline-flex items-center gap-3 text-base sm:text-lg text-zinc-200 hover:text-white transition-colors"
                          >
                            <span
                              className={
                                item.category === 'Portugal'
                                  ? 'text-xs sm:text-sm uppercase tracking-[0.16em] font-black text-emerald-400'
                                  : 'text-xs sm:text-sm uppercase tracking-[0.16em] font-black text-sky-400'
                              }
                            >
                              {item.category}
                            </span>

                            <span className="font-medium">
                              {cleanNewsTitle(item.title)}
                            </span>

                            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-orange-400 shrink-0" />
                          </a>
                        ))}

                      </div>

                    </div>

                  </div>

                </div>

              </div>
            </section>

            <div className="max-w-4xl mb-10 sm:mb-14">
              <div className="flex items-center gap-3 mb-5">
                <span className="w-8 h-px bg-orange-500" />

                <span className="text-[10px] sm:text-xs uppercase tracking-[0.35em] font-bold text-orange-400">
                  A sua experiência de áudio
                </span>
              </div>

              <h2 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-[-0.05em] leading-[0.95] max-w-4xl">
                Música que cria
                <span className="block text-zinc-500">
                  momentos.
                </span>
              </h2>

              <p className="text-sm sm:text-base lg:text-lg text-zinc-500 mt-6 max-w-2xl leading-relaxed">
                Rádio, música e experiências sonoras
                pensadas para acompanhar cada momento.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

              <button
                type="button"
                onClick={() =>
                  openSection(
                    'circuito'
                  )
                }
                className="group relative overflow-hidden rounded-[28px] lg:col-span-7 min-h-[380px] sm:min-h-[440px] text-left border border-white/[0.08] bg-[#111] transition-all duration-500 hover:border-orange-500/40 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,115,0,0.25),transparent_45%)]" />

                <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-orange-500/10 blur-3xl group-hover:bg-orange-500/20 transition-all duration-700" />

                <div className="relative h-full p-7 sm:p-10 flex flex-col justify-between">
                  <div className="flex items-start justify-between">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-500 flex items-center justify-center shadow-xl shadow-orange-500/20">
                      <Radio className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>

                    <span className="flex items-center gap-2 text-[9px] uppercase tracking-[0.2em] font-bold text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Online
                    </span>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-orange-400 mb-3">
                      Rádio online
                    </div>

                    <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.04em] leading-none">
                      Circuito
                      <span className="block text-zinc-500">
                        Interno
                      </span>
                    </h3>

                    <p className="text-sm text-zinc-500 mt-4 max-w-md">
                      Música selecionada para ouvir
                      sem interrupções, 24 horas por dia.
                    </p>

                    <div className="flex items-center gap-2 mt-7 text-xs font-bold text-white">
                      Ouvir agora

                      <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black group-hover:translate-x-1 transition-transform">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  openSection(
                    'marcoense'
                  )
                }
                className="group relative overflow-hidden rounded-[28px] lg:col-span-5 min-h-[380px] sm:min-h-[440px] text-left border border-white/[0.08] bg-[#111] transition-all duration-500 hover:border-red-500/40 hover:-translate-y-1"
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(220,30,50,0.22),transparent_45%)]" />

                <div className="relative h-full p-7 sm:p-10 flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                    <Radio className="w-6 h-6 text-red-400" />
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.3em] font-bold text-red-400 mb-3">
                      Rádio local
                    </div>

                    <h3 className="text-3xl sm:text-4xl font-black tracking-[-0.04em] leading-none">
                      Rádio
                      <span className="block text-zinc-500">
                        Marcoense
                      </span>
                    </h3>

                    <p className="text-sm text-zinc-500 mt-4">
                      Emissão em direto • 93.3 FM
                    </p>

                    <div className="flex items-center gap-2 mt-7 text-xs font-bold text-white">
                      Ouvir rádio

                      <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-black group-hover:translate-x-1 transition-transform">
                        <ChevronRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </button>


            </div>
          </section>
        )}

        {/* ===================================================
            RADIO
            =================================================== */}

        {(section === 'circuito' ||
          section === 'marcoense') && (
          <section className="py-6 sm:py-10">

            <button
              type="button"
              onClick={goHome}
              className="flex items-center gap-2 text-xs uppercase tracking-wider font-bold text-zinc-500 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>

            <div
              className={`relative overflow-hidden rounded-[32px] border border-white/[0.08] ${
                section === 'marcoense'
                  ? 'bg-[#120b0d]'
                  : 'bg-[#120d08]'
              }`}
            >
              <div
                className={`absolute inset-0 ${
                  section === 'marcoense'
                    ? 'bg-[radial-gradient(circle_at_50%_0%,rgba(220,30,50,0.18),transparent_55%)]'
                    : 'bg-[radial-gradient(circle_at_50%_0%,rgba(255,115,0,0.22),transparent_55%)]'
                }`}
              />

              <div
                className={`relative grid ${
                  carMode
                    ? 'grid-cols-1'
                    : 'lg:grid-cols-[1fr_0.9fr]'
                }`}
              >

                <div className="min-h-[420px] sm:min-h-[520px] lg:min-h-[650px] flex items-center justify-center p-8 sm:p-12">
                  <div
                    className={`relative ${
                      carMode
                        ? 'w-56 h-56 sm:w-72 sm:h-72'
                        : 'w-64 h-64 sm:w-80 sm:h-80 lg:w-[420px] lg:h-[420px]'
                    } rounded-[32px] overflow-hidden border border-white/10 shadow-2xl`}
                  >
                    {audioSource ===
                      'circuito' &&
                    section ===
                      'circuito' &&
                    nowPlaying?.art ? (
                      <img
                        src={
                          nowPlaying.art
                        }
                        alt={`${nowPlaying.artist} - ${nowPlaying.title}`}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        <div
                          className={`absolute inset-0 ${
                            section ===
                            'marcoense'
                              ? 'bg-gradient-to-br from-red-600/40 via-red-950 to-black'
                              : 'bg-gradient-to-br from-orange-500/40 via-orange-950 to-black'
                          }`}
                        />

                        <div className="absolute inset-0 flex items-center justify-center">
                          <Radio
                            className={`${
                              section ===
                              'marcoense'
                                ? 'text-red-400'
                                : 'text-orange-400'
                            } ${
                              carMode
                                ? 'w-28 h-28'
                                : 'w-32 h-32 sm:w-40 sm:h-40'
                            } ${
                              playing
                                ? 'animate-pulse'
                                : ''
                            }`}
                          />
                        </div>
                      </>
                    )}

                    {playing && (
                      <div className="absolute inset-0 border-2 border-white/10 rounded-[32px]" />
                    )}
                  </div>
                </div>

                <div className="flex flex-col justify-center px-6 pb-10 lg:px-12 lg:py-12">
                  <div className="mb-8">
                    <div
                      className={`text-[10px] uppercase tracking-[0.3em] font-bold mb-3 ${
                        section ===
                        'marcoense'
                          ? 'text-red-400'
                          : 'text-orange-400'
                      }`}
                    >
                      {section ===
                      'marcoense'
                        ? 'Rádio local'
                        : 'Emissão online'}
                    </div>

                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-[-0.04em] leading-none">
                      {section ===
                      'marcoense'
                        ? 'Rádio Marcoense'
                        : 'Circuito Interno'}
                    </h2>

                    <p className="text-sm text-zinc-500 mt-3">
                      {section ===
                      'marcoense'
                        ? 'Emissão em direto • 93.3 FM'
                        : 'Música selecionada • 24/7'}
                    </p>
                  </div>

                  {section ===
                    'circuito' &&
                    playerMode ===
                      'radio' &&
                    audioSource ===
                      'circuito' &&
                    nowPlaying && (
                      <div className="mb-8">
                        <div className="text-[9px] uppercase tracking-[0.3em] font-bold text-orange-400 mb-3">
                          A tocar agora
                        </div>

                        <div className="text-2xl sm:text-3xl font-black tracking-tight">
                          {
                            nowPlaying.title
                          }
                        </div>

                        <div className="text-base text-zinc-400 mt-1">
                          {
                            nowPlaying.artist
                          }
                        </div>

                        {nowPlaying.album && (
                          <div className="text-xs text-zinc-600 mt-2">
                            {
                              nowPlaying.album
                            }
                          </div>
                        )}

                        <div className="mt-6">
                          <div className="flex justify-between text-[10px] text-zinc-600 mb-2">
                            <span>
                              {formatTime(
                                songElapsed
                              )}
                            </span>

                            <span>
                              -
                              {formatTime(
                                songRemaining
                              )}
                            </span>
                          </div>

                          <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-orange-500 transition-all duration-1000"
                              style={{
                                width: `${progress}%`,
                              }}
                            />
                          </div>
                        </div>

                        {nextSong && (
                          <div className="mt-5 text-xs text-zinc-600">
                            <span className="uppercase tracking-wider text-[9px]">
                              A seguir
                            </span>

                            <div className="mt-1 text-zinc-400">
                              <span className="font-semibold text-zinc-300">
                                {
                                  nextSong.artist
                                }
                              </span>

                              {' — '}

                              {
                                nextSong.title
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                  <div className="min-h-[24px] mb-5">
                    {loading && (
                      <p
                        className={`text-xs animate-pulse ${
                          section ===
                          'marcoense'
                            ? 'text-red-400'
                            : 'text-orange-400'
                        }`}
                      >
                        A ligar à emissão...
                      </p>
                    )}

                    {!loading &&
                      error && (
                        <p className="text-xs text-red-400">
                          Não foi possível ligar à emissão.
                        </p>
                      )}

                    {!loading &&
                      !error &&
                      playing && (
                        <p
                          className={`text-xs font-bold ${
                            section ===
                            'marcoense'
                              ? 'text-red-400'
                              : 'text-orange-400'
                          }`}
                        >
                          ● EM EMISSÃO
                        </p>
                      )}

                    {!loading &&
                      !error &&
                      !playing && (
                        <p className="text-xs text-zinc-600">
                          Emissão parada
                        </p>
                      )}
                  </div>

                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={
                        togglePlay
                      }
                      disabled={
                        loading
                      }
                      aria-label={
                        playing
                          ? 'Pausar rádio'
                          : 'Tocar rádio'
                      }
                      className={`shrink-0 ${
                        section ===
                        'marcoense'
                          ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20'
                          : 'bg-orange-500 hover:bg-orange-400 shadow-orange-500/20'
                      } ${
                        carMode
                          ? 'w-24 h-24'
                          : 'w-16 h-16'
                      } rounded-full flex items-center justify-center text-black shadow-xl active:scale-95 transition-all disabled:opacity-60`}
                    >
                      {playing ? (
                        <Pause
                          className={
                            carMode
                              ? 'w-10 h-10'
                              : 'w-7 h-7'
                          }
                        />
                      ) : (
                        <Play
                          className={
                            carMode
                              ? 'w-10 h-10 ml-1'
                              : 'w-7 h-7 ml-1'
                          }
                        />
                      )}
                    </button>

                    {!carMode && (
                      <div className="flex items-center gap-3 flex-1 max-w-xs">
                        <button
                          type="button"
                          onClick={
                            toggleMute
                          }
                          aria-label={
                            muted
                              ? 'Ativar som'
                              : 'Silenciar'
                          }
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          {muted ||
                          volume ===
                            0 ? (
                            <VolumeX className="w-5 h-5" />
                          ) : (
                            <Volume2 className="w-5 h-5" />
                          )}
                        </button>

                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={
                            muted
                              ? 0
                              : volume
                          }
                          onChange={
                            handleVolumeChange
                          }
                          aria-label="Volume"
                          className="w-full accent-orange-500"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {section ===
              'marcoense' && (
              <section className="mt-6 rounded-[28px] border border-white/[0.07] bg-[#101010] p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-red-400" />
                  </div>

                  <div>
                    <h3 className="font-black text-xl">
                      Programação
                    </h3>

                    <p className="text-xs text-zinc-600 mt-0.5">
                      Rádio Marcoense
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SCHEDULE.map(
                    (
                      item
                    ) => (
                      <div
                        key={
                          item.id
                        }
                        className="group rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 hover:bg-white/[0.05] hover:border-red-500/20 transition-all"
                      >
                        <div className="text-[9px] uppercase tracking-[0.18em] font-bold text-red-400">
                          {
                            item.day
                          }
                        </div>

                        <div className="text-xs text-zinc-600 mt-1">
                          {
                            item.time
                          }
                        </div>

                        <h4 className="font-bold text-sm mt-4">
                          {
                            item.title
                          }
                        </h4>

                        <p className="text-xs text-zinc-500 leading-relaxed mt-2">
                          {
                            item.description
                          }
                        </p>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}
          </section>
        )}

      </main>

      {/* =====================================================
          MOBILE PLAYER
          ===================================================== */}

      {playing &&
        !carMode && (
          <div className="sm:hidden fixed bottom-0 inset-x-0 z-40 p-3">
            <div className="rounded-2xl border border-white/10 bg-[#151515]/95 backdrop-blur-2xl shadow-2xl p-3 flex items-center gap-3">

              <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-800 shrink-0">
                {playerMode ===
                  'radio' &&
                nowPlaying?.art ? (
                  <img
                    src={
                      nowPlaying.art
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Radio className="w-5 h-5 text-orange-400" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">
                  {section ===
                  'marcoense'
                    ? 'Rádio Marcoense'
                    : nowPlaying?.title ||
                      'Circuito Interno'}
                </div>

                <div className="text-[10px] text-zinc-500 truncate">
                  {section ===
                  'circuito'
                    ? nowPlaying?.artist ||
                      'Em emissão'
                    : '93.3 FM'}
                </div>
              </div>

              <button
                type="button"
                onClick={
                  togglePlay
                }
                className="w-10 h-10 rounded-full bg-orange-500 text-black flex items-center justify-center shrink-0"
                aria-label="Pausar"
              >
                <Pause className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      {/* =====================================================
          CONTACTO WHATSAPP
          ===================================================== */}

      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10 py-8">
        <a
          href="https://wa.me/351963350373?text=Ol%C3%A1%20Paulo%21%20Estou%20a%20ouvir%20o%20Circuito%20Interno%20atrav%C3%A9s%20da%20app%20e%20queria%20deixar%20uma%20mensagem."
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-3 w-full sm:w-auto sm:max-w-sm mx-auto px-5 py-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white transition-all group"
        >
          <MessageCircle className="w-5 h-5 text-green-400 group-hover:scale-110 transition-transform" />

          <span className="text-sm font-bold">
            Conversar com o Circuito Interno
          </span>

          <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-300 transition-colors" />
        </a>
      </section>

      {/* =====================================================
          AUDIO
          ===================================================== */}

      <audio
        ref={audioRef}
        preload="none"
        playsInline
      />
    </div>
    </>
  );
}