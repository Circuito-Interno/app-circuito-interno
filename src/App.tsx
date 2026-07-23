import { useEffect, useRef, useState } from "react";
import { 
  Pause, Volume2, VolumeX, Mail, Phone, Radio, Loader2, Clock, Music, 
  Globe, ShieldCheck, X, Mic, Send, Moon, Share2, Car, History, Star, MessageCircle
} from "lucide-react";

const STREAM_URL = "https://azuracast.rhoster.pt/listen/circuito_interno/radio.mp3";
const API_NOWPLAYING = "https://azuracast.rhoster.pt/api/nowplaying/circuito_interno";

const SOCIALS = {
  facebook: "https://www.facebook.com/share/18uJNixTTr/",
  instagram: "https://www.instagram.com/circuitointernoradio",
  spotify: "https://open.spotify.com/playlist/0swmTL4K4uP7VqrooqJX6z",
  youtube: "https://youtube.com/@circuitointernoradio",
  website: "https://circuitointerno.pt",
};

const SHOWS_CONFIG = [
  { name: "Circuito Interno - Romântico", days: [2, 3, 4], startHour: 22, startMin: 0, endHour: 24, endMin: 0, label: "Terça a Quinta · 22h00 às 24h00" },
  { name: "Circuito Interno - Rock & Indie Alternativo", days: [5], startHour: 22, startMin: 0, endHour: 24, endMin: 0, label: "Sexta · 22h00 às 24h00" },
  { name: "Circuito Interno - Grandes Clássicos", days: [6], startHour: 13, startMin: 0, endHour: 15, endMin: 0, label: "Sábado · 13h00 às 15h00" }
];

// FEEDS RSS DIREITOS DE JORNAIS PORTUGUESES
const RSS_FEEDS = [
  "https://www.jn.pt/rss/ultimas/",
  "https://www.publico.pt/api/feed/rss/ultimas",
  "https://expresso.pt/blitz/rss"
];

// NOTÍCIA DE ÚLTIMA HORA / DESTAQUE MANUAL (Muda "active: true" para ativar)
const BREAKING_NEWS = {
  active: false,
  text: "🚨 ÚLTIMA HORA: Homenagem especial a Luís Represas hoje na emissão do Circuito Interno."
};

