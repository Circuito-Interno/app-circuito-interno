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
   STREAMS OFICIAIS
   ========================================================= */

const STREAMS = {
  circuito:
    'https://azuracast.rhoster.pt/listen/circuito_interno/radio.mp3',

  marcoense:
    'https://streaming.shoutcast.com/marcoense-fm',
} as const;

type AudioSource = keyof typeof STREAMS;

interface ScheduleItem {
  id: string;
  title: string;
  day: string;
  time: string;
  description: string;
}

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

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  const [audioSource, setAudioSource] =
    useState<AudioSource>('circuito');

  const [carMode, setCarMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  /* =========================================================
     EVENTOS DO AUDIO
     ========================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = volume;
    audio.muted = muted;

    const handlePlay = () => {
      setPlaying(true);
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

    const handleCanPlay = () => {
      setLoading(false);
      setError(false);
    };

    const handleError = () => {
      console.error(
        'Erro no elemento de áudio:',
        audio.error
      );

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
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  /* =========================================================
     VOLUME / MUTE
     ========================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  /* =========================================================
     PARAR COMPLETAMENTE O STREAM ATUAL
     ========================================================= */

  const resetAudio = () => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();

    audio.removeAttribute('src');

    /*
     * load() força o browser a abandonar completamente
     * a ligação anterior ao stream.
     */
    audio.load();

    setPlaying(false);
    setLoading(false);
  };

  /* =========================================================
     TOCAR / MUDAR DE RÁDIO
     ========================================================= */

  const playSource = async (source: AudioSource) => {
    const audio = audioRef.current;

    if (!audio) return;

    /*
     * Caso seja a mesma rádio:
     * apenas Play/Pause.
     */
    if (audioSource === source && audio.src) {
      if (audio.paused) {
        try {
          setLoading(true);
          setError(false);

          await audio.play();
        } catch (err) {
          console.error(
            'Erro ao retomar a emissão:',
            err
          );

          setPlaying(false);
          setLoading(false);
          setError(true);
        }
      } else {
        audio.pause();
      }

      return;
    }

    /*
     * Estamos a mudar de rádio.
     */
    setLoading(true);
    setError(false);

    /*
     * Parar completamente a rádio anterior.
     */
    resetAudio();

    /*
     * Atualizar a rádio selecionada.
     */
    setAudioSource(source);

    /*
     * Configurar o novo stream.
     */
    audio.src = STREAMS[source];
    audio.preload = 'none';
    audio.volume = volume;
    audio.muted = muted;

    /*
     * O play() é chamado diretamente a partir da
     * ação do utilizador, permitindo autoplay do stream.
     */
    try {
      await audio.play();

      setPlaying(true);
      setLoading(false);
      setError(false);
    } catch (err) {
      console.error(
        `Erro ao iniciar ${source}:`,
        err
      );

      setPlaying(false);
      setLoading(false);
      setError(true);
    }
  };

  /* =========================================================
     PLAY / PAUSE PRINCIPAL
     ========================================================= */

  const togglePlay = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    await playSource(audioSource);
  };

  /* =========================================================
     ALTERAÇÃO DO VOLUME
     ========================================================= */

  const handleVolumeChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = Number(event.target.value);

    setVolume(value);

    const audio = audioRef.current;

    if (!audio) return;

    audio.volume = value;

    if (value === 0) {
      audio.muted = true;
      setMuted(true);
    } else {
      audio.muted = false;
      setMuted(false);
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
     SELEÇÃO DA RÁDIO
     ========================================================= */

  const handleSourceChange = async (
    source: AudioSource
  ) => {
    if (source === audioSource && playing) {
      return;
    }

    await playSource(source);
  };

  /* =========================================================
     INFORMAÇÃO DA RÁDIO ATUAL
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
                setCarMode((value) => !value)
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
                setDarkMode((value) => !value)
              }
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
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

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        {/* ===================================================
            PLAYER
            =================================================== */}

        <div
          className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-2xl ${
            carMode ? 'py-12' : ''
          }`}
        >
          {/* RADIO SELECTOR */}

          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            <button
              onClick={() =>
                handleSourceChange('circuito')
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                audioSource === 'circuito'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              RÁDIO 24/7
            </button>

            <button
              onClick={() =>
                handleSourceChange('marcoense')
              }
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                audioSource === 'marcoense'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              📻 DIRETO RÁDIO MARCOENSE
            </button>
          </div>

          {/* PLAYER CONTENT */}

          <div className="flex flex-col items-center text-center space-y-4">
            {/* RADIO ICON */}

            <div
              className={`relative rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                carMode
                  ? 'w-48 h-48'
                  : 'w-40 h-40'
              }`}
            >
              <div
                className={`absolute inset-0 bg-gradient-to-tr ${
                  audioSource === 'marcoense'
                    ? 'from-red-600/20'
                    : 'from-orange-600/20'
                } to-transparent`}
              />

              <Radio
                className={`${
                  audioSource === 'marcoense'
                    ? 'text-red-500'
                    : 'text-orange-500'
                } ${
                  carMode
                    ? 'w-24 h-24'
                    : 'w-20 h-20'
                } ${
                  playing ? 'animate-pulse' : ''
                }`}
              />
            </div>

            {/* TITLE */}

            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {currentRadioTitle}
              </h2>

              <p className="text-sm text-zinc-400 mt-1">
                {currentRadioSubtitle}
              </p>
            </div>

            {/* STATUS */}

            <div className="min-h-[24px]">
              {loading && (
                <p className="text-xs text-orange-400 animate-pulse">
                  A ligar à emissão...
                </p>
              )}

              {!loading && error && (
                <p className="text-xs text-red-400">
                  Não foi possível ligar à emissão.
                </p>
              )}

              {!loading &&
                !error &&
                playing && (
                  <p
                    className={`text-xs font-semibold ${
                      audioSource === 'marcoense'
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

            {/* PLAY / PAUSE */}

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

            {/* VOLUME */}

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
                  {muted || volume === 0 ? (
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
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
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
            {SCHEDULE.map((item) => (
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
            ))}
          </div>
        </div>
      </main>

      {/* =====================================================
          AUDIO ELEMENT
          ===================================================== */}

      <audio
        ref={audioRef}
        preload="none"
        playsInline
        crossOrigin="anonymous"
      />
    </div>
  );
}