import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Radio,
  Calendar,
  Car,
  Clock,
  AlertCircle,
  Moon,
  Sun,
} from 'lucide-react';

/* =========================================================
   STREAMS
   ========================================================= */

/*
  IMPORTANTE:
  O áudio passa agora pela nossa API na Vercel.

  Isto evita que iPhone/iPad/Safari tenham de aceder
  diretamente ao stream HTTP da Rádio Marcoense.
*/
const CIRCUITO_STREAM = '/api/stream?source=circuito';
const MARCOENSE_STREAM = '/api/stream?source=marcoense';

/*
  Endpoint original da Zeno para obter a música atual.
  Mantemos este separado do áudio.
*/
const ZENO_METADATA =
  'https://api.zeno.fm/mounts/metadata/subscribe/f326190m038uv';

/* =========================================================
   TIPOS
   ========================================================= */

type AudioSource = 'circuito' | 'marcoense';

interface ScheduleItem {
  id: string;
  title: string;
  day: string;
  time: string;
  description: string;
}

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

const SPECIAL_SHOWS = [
  {
    name: 'Circuito Interno – Romântico',
    days: [2, 3, 4],
    startHour: 22,
    endHour: 24,
  },
  {
    name: 'Circuito Interno – Rock & Indie Alternativo',
    days: [5],
    startHour: 22,
    endHour: 24,
  },
  {
    name: 'Circuito Interno – Grandes Clássicos',
    days: [6],
    startHour: 13,
    endHour: 15,
  },
];

/* =========================================================
   NOTÍCIAS
   ========================================================= */