interface SongInfo {
  title: string;
  artist: string;
  art: string;
}

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showSongRequestModal, setShowSongRequestModal] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<number | null>(null);
  const [sleepIntervalId, setSleepIntervalId] = useState<any>(null);
  const [history, setHistory] = useState<SongInfo[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [carMode, setCarMode] = useState(false);
  const [copied, setCopied] = useState(false);

  const [requestSongName, setRequestSongName] = useState("");
  const [requestArtist, setRequestArtist] = useState("");
  const [requestListenerName, setRequestListenerName] = useState("");

  const [isLive, setIsLive] = useState(false);
  const [currentShowName, setCurrentShowName] = useState("");
  const [countdownText, setCountdownText] = useState("");
  const [currentSong, setCurrentSong] = useState<SongInfo | null>(null);

  // ESTADO DAS NOTÍCIAS
  const [newsText, setNewsText] = useState<string>("A carregar as últimas notícias...");

  // BUSCAR NOTÍCIAS EM TEMPO REAL
  const fetchNews = async () => {
    if (BREAKING_NEWS.active) {
      setNewsText(BREAKING_NEWS.text);
      return;
    }

    try {
      const targetRss = encodeURIComponent(RSS_FEEDS[Math.floor(Math.random() * RSS_FEEDS.length)]);
      const res = await fetch(`https://api.allorigins.win/get?url=${targetRss}&nocache=${Date.now()}`);
      
      if (res.ok) {
        const data = await res.json();
        const parser = new DOMParser();
        const xml = parser.parseFromString(data.contents, "text/xml");
        const items = xml.querySelectorAll("item title");

        if (items.length > 0) {
          const titles: string[] = [];
          items.forEach((item, index) => {
            if (index < 6 && item.textContent) {
              titles.push(item.textContent.trim());
            }
          });
          setNewsText(`📰 ÚLTIMAS NOTÍCIAS: ${titles.join("  ✦  ")}`);
        }
      }
    } catch (e) {
      console.error("Erro ao procurar notícias RSS:", e);
      setNewsText("📢 CIRCUITO INTERNO: A sua rádio online 24/7 com a melhor seleção musical!");
    }
  };

  const fetchNowPlaying = async () => {
    try {
      const res = await fetch(API_NOWPLAYING);
      if (res.ok) {
        const data = await res.json();
        if (data && data.now_playing && data.now_playing.song) {
          const songTitle = data.now_playing.song.title || "Música no Ar";
          const songArtist = data.now_playing.song.artist || "Circuito Interno";
          
          const mainTitle = isLive ? `Circuito Interno · ${currentShowName}` : "Circuito Interno";
          const subtitleArtist = isLive ? "Rádio Circuito Interno" : `${songArtist} - ${songTitle}`;
          const artworkUrl = data.now_playing.song.art || "/logo.png";

          const newSong = {
            title: songTitle,
            artist: songArtist,
            art: data.now_playing.song.art || ""
          };

          setCurrentSong((prev) => {
            if (prev && (prev.title !== newSong.title || prev.artist !== newSong.artist)) {
              setHistory((h) => [prev, ...h.filter(s => s.title !== prev.title)].slice(0, 5));
            }
            return newSong;
          });

          if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: mainTitle,
              artist: subtitleArtist,
              album: "Emissão 24/7",
              artwork: [{ src: artworkUrl, sizes: "512x512", type: "image/png" }]
            });
          }
        }
      }
    } catch (e) {
      console.error("Erro ao procurar metadados:", e);
    }
  };

  const updateStreamStatus = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeInMins = currentHour * 60 + currentMin;

    let liveDetected = false;
    let activeShowTitle = "";

    SHOWS_CONFIG.forEach(show => {
      if (show.days.includes(currentDay)) {
        const startTotal = show.startHour * 60 + show.startMin;
        const endTotal = show.endHour * 60 + show.endMin;
        if (currentTimeInMins >= startTotal && currentTimeInMins < endTotal) {
          liveDetected = true;
          activeShowTitle = show.name;
        }
      }
    });

    setIsLive(liveDetected);
    setCurrentShowName(activeShowTitle);

    if (liveDetected) {
      setCountdownText("");
      return;
    }

    let minDiff = Infinity;
    SHOWS_CONFIG.forEach(show => {
      show.days.forEach(day => {
        let dayDiff = day - currentDay;
        if (dayDiff < 0 || (dayDiff === 0 && currentTimeInMins >= (show.startHour * 60 + show.startMin))) {
          dayDiff += 7;
        }

        const targetDate = new Date(now);
        targetDate.setDate(now.getDate() + dayDiff);
        targetDate.setHours(show.startHour, show.startMin, 0, 0);

        const diffMs = targetDate.getTime() - now.getTime();
        if (diffMs < minDiff) {
          minDiff = diffMs;
        }
      });
    });

    if (minDiff !== Infinity) {
      const totalSecs = Math.floor(minDiff / 1000);
      const days = Math.floor(totalSecs / (3600 * 24));
      const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;

      let text = "";
      if (days > 0) text += `${days}d `;
      text += `${hours.toString().padStart(2, '0')}h : ${mins.toString().padStart(2, '0')}m : ${secs.toString().padStart(2, '0')}s`;
      setCountdownText(text);
    }
  };

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const a = audioRef.current;
    a.volume = muted ? 0 : volume;

    const handlePlaying = () => { setPlaying(true); setLoading(false); setError(null); };
    const handlePause = () => setPlaying(false);
    const handleWaiting = () => setLoading(true);
    const handleCanPlay = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setPlaying(false);
      setError("A carregar o sinal da emissão...");
    };

    a.addEventListener("playing", handlePlaying);
    a.addEventListener("pause", handlePause);
    a.addEventListener("waiting", handleWaiting);
    a.addEventListener("canplay", handleCanPlay);
    a.addEventListener("error", handleError);

    updateStreamStatus();
    fetchNowPlaying();
    fetchNews();

    const timer = setInterval(updateStreamStatus, 1000);
    const songTimer = setInterval(fetchNowPlaying, 10000);
    const newsTimer = setInterval(fetchNews, 3600000); // Atualiza notícias a cada 1 hora

    return () => {
      clearInterval(timer);
      clearInterval(songTimer);
      clearInterval(newsTimer);
      a.pause();
      a.removeEventListener("playing", handlePlaying);
      a.removeEventListener("pause", handlePause);
      a.removeEventListener("waiting", handleWaiting);
      a.removeEventListener("canplay", handleCanPlay);
      a.removeEventListener("error", handleError);
    };
  }, []);

  const startSleepTimer = (minutes: number) => {
    if (sleepIntervalId) clearInterval(sleepIntervalId);
    
    if (minutes === 0) {
      setSleepTimer(null);
      setShowSleepModal(false);
      return;
    }

    setSleepTimer(minutes);
    setShowSleepModal(false);

    let secondsLeft = minutes * 60;
    const interval = setInterval(() => {
      secondsLeft -= 1;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.src = "";
        }
        setPlaying(false);
        setSleepTimer(null);
      } else {
        setSleepTimer(Math.ceil(secondsLeft / 60));
      }
    }, 1000);

    setSleepIntervalId(interval);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setMuted(false);
    if (audioRef.current) {
      audioRef.current.volume = newVol;
      audioRef.current.muted = false;
    }
  };

  const handleMuteToggle = () => {
    const nextMuted = !muted;
    setMuted(nextMuted);
    if (audioRef.current) {
      audioRef.current.muted = nextMuted;
      audioRef.current.volume = nextMuted ? 0 : volume;
    }
  };

  const toggle = async () => {
    const a = audioRef.current;
    if (!a) return;

    if (playing) {
      a.pause();
      a.src = ""; 
      setPlaying(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);
      a.src = STREAM_URL + "?nocache=" + new Date().getTime();
      a.volume = muted ? 0 : volume;
      a.muted = muted;
      await a.play();
      fetchNowPlaying();
    } catch (e) {
      console.error(e);
      setError("Erro ao iniciar o sinal da rádio.");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: "Rádio Circuito Interno",
        text: "Estou a ouvir a Rádio Circuito Interno em direto! Vem ouvir também:",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sendSongRequestToWhatsApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestSongName || !requestArtist) return;

    const message = `Olá Paulo! Sou o/a ${requestListenerName || "Ouvinte"} e gostaria de pedir a música: "${requestSongName}" de ${requestArtist}. Obrigado!`;
    const whatsappUrl = `https://wa.me/351963350373?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
    setShowSongRequestModal(false);
    setRequestSongName("");
    setRequestArtist("");
    setRequestListenerName("");
  };

  if (carMode) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-between p-6 select-none">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="size-6 text-amber-500" />
            <span className="font-extrabold text-sm uppercase tracking-wider text-amber-500">Modo Carro</span>
          </div>
          <button 
            onClick={() => setCarMode(false)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-xl font-bold text-xs uppercase cursor-pointer"
          >
            Sair
          </button>
        </div>

        <div className="text-center space-y-3 my-auto">
          <div className="text-2xl font-black text-amber-400">Circuito Interno</div>
          <div className="text-xl font-bold text-white truncate max-w-xs mx-auto">
            {isLive ? currentShowName : (currentSong?.title || "Música no Ar")}
          </div>
          <div className="text-base text-neutral-400 font-medium">
            {isLive ? "Rádio Circuito Interno" : (currentSong?.artist || "Rádio Circuito Interno")}
          </div>
        </div>

        <button
          onClick={toggle}
          className={`w-full py-12 rounded-3xl font-black text-2xl flex items-center justify-center gap-4 transition active:scale-95 shadow-2xl cursor-pointer ${
            isLive ? "bg-red-600 text-white" : "bg-amber-500 text-black"
          }`}
        >
          {loading ? (
            <Loader2 className="size-16 animate-spin" />
          ) : playing ? (
            <>
              <Pause className="size-12 fill-current" /> PARAR
            </>
          ) : (
            <>
              <Radio className="size-12" /> OUVIR EM DIRETO
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[#080808] text-neutral-100 flex flex-col antialiased selection:bg-amber-500 selection:text-black w-full overflow-x-hidden lg:overflow-hidden">
      
      {/* CONTAINER "SINGLE SCREEN" NO PC */}
      <div className="w-full max-w-[1700px] mx-auto flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-3 lg:py-4 justify-between">
        
        {error && (
          <div className="mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Barra Superior de Ações Rápidas */}
        <div className="w-full flex items-center justify-between text-neutral-400 text-xs font-medium pb-2.5 border-b border-white/5 shrink-0">
          <button 
            onClick={() => setCarMode(true)} 
            className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1.5 rounded-lg hover:text-white hover:border-amber-500/40 transition cursor-pointer"
            title="Modo Carro"
          >
            <Car className="size-3.5 text-amber-400" />
            <span className="text-xs font-bold uppercase">Modo Carro</span>
          </button>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSongRequestModal(true)} 
              className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-3 py-1.5 rounded-lg hover:bg-amber-500 hover:text-black transition cursor-pointer font-bold text-xs uppercase"
              title="Pedir Música"
            >
              <MessageCircle className="size-3.5" />
              <span>Pedir Música</span>
            </button>

            {history.length > 0 && (
              <button 
                onClick={() => setShowHistoryModal(true)} 
                className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:text-white transition cursor-pointer"
                title="Músicas Recentes"
              >
                <History className="size-4 text-amber-400" />
              </button>
            )}

            <button 
              onClick={() => setShowSleepModal(true)} 
              className={`flex items-center gap-1.5 p-1.5 bg-white/5 border rounded-lg transition cursor-pointer ${
                sleepTimer !== null ? "border-amber-500 text-amber-400" : "border-white/10 hover:text-white"
              }`}
              title="Temporizador de Adormecer"
            >
              <Moon className="size-4" />
              {sleepTimer !== null && <span className="text-xs font-mono font-bold">{sleepTimer}m</span>}
            </button>

            <button 
              onClick={handleShare} 
              className="p-1.5 bg-white/5 border border-white/10 rounded-lg hover:text-white transition cursor-pointer relative"
              title="Partilhar"
            >
              <Share2 className="size-4 text-amber-400" />
              {copied && (
                <span className="absolute -bottom-7 right-0 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  Copiado!
                </span>
              )}
            </button>
          </div>
        </div>

        {/* GRELHA COMPACTA DE 2 COLUNAS */}
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center flex-1 my-auto py-2">
          
          {/* PAINEL ESQUERDO: LEITOR E CONTROLOS */}
          <div className="lg:col-span-6 flex flex-col items-center justify-center text-center space-y-3.5 bg-white/[0.01] border border-white/5 p-4 sm:p-6 lg:p-8 rounded-3xl shadow-2xl backdrop-blur-md w-full h-full justify-between">
            
            {/* Header / Logo */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
                <img 
                  src="/logo.png" 
                  alt="Circuito Interno Logo" 
                  className="relative h-14 sm:h-18 lg:h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(249,115,22,0.35)]" 
                />
              </div>

              <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mt-0.5">
                Circuito Interno
              </h1>

              <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-lg ${
                isLive 
                  ? "border-red-500/40 bg-red-500/15 text-red-400" 
                  : "border-amber-500/30 bg-amber-500/10 text-amber-400"
              }`}>
                <span className="relative flex size-2">
                  <span className={`absolute inline-flex h-full w-full rounded-full ${isLive ? "bg-red-500/80" : "bg-amber-500/80"} ${playing ? "animate-ping" : ""}`}></span>
                  <span className={`relative inline-flex size-2 rounded-full ${isLive ? "bg-red-500" : "bg-amber-500"}`}></span>
                </span>
                {isLive ? `Em Direto · ${currentShowName}` : "Emissão Online 24/7"}
              </div>
            </div>

            {/* Botão Principal Play */}
            <div className="relative py-1 flex items-center justify-center">
              <button
                onClick={toggle}
                className={`relative size-36 sm:size-44 lg:size-48 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 hover:scale-[1.02] cursor-pointer border border-white/10 z-10 ${
                  playing ? "button-pulsing" : ""
                } ${
                  isLive 
                    ? "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-red-900/40" 
                    : "bg-gradient-to-br from-amber-400 to-amber-500 text-black shadow-amber-500/20"
                }`}
              >
                {loading ? (
                  <Loader2 className="size-14 sm:size-18 animate-spin" strokeWidth={1.5} />
                ) : playing ? (
                  <Pause className="size-14 sm:size-18 fill-current" strokeWidth={1} />
                ) : isLive ? (
                  <Radio className="size-14 sm:size-18" strokeWidth={1.5} />
                ) : (
                  <Music className="size-14 sm:size-18 ml-1" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {/* Cartão "A Tocar Agora" */}
            <div className="w-full bg-white/[0.04] border border-white/10 p-3 sm:p-4 rounded-2xl flex items-center gap-3.5 shadow-xl backdrop-blur-xl">
              {currentSong && currentSong.art ? (
                <img 
                  src={currentSong.art} 
                  alt="Capa" 
                  className="size-12 sm:size-14 rounded-xl object-cover shrink-0 shadow-md border border-white/10" 
                />
              ) : (
                <div className="size-12 sm:size-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                  <Music className="size-7" />
                </div>
              )}

              <div className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                  <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                  {isLive ? "No Ar Agora" : "A Tocar Agora"}
                </div>
                <div className="text-xs sm:text-base font-bold text-white truncate mt-0.5">
                  {isLive ? currentShowName : (currentSong?.title || "Circuito Interno")}
                </div>
                <div className="text-[11px] sm:text-xs text-neutral-400 truncate font-medium">
                  {isLive ? "Rádio Circuito Interno" : (currentSong?.artist || "Rádio Circuito Interno")}
                </div>
              </div>
            </div>

            {/* TICKER DE NOTÍCIAS EM TEMPO REAL */}
            <div className={`w-full overflow-hidden rounded-xl py-3 px-2 relative shadow-inner border transition-colors ${
              BREAKING_NEWS.active 
                ? "bg-red-950/40 border-red-500/50 text-red-200" 
                : "bg-amber-500/[0.05] border-amber-500/20 text-amber-300"
            }`}>
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#080808] to-transparent z-10 pointer-events-none" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#080808] to-transparent z-10 pointer-events-none" />
              <div className="animate-ticker text-xs sm:text-sm uppercase tracking-wider font-extrabold">
                <span>{newsText}&nbsp;&nbsp;✦&nbsp;&nbsp;</span>
                <span>{newsText}&nbsp;&nbsp;✦&nbsp;&nbsp;</span>
              </div>
            </div>

            {/* Controlo de Volume */}
            <div className="w-full bg-white/[0.02] border border-white/5 p-3 rounded-xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleMuteToggle} 
                  className="text-neutral-400 hover:text-white transition cursor-pointer"
                  title={muted ? "Ativar som" : "Desativar som"}
                >
                  {muted || volume === 0 ? <VolumeX className="size-4 text-red-400" /> : <Volume2 className="size-4" />}
                </button>
                <input
                  type="range" 
                  min={0} 
                  max={1} 
                  step={0.01} 
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-white/10 accent-amber-500 cursor-pointer"
                />
                <span className="text-xs tabular-nums text-neutral-400 w-8 text-right font-medium">
                  {Math.round((muted ? 0 : volume) * 100)}%
                </span>
              </div>
            </div>

            {!isLive && (
              <div className="w-full bg-amber-500/[0.04] border border-amber-500/15 p-2.5 rounded-xl text-center backdrop-blur-md">
                <div className="flex items-center justify-center gap-1.5 text-[10px] sm:text-xs text-amber-400 font-bold tracking-widest uppercase">
                  <Clock className="size-3.5" /> Próximo programa em Direto:
                </div>
                <div className="text-sm sm:text-lg font-mono font-bold text-neutral-100 mt-0.5 tracking-wider tabular-nums">
                  {countdownText || "A carregar..."}
                </div>
              </div>
            )}
          </div>

          {/* PAINEL DIREITO: INFORMAÇÕES E PROGRAMAÇÃO */}
          <div className="lg:col-span-6 flex flex-col justify-between space-y-3.5 w-full h-full">
            
            {/* Canais Oficiais */}
            <div className="bg-white/[0.01] border border-white/5 p-4 sm:p-5 rounded-2xl w-full">
              <div className="text-left text-[11px] uppercase font-extrabold tracking-[0.2em] text-neutral-500 mb-2.5">
                Canais Oficiais
              </div>
              <div className="grid grid-cols-5 gap-2.5 w-full">
                <SocialTile href={SOCIALS.website} icon={<Globe className="size-5 sm:size-6 text-amber-400" />} />
                <SocialTile href={SOCIALS.instagram} icon={
                  <svg viewBox="0 0 24 24" className="size-5 sm:size-6 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                } />
                <SocialTile href={SOCIALS.facebook} icon={
                  <svg viewBox="0 0 24 24" className="size-5 sm:size-6 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                } />
                <SocialTile href={SOCIALS.spotify} icon={
                  <svg viewBox="0 0 24 24" className="size-5 sm:size-6 text-emerald-400" fill="currentColor">
                    <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 1 1-.3-1.4c4.5-1 8.3-.5 11.4 1.3.4.2.5.6.3 1Zm1.5-3.3a.94.94 0 1 1-1.3.3c-3.2-2-8.1-2.5-11.9-1.4a.94.94 0 1 1-.5-1.8c4.3-1.3 9.7-.7 13.4 1.6.5.3.6.9.3 1.3Zm.1-3.4c-3.9-2.3-10.3-2.5-14-1.4a1.12 1.12 0 1 1-.6-2.2c4.3-1.3 11.4-1 15.9 1.6a1.12 1.12 0 1 1-1.2 1.9Z" />
                  </svg>
                } />
                <SocialTile href={SOCIALS.youtube} icon={
                  <svg viewBox="0 0 24 24" className="size-5 sm:size-6 text-red-600" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                } />
              </div>
            </div>

            {/* Programação em Direto */}
            <div className="bg-white/[0.01] border border-white/5 p-4 sm:p-5 rounded-2xl w-full">
              <div className="text-left text-[11px] uppercase font-extrabold tracking-[0.2em] text-neutral-500 mb-2.5">
                Programação em Direto
              </div>
              <div className="space-y-2">
                {SHOWS_CONFIG.map((s) => (
                  <div 
                    key={s.name} 
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 transition duration-300 ${
                      isLive && currentShowName === s.name
                        ? "border-red-500/50 bg-red-500/10 shadow-lg shadow-red-500/5"
                        : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isLive && currentShowName === s.name ? "bg-red-500 text-white animate-pulse" : "bg-white/5 text-amber-400"
                      }`}>
                        <Radio className="size-4" />
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="text-xs sm:text-sm font-bold text-neutral-100 truncate">{s.name}</div>
                        <div className="text-[11px] sm:text-xs text-neutral-400 truncate mt-0.5">{s.label}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 p-2.5 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] flex items-center justify-center gap-2 text-center">
                <Mic className="size-4 text-amber-400 shrink-0" />
                <div className="text-xs text-neutral-300">
                  <span className="text-neutral-500">Produção e apresentação: </span>
                  <span className="font-bold text-amber-400">Paulo da Rocha Teixeira</span>
                </div>
              </div>
            </div>

            {/* Parceiros & Apoios */}
            <div className="bg-white/[0.01] border border-white/5 p-4 sm:p-5 rounded-2xl w-full">
              <div className="text-left text-[11px] uppercase font-extrabold tracking-[0.2em] text-neutral-500 mb-2.5">
                Parceiros & Apoios
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div className="h-12 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:bg-white/5 transition duration-300 cursor-pointer">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Star className="size-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wide">Espaço Patrocinador</span>
                  </div>
                </div>
                <div className="h-12 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-center grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:bg-white/5 transition duration-300 cursor-pointer">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <Star className="size-3.5" />
                    <span className="text-xs font-bold uppercase tracking-wide">Espaço Patrocinador</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Contactos */}
            <div className="bg-white/[0.01] border border-white/5 p-4 sm:p-5 rounded-2xl w-full">
              <div className="text-left text-[11px] uppercase font-extrabold tracking-[0.2em] text-neutral-500 mb-2.5">
                Contactos do Programa
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5 overflow-hidden text-left">
                <ContactRow 
                  icon={<Mail className="size-4 text-amber-400" />} 
                  label="Email Oficial" 
                  value="circuitointernoproducoes@gmail.com" 
                  href="mailto:circuitointernoproducoes@gmail.com" 
                />
                <ContactRow 
                  icon={<Phone className="size-4 text-emerald-400" />} 
                  label="WhatsApp Directo" 
                  value="+351 963 350 373" 
                  href="https://wa.me/351963350373?text=Ol%C3%A1%20Paulo!%20Estou%20a%20ouvir%20o%20Circuito%20Interno." 
                />
              </div>
            </div>

          </div>

        </div>

        {/* Rodapé */}
        <footer className="pt-3 pb-2 text-center text-xs text-neutral-500 font-light tracking-wide border-t border-white/5 shrink-0">
          <div className="font-medium text-neutral-400">© Circuito Interno 2026</div>
          <button 
            onClick={() => setShowPrivacyModal(true)} 
            className="mt-0.5 text-neutral-500 hover:text-amber-400 underline underline-offset-2 transition cursor-pointer"
          >
            Política de Privacidade
          </button>
        </footer>

      </div>

      {/* MODAL: Pedir Música */}
      {showSongRequestModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-xs w-full p-5 text-neutral-300 relative shadow-2xl">
            <button onClick={() => setShowSongRequestModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer">
              <X className="size-5" />
            </button>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-3">
              <MessageCircle className="size-5" /> Pedir uma Música
            </div>
            <p className="text-xs text-neutral-400 mb-4">Envia o teu pedido diretamente para o WhatsApp da rádio:</p>

            <form onSubmit={sendSongRequestToWhatsApp} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Nome da Música *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Hotel California" 
                  value={requestSongName}
                  onChange={(e) => setRequestSongName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">Artista / Banda *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: Eagles" 
                  value={requestArtist}
                  onChange={(e) => setRequestArtist(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-neutral-400 block mb-1">O teu Nome (Opcional)</label>
                <input 
                  type="text" 
                  placeholder="Ex: Maria" 
                  value={requestListenerName}
                  onChange={(e) => setRequestListenerName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <button 
                type="submit"
                className="mt-2 w-full bg-emerald-500 text-black font-bold text-xs py-2.5 rounded-xl hover:bg-emerald-400 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Send className="size-3.5" /> Enviar Pedido no WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Sleep Timer */}
      {showSleepModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-xs w-full p-5 text-neutral-300 relative shadow-2xl text-center">
            <button onClick={() => setShowSleepModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer">
              <X className="size-5" />
            </button>
            <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm mb-4">
              <Moon className="size-5" /> Temporizador de Adormecer
            </div>
            <p className="text-xs text-neutral-400 mb-4">A rádio desliga-se automaticamente após o tempo selecionado:</p>
            <div className="grid grid-cols-2 gap-2">
              {[15, 30, 45, 60].map((mins) => (
                <button
                  key={mins}
                  onClick={() => startSleepTimer(mins)}
                  className="py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white hover:bg-amber-500 hover:text-black transition cursor-pointer"
                >
                  {mins} Minutos
                </button>
              ))}
            </div>
            {sleepTimer !== null && (
              <button
                onClick={() => startSleepTimer(0)}
                className="mt-3 w-full py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold cursor-pointer"
              >
                Desativar Temporizador
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Músicas Recentes */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-xs w-full p-5 text-neutral-300 relative shadow-2xl">
            <button onClick={() => setShowHistoryModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white cursor-pointer">
              <X className="size-5" />
            </button>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-4">
              <History className="size-5" /> Músicas Recentes
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {history.map((song, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-white/5 rounded-xl border border-white/5">
                  {song.art ? (
                    <img src={song.art} alt="" className="size-9 rounded-lg object-cover" />
                  ) : (
                    <div className="size-9 bg-amber-500/10 rounded-lg flex items-center justify-center text-amber-400">
                      <Music className="size-4" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-bold text-white truncate">{song.title}</div>
                    <div className="text-[10px] text-neutral-400 truncate">{song.artist}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Privacidade */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-sm w-full p-5 text-neutral-300 relative shadow-2xl">
            <button onClick={() => setShowPrivacyModal(false)} className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1 cursor-pointer">
              <X className="size-5" />
            </button>
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-3">
              <ShieldCheck className="size-5" /> Política de Privacidade
            </div>
            <div className="text-xs space-y-2.5 text-neutral-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1 font-light">
              <p>A aplicação <strong>Circuito Interno</strong> respeita integralmente a sua privacidade.</p>
              <p>• <strong>Sem recolha de dados:</strong> Não recolhemos ou armazenamos dados pessoais.</p>
              <p>• <strong>Emissão de Áudio:</strong> Transmissão de áudio em direto e metadados das músicas.</p>
              <p>• <strong>Contacto:</strong> circuitointernoproducoes@gmail.com.</p>
            </div>
            <button onClick={() => setShowPrivacyModal(false)} className="mt-5 w-full bg-amber-500 text-black font-bold text-xs py-2.5 rounded-xl hover:bg-amber-400 transition cursor-pointer">
              Compreendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

function SocialTile({ href, icon }: { href: string; icon: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 text-neutral-300 hover:text-white hover:bg-white/[0.08] hover:border-amber-500/30 transition duration-300 active:scale-95 shadow-sm">
      {icon}
    </a>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-white/[0.03] transition active:bg-white/[0.05]">
      <div className="size-8 rounded-xl bg-white/5 flex items-center justify-center text-neutral-400 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">{label}</div>
        <div className="text-xs sm:text-sm font-semibold text-neutral-200 truncate mt-0.5">{value}</div>
      </div>
      <Send className="size-3.5 text-neutral-600 shrink-0" />
    </a>
  );
}