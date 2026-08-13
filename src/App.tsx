import React, { useEffect, useRef, useState } from 'react';
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
} from 'lucide-react';

/* =========================================================
   TIPOS
   ========================================================= */

type AudioSource = 'circuito' | 'marcoense';

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

/* =========================================================
   STREAMS
   ========================================================= */

const STREAMS = {
  circuito:
    'https://azuracast.rhoster.pt/listen/circuito_interno/radio.mp3',

  marcoense:
    'https://streaming.shoutcast.com/marcoense-fm',
} as const;

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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* =======================================================
     ESTADO DO PLAYER
     ======================================================= */

  const [playing, setPlaying] = useState(false);

  const [volume, setVolume] = useState(0.8);

  const [muted, setMuted] = useState(false);

  const [audioSource, setAudioSource] =
    useState<AudioSource>('circuito');

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState(false);

  const [carMode, setCarMode] = useState(false);

  const [darkMode, setDarkMode] = useState(true);

  /* =======================================================
     NOW PLAYING
     ======================================================= */

  const [nowPlaying, setNowPlaying] =
    useState<NowPlayingSong | null>(null);

  const [nextSong, setNextSong] =
    useState<NowPlayingSong | null>(null);

  const [songElapsed, setSongElapsed] = useState(0);

  const [songRemaining, setSongRemaining] = useState(0);

  /* =========================================================
     CONFIGURAÇÃO INICIAL DO AUDIO
     ========================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = volume;
    audio.muted = muted;

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
      setPlaying(true);
      setLoading(false);
      setError(false);
    };

    const handleError = () => {
      setPlaying(false);
      setLoading(false);
      setError(true);
    };

    const handleEnded = () => {
      setPlaying(false);
      setLoading(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [volume, muted]);

  /* =========================================================
     ATUALIZAR VOLUME / MUTE
     ========================================================= */

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
    /*
     * O AzuraCast só é consultado quando
     * estamos na Rádio Circuito Interno.
     */

    if (audioSource !== 'circuito') {
      setNowPlaying(null);
      setNextSong(null);
      setSongElapsed(0);
      setSongRemaining(0);

      return;
    }

    let cancelled = false;

    const fetchNowPlaying = async () => {
      try {
        const response = await fetch(
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
          data.now_playing?.song ?? null
        );

        setNextSong(
          data.playing_next?.song ?? null
        );

        setSongElapsed(
          data.now_playing?.elapsed ?? 0
        );

        setSongRemaining(
          data.now_playing?.remaining ?? 0
        );
      } catch (err) {
        console.error(
          'Erro ao obter Now Playing do AzuraCast:',
          err
        );
      }
    };

    /*
     * Obter imediatamente.
     */

    fetchNowPlaying();

    /*
     * Atualizar a cada 10 segundos.
     */

    const interval = window.setInterval(
      fetchNowPlaying,
      10000
    );

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [audioSource]);

  /* =========================================================
     CONTADOR LOCAL
     ========================================================= */

  useEffect(() => {
    if (
      !playing ||
      audioSource !== 'circuito'
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      setSongElapsed((value) => value + 1);

      setSongRemaining((value) =>
        value > 0 ? value - 1 : 0
      );
    }, 1000);

    return () => {
      window.clearInterval(interval);
    };
  }, [playing, audioSource]);

  /* =========================================================
     PLAY / MUDAR DE RÁDIO
     ========================================================= */

  const playSource = async (
    source: AudioSource
  ) => {
    const audio = audioRef.current;

    if (!audio) return;

    setLoading(true);
    setError(false);

    try {
      /*
       * Se já estamos nesta rádio,
       * simplesmente fazemos Play/Pause.
       */

      if (audioSource === source) {
        if (audio.paused) {
          await audio.play();
        } else {
          audio.pause();
        }

        return;
      }

      /*
       * Parar o stream anterior.
       */

      audio.pause();

      audio.removeAttribute('src');

      audio.load();

      setPlaying(false);

      /*
       * Alterar rádio selecionada.
       */

      setAudioSource(source);

      /*
       * Carregar novo stream.
       */

      audio.src = STREAMS[source];

      audio.preload = 'none';

      audio.volume = volume;

      audio.muted = muted;

      /*
       * Começar emissão.
       */

      await audio.play();

      setPlaying(true);

      setLoading(false);
    } catch (err) {
      console.error(
        'Erro ao iniciar o stream:',
        err
      );

      setPlaying(false);

      setLoading(false);

      setError(true);
    }
  };

  /* =========================================================
     BOTÃO PRINCIPAL PLAY / PAUSE
     ========================================================= */

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    /*
     * Se está a tocar → PAUSE.
     */

    if (!audio.paused) {
      audio.pause();
      return;
    }

    /*
     * Se está parado → PLAY.
     */

    await playSource(audioSource);
  };

  /* =========================================================
     ALTERAR VOLUME
     ========================================================= */

  const handleVolumeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(
      e.target.value
    );

    setVolume(value);

    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = value;

    if (value > 0) {
      audio.muted = false;
      setMuted(false);
    } else {
      audio.muted = true;
      setMuted(true);
    }
  };

  /* =========================================================
     MUTE
     ========================================================= */

  const toggleMute = () => {
    const audio = audioRef.current;

    if (!audio) return;

    const newMuted = !muted;

    audio.muted = newMuted;

    setMuted(newMuted);
  };

  /* =========================================================
     SELEÇÃO DE RÁDIO
     ========================================================= */

  const handleSourceChange = async (
    source: AudioSource
  ) => {
    /*
     * Se estamos a clicar na rádio
     * que já está selecionada,
     * não fazemos nada.
     */

    if (source === audioSource) {
      return;
    }

    await playSource(source);
  };

  /* =========================================================
     LABELS
     ========================================================= */

  const currentRadioTitle =
    audioSource === 'marcoense'
      ? 'Rádio Marcoense'
      : 'Rádio Circuito Interno';

  const currentRadioSubtitle =
    audioSource === 'marcoense'
      ? 'Emissão em direto • 93.3 FM'
      : 'Emissão Online 24/7';

  /* =========================================================
     FORMATAR TEMPO
     ========================================================= */

  const formatTime = (
    seconds: number
  ) => {
    const safeSeconds = Math.max(
      0,
      Math.floor(seconds)
    );

    const minutes = Math.floor(
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
    songElapsed + songRemaining;

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
    <div
      className={`min-h-screen ${
        darkMode
          ? 'bg-zinc-950 text-zinc-100'
          : 'bg-zinc-100 text-zinc-900'
      } transition-colors duration-300 font-sans pb-12`}
    >

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="border-b border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-50">

        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">

              <Radio className="w-5 h-5" />

            </div>

            <div>

              <h1 className="font-bold tracking-tight text-lg leading-none">
                RÁDIO CIRCUITO INTERNO
              </h1>

              <span className="text-xs text-orange-500 font-medium tracking-wide uppercase">
                Emissão Online HD
              </span>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={() =>
                setCarMode(
                  (value) => !value
                )
              }
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                carMode
                  ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
              }`}
            >

              <Car className="w-3.5 h-3.5" />

              <span>MODO CARRO</span>

            </button>

            <button
              onClick={() =>
                setDarkMode(
                  (value) => !value
                )
              }
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
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

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* ===================================================
            PLAYER
            =================================================== */}

        <div
          className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-2xl ${
            carMode
              ? 'py-12'
              : ''
          }`}
        >

          {/* =================================================
              SELEÇÃO DE RÁDIO
              ================================================= */}

          <div className="flex justify-center gap-2 mb-8 flex-wrap">

            <button
              onClick={() =>
                handleSourceChange(
                  'circuito'
                )
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                audioSource ===
                'circuito'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              RÁDIO CIRCUITO INTERNO - DIRETO
            </button>

            <button
              onClick={() =>
                handleSourceChange(
                  'marcoense'
                )
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                audioSource ===
                'marcoense'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              RÁDIO MARCOENSE - DIRETO
            </button>

          </div>

          {/* =================================================
              PLAYER CONTENT
              ================================================= */}

          <div className="flex flex-col items-center text-center space-y-4">

            {/* =================================================
                CAPA / ÍCONE
                ================================================= */}

            <div
              className={`relative rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                carMode
                  ? 'w-48 h-48'
                  : 'w-40 h-40'
              }`}
            >

              {audioSource ===
                'circuito' &&
              nowPlaying?.art ? (

                <img
                  src={nowPlaying.art}
                  alt={`${nowPlaying.artist} - ${nowPlaying.title}`}
                  className="absolute inset-0 w-full h-full object-cover"
                />

              ) : (

                <>

                  <div
                    className={`absolute inset-0 bg-gradient-to-tr ${
                      audioSource ===
                      'marcoense'
                        ? 'from-red-600/20'
                        : 'from-orange-600/20'
                    } to-transparent`}
                  />

                  <Radio
                    className={`${
                      audioSource ===
                      'marcoense'
                        ? 'text-red-500'
                        : 'text-orange-500'
                    } ${
                      carMode
                        ? 'w-24 h-24'
                        : 'w-20 h-20'
                    } ${
                      playing
                        ? 'animate-pulse'
                        : ''
                    }`}
                  />

                </>

              )}

            </div>

            {/* =================================================
                NOME DA RÁDIO
                ================================================= */}

            <div>

              <h2 className="text-xl font-bold tracking-tight">
                {currentRadioTitle}
              </h2>

              <p className="text-sm text-zinc-400 mt-1">
                {currentRadioSubtitle}
              </p>

            </div>

            {/* =================================================
                NOW PLAYING
                ================================================= */}

            {audioSource ===
              'circuito' &&
            nowPlaying && (

              <div className="w-full max-w-md pt-2">

                <div className="rounded-2xl border border-orange-500/20 bg-zinc-900/80 p-4">

                  <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-orange-400 mb-2">
                    A TOCAR AGORA
                  </div>

                  <div className="text-lg font-bold text-white">
                    {nowPlaying.artist}
                  </div>

                  <div className="text-base text-zinc-200 mt-0.5">
                    {nowPlaying.title}
                  </div>

                  {nowPlaying.album && (

                    <div className="text-xs text-zinc-500 mt-1">
                      {nowPlaying.album}
                    </div>

                  )}

                  {/* TEMPO */}

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-3">

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

                  {/* BARRA */}

                  <div className="w-full h-1 bg-zinc-800 rounded-full mt-1 overflow-hidden">

                    <div
                      className="h-full bg-orange-500 transition-all duration-1000"
                      style={{
                        width: `${progress}%`,
                      }}
                    />

                  </div>

                </div>

                {/* A SEGUIR */}

                {nextSong && (

                  <div className="text-left mt-3 px-1">

                    <span className="text-[10px] uppercase tracking-wider text-zinc-600">
                      A SEGUIR
                    </span>

                    <div className="text-xs text-zinc-400 mt-1">

                      <span className="font-semibold text-zinc-300">
                        {nextSong.artist}
                      </span>

                      {' — '}

                      {nextSong.title}

                    </div>

                  </div>

                )}

              </div>

            )}

            {/* =================================================
                ESTADO
                ================================================= */}

            <div className="min-h-[24px]">

              {loading && (

                <p className="text-xs text-orange-400 animate-pulse">
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
                    className={`text-xs font-semibold ${
                      audioSource ===
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

                  <p className="text-xs text-zinc-500">
                    Emissão parada
                  </p>

                )}

            </div>

            {/* =================================================
                PLAY / PAUSE
                ================================================= */}

            <button
              onClick={togglePlay}
              disabled={loading}
              aria-label={
                playing
                  ? 'Pausar rádio'
                  : 'Tocar rádio'
              }
              className={`rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white flex items-center justify-center transition-all shadow-xl shadow-orange-600/30 active:scale-95 disabled:opacity-60 disabled:cursor-wait ${
                carMode
                  ? 'w-28 h-28'
                  : 'w-20 h-20'
              }`}
            >

              {playing ? (

                <Pause
                  className={
                    carMode
                      ? 'w-12 h-12'
                      : 'w-8 h-8'
                  }
                />

              ) : (

                <Play
                  className={
                    carMode
                      ? 'w-12 h-12 ml-1'
                      : 'w-8 h-8 ml-1'
                  }
                />

              )}

            </button>

            {/* =================================================
                VOLUME
                ================================================= */}

            {!carMode && (

              <div className="flex items-center gap-3 w-full max-w-xs pt-4">

                <button
                  onClick={toggleMute}
                  aria-label={
                    muted
                      ? 'Ativar som'
                      : 'Silenciar'
                  }
                  className="text-zinc-400 hover:text-white transition-colors"
                >

                  {muted ||
                  volume === 0 ? (

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
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />

              </div>

            )}

          </div>

        </div>

        {/* ===================================================
            PROGRAMAÇÃO
            =================================================== */}

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6">

          <div className="flex items-center justify-between mb-4">

            <h3 className="font-bold text-lg flex items-center gap-2">

              <Calendar className="w-5 h-5 text-orange-500" />

              Programação

            </h3>

          </div>

          <div className="grid gap-3 sm:grid-cols-3">

            {SCHEDULE.map(
              (item) => (

                <div
                  key={item.id}
                  className="bg-zinc-900/80 border border-zinc-800/60 p-4 rounded-2xl hover:border-zinc-700 transition-all"
                >

                  <span className="text-xs font-semibold text-orange-400 block mb-1">
                    {item.day} • {item.time}
                  </span>

                  <h4 className="font-bold text-sm mb-1">
                    {item.title}
                  </h4>

                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {item.description}
                  </p>

                </div>

              )
            )}

          </div>

        </div>

      </main>

      {/* =====================================================
          AUDIO
          ===================================================== */}

      <audio
        ref={audioRef}
        preload="none"
        playsInline
      />

    </div>
  );
}