const RSS_FEEDS = [
  {
    name: 'Jornal de Notícias',
    url: 'https://www.jn.pt/rss/ultima-hora.xml',
  },
  {
    name: 'Diário de Notícias',
    url: 'https://www.dn.pt/rss/ultima-hora.xml',
  },
  {
    name: 'Público',
    url: 'https://feeds.feedburner.com/PublicoRSS',
  },
  {
    name: 'TSF Últimas',
    url: 'https://www.tsf.pt/rss/ultima-hora.xml',
  },
  {
    name: 'Rádio Renascença',
    url: 'https://rr.sapo.pt/rss/rssultima.xml',
  },
];

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);

  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);

  const [audioSource, setAudioSource] =
    useState<AudioSource>('circuito');

  const [currentSong, setCurrentSong] = useState(
    'Rádio Circuito Interno'
  );

  const [error, setError] = useState<string | null>(null);

  const [carMode, setCarMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  const [news, setNews] = useState<string[]>([]);
  const [nextShowText, setNextShowText] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);

  /* =========================================================
     METADADOS — CIRCUITO INTERNO
     ========================================================= */

  const fetchNowPlaying = async () => {
    try {
      const response = await fetch(
        `${ZENO_METADATA}?nocache=${Date.now()}`,
        {
          cache: 'no-store',
        }
      );

      if (!response.ok) {
        return;
      }

      const reader = response.body?.getReader();

      if (!reader) {
        return;
      }

      const { value } = await reader.read();

      reader.releaseLock();

      if (!value) {
        return;
      }

      const text = new TextDecoder().decode(value);

      if (!text) {
        return;
      }

      /*
        O endpoint pode devolver mais do que uma mensagem.
        Tentamos encontrar JSON dentro da resposta.
      */
      const lines = text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      for (const line of lines) {
        try {
          const data = JSON.parse(line);

          if (data.streamTitle) {
            setCurrentSong(data.streamTitle);
            return;
          }

          if (data.title) {
            setCurrentSong(data.title);
            return;
          }
        } catch {
          // Continua a procurar noutra linha.
        }
      }

      /*
        Alguns formatos podem devolver diretamente o JSON.
      */
      try {
        const data = JSON.parse(text);

        if (data.streamTitle) {
          setCurrentSong(data.streamTitle);
        } else if (data.title) {
          setCurrentSong(data.title);
        }
      } catch {
        // Ignorar resposta que não seja JSON.
      }
    } catch (err) {
      console.log(
        'Erro ao obter metadados da música:',
        err
      );
    }
  };

  /* =========================================================
     ATUALIZAÇÃO DOS METADADOS
     ========================================================= */

  useEffect(() => {
    fetchNowPlaying();

    const interval = window.setInterval(
      fetchNowPlaying,
      10000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /* =========================================================
     COUNTDOWN
     ========================================================= */

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();

      const currentDay = now.getDay();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const currentTimeInMinutes =
        currentHour * 60 + currentMinute;

      let bestDiff = Infinity;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDay =
          (currentDay + dayOffset) % 7;

        for (const show of SPECIAL_SHOWS) {
          if (!show.days.includes(targetDay)) {
            continue;
          }

          const startMinutes =
            show.startHour * 60;

          let diffMinutes: number;

          if (dayOffset === 0) {
            diffMinutes =
              startMinutes -
              currentTimeInMinutes;

            if (diffMinutes < 0) {
              continue;
            }
          } else {
            diffMinutes =
              dayOffset * 24 * 60 +
              startMinutes -
              currentTimeInMinutes;
          }

          if (diffMinutes < bestDiff) {
            bestDiff = diffMinutes;
          }
        }
      }

      if (bestDiff !== Infinity) {
        const hours = Math.floor(
          bestDiff / 60
        );

        const minutes = bestDiff % 60;

        setNextShowText(
          `${hours}h : ${
            minutes < 10 ? '0' : ''
          }${minutes}m`
        );
      }
    };

    updateCountdown();

    const interval = window.setInterval(
      updateCountdown,
      60000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /* =========================================================
     RSS
     ========================================================= */

  useEffect(() => {
    const fetchNews = async () => {
      try {
        let allTitles: string[] = [];

        for (const feed of RSS_FEEDS) {
          try {
            const response = await fetch(
              `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(
                feed.url
              )}`
            );

            if (!response.ok) {
              continue;
            }

            const data = await response.json();

            if (data.items) {
              const titles = data.items
                .slice(0, 3)
                .map(
                  (item: any) =>
                    `${feed.name}: ${item.title}`
                );

              allTitles = [
                ...allTitles,
                ...titles,
              ];
            }
          } catch {
            // Continua para o próximo feed.
          }
        }

        if (allTitles.length > 0) {
          setNews(allTitles);
        }
      } catch (err) {
        console.error(
          'Erro ao carregar notícias:',
          err
        );
      }
    };

    fetchNews();

    const interval = window.setInterval(
      fetchNews,
      300000
    );

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  /* =========================================================
     PARAR ÁUDIO
     ========================================================= */

  const stopAudio = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();

    audio.removeAttribute('src');

    audio.load();

    setPlaying(false);
    setLoading(false);
  };

  /* =========================================================
     INICIAR RÁDIO
     ========================================================= */

  const startRadio = async (
    source: AudioSource
  ) => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    setError(null);
    setLoading(true);

    try {
      /*
        Primeiro paramos completamente o stream anterior.
      */
      audio.pause();
      audio.removeAttribute('src');
      audio.load();

      setAudioSource(source);

      /*
        Adicionamos um parâmetro anti-cache.
        Isto é especialmente útil em streams.
      */
      const targetUrl =
        source === 'marcoense'
          ? `${MARCOENSE_STREAM}&t=${Date.now()}`
          : `${CIRCUITO_STREAM}&t=${Date.now()}`;

      console.log(
        'A iniciar:',
        source
      );

      console.log(
        'URL:',
        targetUrl
      );

      audio.src = targetUrl;

      audio.volume = muted ? 0 : volume;
      audio.muted = muted;

      /*
        O play acontece diretamente na sequência
        do clique do utilizador.
      */
      await audio.play();

      setPlaying(true);
      setLoading(false);

      /*
        Atualizamos imediatamente a música do Circuito.
      */
      if (source === 'circuito') {
        fetchNowPlaying();
      }
    } catch (err) {
      console.error(
        'Erro ao iniciar rádio:',
        err
      );

      setPlaying(false);
      setLoading(false);

      if (source === 'marcoense') {
        setError(
          'Não foi possível iniciar a emissão da Rádio Marcoense.'
        );
      } else {
        setError(
          'Não foi possível iniciar a emissão da Rádio Circuito Interno.'
        );
      }
    }
  };

  /* =========================================================
     BOTÃO DA RÁDIO
     ========================================================= */

  const selectRadio = async (
    source: AudioSource
  ) => {
    /*
      Se clicarmos na rádio que já está a tocar,
      paramos.
    */
    if (
      playing &&
      audioSource === source
    ) {
      stopAudio();
      return;
    }

    await startRadio(source);
  };

  /* =========================================================
     BOTÃO PLAY / PAUSE
     ========================================================= */

  const togglePlayPause = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    /*
      Se estiver a tocar, fazemos pause.
    */
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    /*
      Se já existe uma fonte carregada, tentamos
      simplesmente voltar a reproduzir.
    */
    if (audio.src) {
      try {
        setError(null);
        setLoading(true);

        await audio.play();

        setPlaying(true);
        setLoading(false);

        return;
      } catch (err) {
        console.error(
          'Erro ao retomar:',
          err
        );
      }
    }

    /*
      Se não existe fonte, iniciamos a rádio
      selecionada.
    */
    await startRadio(audioSource);
  };

  /* =========================================================
     EVENTOS DO AUDIO
     ========================================================= */

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handlePlay = () => {
      setPlaying(true);
      setLoading(false);
    };

    const handlePause = () => {
      setPlaying(false);
      setLoading(false);
    };

    const handleWaiting = () => {
      /*
        Não alteramos "playing" para false.
        O stream pode simplesmente estar
        a preencher o buffer.
      */
      setLoading(true);
    };

    const handlePlaying = () => {
      setPlaying(true);
      setLoading(false);
      setError(null);
    };

    const handleCanPlay = () => {
      setLoading(false);
    };

    const handleError = () => {
      console.error(
        'Elemento <audio> encontrou um erro.',
        audio.error
      );

      setPlaying(false);
      setLoading(false);

      /*
        Não mostramos uma mensagem imediatamente.
        Alguns browsers disparam "error" durante
        tentativas de ligação a streams.
      */
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
      'canplay',
      handleCanPlay
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
        'canplay',
        handleCanPlay
      );

      audio.removeEventListener(
        'error',
        handleError
      );
    };
  }, []);

  /* =========================================================
     VOLUME
     ========================================================= */

  const handleVolumeChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(
      e.target.value
    );

    setVolume(value);

    if (audioRef.current) {
      audioRef.current.volume = value;

      if (value > 0) {
        audioRef.current.muted = false;
      }
    }

    setMuted(value === 0);
  };

  /* =========================================================
     MUTE
     ========================================================= */

  const toggleMute = () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const newMuted = !muted;

    audio.muted = newMuted;

    setMuted(newMuted);
  };

  /* =========================================================
     INFORMAÇÃO DO PLAYER
     ========================================================= */

  const playerTitle =
    audioSource === 'marcoense'
      ? 'Rádio Marcoense (Em Direto)'
      : currentSong;

  const playerSubtitle =
    audioSource === 'marcoense'
      ? 'Sinal 93.3 FM'
      : 'Circuito Interno – A Sua Emissora';

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
                Emissão Online
              </span>

            </div>

          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={() =>
                setCarMode(!carMode)
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
                setDarkMode(!darkMode)
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
            ERRO
            =================================================== */}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">

            <AlertCircle className="w-5 h-5 shrink-0" />

            <p>{error}</p>

          </div>
        )}

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

          {/* SELEÇÃO DE FONTE */}

          <div className="flex justify-center gap-2 mb-8 flex-wrap">

            <button
              onClick={() =>
                selectRadio('circuito')
              }
              disabled={loading}
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
                selectRadio('marcoense')
              }
              disabled={loading}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                audioSource === 'marcoense'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
                  : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'
              }`}
            >
              📻 DIRETO RÁDIO MARCOENSE
            </button>

          </div>

          {/* ARTE / PLAYER */}

          <div className="flex flex-col items-center text-center space-y-4">

            <div
              className={`relative rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shadow-2xl transition-all duration-300 ${
                carMode
                  ? 'w-48 h-48'
                  : 'w-40 h-40'
              }`}
            >

              <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/20 to-transparent" />

              <Radio
                className={`text-orange-500 ${
                  carMode
                    ? 'w-24 h-24'
                    : 'w-20 h-20'
                } ${
                  playing
                    ? 'animate-pulse'
                    : ''
                }`}
              />

            </div>

            {/* TÍTULO */}

            <div>

              <h2 className="text-xl font-bold tracking-tight">
                {playerTitle}
              </h2>

              <p className="text-sm text-zinc-400 mt-1">
                {playerSubtitle}
              </p>

            </div>

            {/* PLAY / PAUSE */}

            <button
              onClick={togglePlayPause}
              disabled={loading}
              aria-label={
                playing
                  ? 'Pausar rádio'
                  : 'Reproduzir rádio'
              }
              className={`rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white flex items-center justify-center transition-all shadow-xl shadow-orange-600/30 active:scale-95 ${
                carMode
                  ? 'w-28 h-28'
                  : 'w-20 h-20'
              }`}
            >

              {loading ? (
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : playing ? (
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
                  className="text-zinc-400 hover:text-white transition-colors"
                  aria-label={
                    muted
                      ? 'Ativar som'
                      : 'Silenciar'
                  }
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
                  className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
                />

              </div>
            )}

          </div>

        </div>

        {/* ===================================================
            NEWS
            =================================================== */}

        {news.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3 overflow-hidden">

            <div className="flex items-center gap-3">

              <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-2.5 py-1 rounded-md shrink-0 border border-orange-500/20">
                ÚLTIMAS
              </span>

              <div className="whitespace-nowrap overflow-hidden text-sm text-zinc-300">

                <div className="inline-block animate-marquee">
                  {news.join('  •  ')}
                </div>

              </div>

            </div>

          </div>
        )}

        {/* ===================================================
            PROGRAMAÇÃO
            =================================================== */}

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6">

          <div className="flex items-center justify-between mb-4">

            <h3 className="font-bold text-lg flex items-center gap-2">

              <Calendar className="w-5 h-5 text-orange-500" />

              Programação

            </h3>

            {nextShowText && (
              <span className="text-xs text-zinc-400 flex items-center gap-1">

                <Clock className="w-3.5 h-3.5 text-orange-400" />

                Direto em {nextShowText}

              </span>
            )}

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
          ELEMENTO AUDIO
          ===================================================== */}

      <audio
        ref={audioRef}
        preload="none"
        playsInline
      />

    </div>
  );
}