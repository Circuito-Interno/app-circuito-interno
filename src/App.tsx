import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Radio, Calendar, Car, Clock, AlertCircle, Moon, Sun } from 'lucide-react';

// STREAMS E RECURSOS
const STREAM_URL = "https://stream.zeno.fm/f326190m038uv";
const RADIO_MARCOENSE_STREAM = "https://stream.digitalrm.pt/radiomarcoense";

interface ScheduleItem {
  id: string;
  title: string;
  day: string;
  time: string;
  description: string;
}

const SCHEDULE: ScheduleItem[] = [
  { id: '1', title: 'Circuito Interno - Romântico', day: 'Terça a Quinta', time: '22h00 às 24h00', description: 'As melhores baladas e músicas românticas para embalar a sua noite.' },
  { id: '2', title: 'Circuito Interno - Rock & Indie Alternativo', day: 'Sexta', time: '22h00 às 24h00', description: 'Uma seleção com o melhor do Rock clássico, Indie e música alternativa.' },
  { id: '3', title: 'Circuito Interno - Grandes Clássicos', time: '13h00 às 15h00', day: 'Sábado', description: 'Os intemporais que marcaram gerações e fizeram história na música.' }
];

const SPECIAL_SHOWS = [
  { name: "Circuito Interno – Romântico", days: [2, 3, 4], startHour: 22, endHour: 24 },
  { name: "Circuito Interno – Rock & Indie Alternativo", days: [5], startHour: 22, endHour: 24 },
  { name: "Circuito Interno – Grandes Clássicos", days: [6], startHour: 13, endHour: 15 }
];

// FEEDS RSS DIREITOS DE JORNAIS PORTUGUESES
const RSS_FEEDS = [
  { name: 'Jornal de Notícias', url: 'https://www.jn.pt/rss/ultima-hora.xml' },
  { name: 'Diário de Notícias', url: 'https://www.dn.pt/rss/ultima-hora.xml' },
  { name: 'Público', url: 'https://feeds.feedburner.com/PublicoRSS' },
  { name: 'TSF Últimas', url: 'https://www.tsf.pt/rss/ultima-hora.xml' },
  { name: 'Rádio Renascença', url: 'https://rr.sapo.pt/rss/rssultima.xml' }
];

