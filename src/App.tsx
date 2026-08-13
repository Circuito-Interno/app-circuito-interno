import React, { useRef, useState } from 'react';
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
   STREAMS NATIVOS ORIGINAIS
   ========================================================= */

const STREAMS = {
  circuito: 'https://rhoster.pt/listen/circuito_interno/radio.mp3',
  marcoense: 'https://stream.dominioglobal.pt/8024/stream',
};

type AudioSource = 'circuito' | 'marcoense';

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
    description: 'As melhores baladas e músicas românticas para embalar a sua noite.',
  },
  {
    id: '2',
    title: 'Circuito Interno - Rock & Indie Alternativo',
    day: 'Sexta',
    time: '22h00 às 24h00',
    description: 'Uma seleção com o melhor do Rock clássico, Indie e música alternativa.',
  },
  {
    id: '3',
    title: 'Circuito Interno - Grandes Clássicos',
    day: 'Sábado',
    time: '13h00 às 15h00',
    description: 'Os intemporais que marcaram gerações e fizeram história na música.',
  },
];

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [audioSource, setAudioSource] = useState<AudioSource>('circuito');
  const [carMode, setCarMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* =========================================================
     CONTROLO DE ÁUDIO DIRETO E SIMPLES
     ========================================================= */

  const togglePlay = (source?: AudioSource) => {
    const audio = audioRef.current;
    if (!audio) return;

    const newSource = source || audioSource;

    if (playing && (!source || source === audioSource)) {
      audio.pause();
      setPlaying(false);
      return;
    }

    setAudioSource(newSource);
    audio.src = STREAMS[newSource];
    audio.volume = muted ? 0 : volume;

    audio
      .play()
      .then(() => {
        setPlaying(true);
      })
      .catch((err) => {
        console.error('Erro ao tocar:', err);
        setPlaying(false);
      });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value;
      if (value > 0) audioRef.current.muted = false;
    }
    setMuted(value === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const newMuted = !muted;
    audioRef.current.muted = newMuted;
    setMuted(newMuted);
  };

  return (
    <div
      className={`min-h-screen ${
        darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-100 text-zinc-900'
      } transition-colors duration-300 font-sans pb-12`}
    >
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
              onClick={() => setCarMode(!carMode)}
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
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">
        <div
          className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-2xl ${
            carMode ? 'py-12' : ''
          }`}
        >
          <div className="flex justify-center gap-2 mb-8 flex-wrap">
            <button
              onClick={() => togglePlay('circuito')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                audioSource === 'circuito'
                  ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                  : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              RÁDIO 24/7
            </button>

            <button
              onClick={() => togglePlay('marcoense')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                audioSource === 'marcoense'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              📻 DIRETO RÁDIO MARCOENSE
            </button>
          </div>

          <div className="flex flex-col items-center text-center space-y-4">
            <div
              className={`relative rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                carMode ? 'w-48 h-48' : 'w-40 h-40'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/20 to-transparent" />
              <Radio
                className={`text-orange-500 ${
                  carMode ? 'w-24 h-24' : 'w-20 h-20'
                } ${playing ? 'animate-pulse' : ''}`}
              />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight">
                {audioSource === 'marcoense'
                  ? 'Rádio Marcoense (Em Direto)'
                  : 'Rádio Circuito Interno'}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                {audioSource === 'marcoense'
                  ? 'Sinal 93.3 FM'
                  : 'Circuito Interno – A Sua Emissora'}
              </p>
            </div>

            <button
              onClick={() => togglePlay()}
              className={`rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white flex items-center justify-center transition-all shadow-xl shadow-orange-600/30 active:scale-95 ${
                carMode ? 'w-28 h-28' : 'w-20 h-20'
              }`}
            >
              {playing ? (
                <Pause className={carMode ? 'w-12 h-12' : 'w-8 h-8'} />
              ) : (
                <Play className={carMode ? 'w-12 h-12 ml-1' : 'w-8 h-8 ml-1'} />
              )}
            </button>

            {!carMode && (
              <div className="flex items-center gap-3 w-full max-w-xs pt-4">
                <button
                  onClick={toggleMute}
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
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />
              </div>
            )}
          </div>
        </div>

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

                <h4 className="font-bold text-sm mb-1">{item.title}</h4>

                <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <audio ref={audioRef} preload="none" playsInline />
    </div>
  );
}