export default function App() {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [audioSource, setAudioSource] = useState<'circuito' | 'marcoense' | 'local'>('circuito');
  const [currentSong, setCurrentSong] = useState('Rádio Circuito Interno');
  const [error, setError] = useState<string | null>(null);
  const [carMode, setCarMode] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [news, setNews] = useState<string[]>([]);
  const [nextShowText, setNextShowText] = useState<string>('');
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Calcular próximo programa em direto
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const currentDay = now.getDay();
      const currentHour = now.getHours();
      
      let nextShow = null;
      let minDiff = Infinity;

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDay = (currentDay + dayOffset) % 7;
        
        for (const show of SPECIAL_SHOWS) {
          if (show.days.includes(targetDay)) {
            if (dayOffset === 0 && currentHour >= show.endHour) continue;
            
            let diffHours = (dayOffset * 24) + (show.startHour - currentHour);
            if (diffHours < 0) diffHours += 24;
            
            if (diffHours < minDiff) {
              minDiff = diffHours;
              nextShow = { ...show, diffHours };
            }
          }
        }
      }

      if (nextShow) {
        const hours = Math.floor(nextShow.diffHours);
        const mins = Math.floor((nextShow.diffHours - hours) * 60);
        setNextShowText(`${hours}h : ${mins < 10 ? '0' : ''}${mins}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch das notícias RSS
  useEffect(() => {
    const fetchNews = async () => {
      try {
        let allTitles: string[] = [];
        for (const feed of RSS_FEEDS) {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}`);
          const data = await res.json();
          if (data.items) {
            const titles = data.items.slice(0, 3).map((item: any) => `${feed.name}: ${item.title}`);
            allTitles = [...allTitles, ...titles];
          }
        }
        if (allTitles.length > 0) setNews(allTitles);
      } catch (err) {
        console.error("Erro ao carregar notícias:", err);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Now Playing Metadata
  const fetchNowPlaying = async () => {
    try {
      const response = await fetch("https://api.zeno.fm/mounts/metadata/subscribe/f326190m038uv");
      if (response.ok) {
        const reader = response.body?.getReader();
        if (reader) {
          const { value } = await reader.read();
          const text = new TextDecoder().decode(value);
          if (text) {
            try {
              const data = JSON.parse(text);
              if (data.streamTitle) setCurrentSong(data.streamTitle);
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (e) {
      console.log("Erro ao carregar metadata:", e);
    }
  };

  useEffect(() => {
    if (audioSource === 'circuito' && playing) {
      fetchNowPlaying();
      const interval = setInterval(fetchNowPlaying, 15000);
      return () => clearInterval(interval);
    }
  }, [playing, audioSource]);

  // Função Toggle com recriação de áudio nativo para iOS Safari
  const toggle = async (selectedSource?: 'circuito' | 'marcoense' | 'local') => {
    const sourceToPlay = selectedSource || audioSource;

    if (playing && !selectedSource) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      setPlaying(false);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      setAudioSource(sourceToPlay);

      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeAttribute('src');
        audioRef.current.load();
      }

      const targetUrl = sourceToPlay === 'marcoense' 
        ? RADIO_MARCOENSE_STREAM 
        : (sourceToPlay === 'local' ? "/musica.mp3" : STREAM_URL);

      const newAudio = new Audio(targetUrl);
      newAudio.volume = muted ? 0 : volume;
      newAudio.muted = muted;

      audioRef.current = newAudio;

      await newAudio.play();
      setPlaying(true);

      if (sourceToPlay === 'circuito') fetchNowPlaying();
    } catch (e) {
      console.error("Erro iOS Safari Audio:", e);
      setPlaying(false);
      setError("Não foi possível carregar a emissão. Verifica a tua ligação.");
    } finally {
      setLoading(false);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val === 0) setMuted(true);
    else setMuted(false);
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-zinc-950 text-zinc-100' : 'bg-zinc-100 text-zinc-900'} transition-colors duration-300 font-sans pb-12`}>
      
      {/* Header Bar */}
      <header className="border-b border-zinc-800/50 bg-zinc-900/40 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold tracking-tight text-lg leading-none">RÁDIO CIRCUITO INTERNO</h1>
              <span className="text-xs text-orange-500 font-medium tracking-wide uppercase">Emissão Online</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCarMode(!carMode)} 
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${carMode ? 'bg-amber-500 text-zinc-950 shadow-lg shadow-amber-500/20' : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'}`}
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

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 pt-6 space-y-6">

        {/* Mensagem de Erro */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Player Principal */}
        <div className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900/90 to-zinc-950 p-6 sm:p-8 shadow-2xl ${carMode ? 'py-12' : ''}`}>
          
          {/* Seleção de Fonte */}
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => toggle('circuito')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${audioSource === 'circuito' ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30' : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'}`}
            >
              RÁDIO 24/7
            </button>
            <button
              onClick={() => toggle('marcoense')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${audioSource === 'marcoense' ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-zinc-800/50 hover:bg-zinc-800 text-zinc-400'}`}
            >
              📻 DIRETO RÁDIO MARCOENSE
            </button>
          </div>

          {/* Arte do Player & Título */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className={`relative rounded-2xl overflow-hidden bg-zinc-800 border border-zinc-700/50 flex items-center justify-center shadow-2xl transition-all duration-300 ${carMode ? 'w-48 h-48' : 'w-40 h-40'}`}>
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/20 to-transparent" />
              <Radio className={`text-orange-500 ${carMode ? 'w-24 h-24' : 'w-20 h-20'} ${playing ? 'animate-pulse' : ''}`} />
            </div>

            <div>
              <h2 className="text-xl font-bold tracking-tight">{audioSource === 'marcoense' ? 'Rádio Marcoense (Em Direto)' : currentSong}</h2>
              <p className="text-sm text-zinc-400 mt-1">
                {audioSource === 'marcoense' ? 'Sinal 93.3 FM' : 'Circuito Interno – A Sua Emissora'}
              </p>
            </div>

            {/* Botão Play / Pause */}
            <button
              onClick={() => toggle()}
              disabled={loading}
              className={`rounded-full bg-gradient-to-tr from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white flex items-center justify-center transition-all shadow-xl shadow-orange-600/30 active:scale-95 ${carMode ? 'w-28 h-28' : 'w-20 h-20'}`}
            >
              {loading ? (
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              ) : playing ? (
                <Pause className={`${carMode ? 'w-12 h-12' : 'w-8 h-8'}`} />
              ) : (
                <Play className={`${carMode ? 'w-12 h-12' : 'w-8 h-8'} ml-1`} />
              )}
            </button>

            {/* Controlo de Volume */}
            {!carMode && (
              <div className="flex items-center gap-3 w-full max-w-xs pt-4">
                <button onClick={toggleMute} className="text-zinc-400 hover:text-white transition-colors">
                  {muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
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

        {/* Ticker de Notícias RSS */}
        {news.length > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl px-4 py-3 overflow-hidden">
            <div className="flex items-center gap-3">
              <span className="bg-orange-500/10 text-orange-400 text-xs font-bold px-2.5 py-1 rounded-md shrink-0 border border-orange-500/20">ÚLTIMAS</span>
              <div className="whitespace-nowrap overflow-hidden text-sm text-zinc-300">
                <div className="inline-block animate-marquee">{news.join('  •  ')}</div>
              </div>
            </div>
          </div>
        )}

        {/* Programação */}
        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-500" />
              Programação
            </h3>
            {nextShowText && (
              <span className="text-xs text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-400" /> Direto em {nextShowText}
              </span>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {SCHEDULE.map((item) => (
              <div key={item.id} className="bg-zinc-900/80 border border-zinc-800/60 p-4 rounded-2xl hover:border-zinc-700 transition-all">
                <span className="text-xs font-semibold text-orange-400 block mb-1">{item.day} • {item.time}</span>
                <h4 className="font-bold text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}