import { useEffect, useRef, useState } from "react";
import { Pause, Volume2, VolumeX, Mail, Phone, Radio, Loader2, Clock, Music, Globe } from "lucide-react";

// Stream oficial do AzuraCast
const STREAM_URL = "https://azuracast.rhoster.pt/listen/circuito_interno/radio.mp3";
// API para ler a música a tocar em tempo real
const API_NOWPLAYING = "https://azuracast.rhoster.pt/api/nowplaying/circuito_interno";

const SOCIALS = {
  facebook: "https://www.facebook.com/share/18uJNixTTr/",
  instagram: "https://www.instagram.com/circuitointernoradio",
  spotify: "https://open.spotify.com/playlist/0swmTL4K4uP7VqrooqJX6z",
  youtube: "https://youtube.com/@circuitointernoradio",
  website: "https://circuitointerno.pt",
};

const SHOWS_CONFIG = [
  { name: "Circuito Interno - Romântico", days: [2, 3, 4], startHour: 22, startMin: 0, endHour: 24, endMin: 0, label: "Terça a Quinta - 22h00 às 24h00" },
  { name: "Circuito Interno - Rock & Indie Alternativo", days: [5], startHour: 22, startMin: 0, endHour: 24, endMin: 0, label: "Sexta - 22h00 às 24h00" },
  { name: "Circuito Interno - Grandes Clássicos", days: [6], startHour: 13, startMin: 0, endHour: 15, endMin: 0, label: "Sábado - 13h00 às 15h00" }
];

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
  
  const [isLive, setIsLive] = useState(false);
  const [currentShowName, setCurrentShowName] = useState("");
  const [countdownText, setCountdownText] = useState("");
  const [currentSong, setCurrentSong] = useState<SongInfo | null>(null);

  const fetchNowPlaying = async () => {
    try {
      const res = await fetch(API_NOWPLAYING);
      if (res.ok) {
        const data = await res.json();
        if (data && data.now_playing && data.now_playing.song) {
          setCurrentSong({
            title: data.now_playing.song.title || "Música no Ar",
            artist: data.now_playing.song.artist || "Circuito Interno",
            art: data.now_playing.song.art || ""
          });
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

    const timer = setInterval(updateStreamStatus, 1000);
    const songTimer = setInterval(fetchNowPlaying, 10000);

    return () => {
      clearInterval(timer);
      clearInterval(songTimer);
      a.pause();
      a.removeEventListener("playing", handlePlaying);
      a.removeEventListener("pause", handlePause);
      a.removeEventListener("waiting", handleWaiting);
      a.removeEventListener("canplay", handleCanPlay);
      a.removeEventListener("error", handleError);
    };
  }, []);

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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-100 flex flex-col antialiased">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col px-6">
        
        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-xs text-red-200">
            {error}
          </div>
        )}

        <header className="pt-8 pb-4 text-center shrink-0 flex flex-col items-center">
          
          <div className="mb-3">
            <img 
              src="/logo.png" 
              alt="Circuito Interno Logo" 
              className="h-12 w-auto object-contain drop-shadow-[0_0_15px_rgba(249,115,22,0.4)]" 
            />
          </div>

          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition-all ${
            isLive ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          }`}>
            <span className="relative flex size-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isLive ? "bg-red-500/60" : "bg-amber-500/60"} ${playing ? "animate-ping" : ""}`}></span>
              <span className={`relative inline-flex size-2 rounded-full ${isLive ? "bg-red-500" : "bg-amber-500"}`}></span>
            </span>
            {isLive ? "Programa Em Direto" : "Emissão 24/7"}
          </div>

          <h1 className="mt-2 text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-neutral-300 bg-clip-text text-transparent">
            Circuito Interno
          </h1>
          
          <p className="mt-1 text-xs font-medium tracking-wide transition-all duration-300">
            {isLive ? (
              <span className="text-red-400 font-semibold flex items-center justify-center gap-1">
                🔴 Em direto na Rádio Marcoense · 93.3 FM
              </span>
            ) : (
              <span className="text-neutral-400">
                A tua rádio online 24h/7d
              </span>
            )}
          </p>

          {/* Nome e Créditos do Autor */}
          <p className="mt-1.5 text-[11px] font-medium text-amber-500/90 tracking-wider uppercase">
            Produção e apresentação: Paulo da Rocha Teixeira
          </p>
        </header>

        <section className="flex-1 flex flex-col items-center justify-center py-4">
          
          {/* Botão de Play */}
          <div className="relative">
            <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
              playing 
                ? isLive ? "opacity-50 scale-110 bg-gradient-to-br from-red-600 via-orange-500 to-pink-600" : "opacity-40 scale-105 bg-gradient-to-br from-amber-500 to-orange-600"
                : "opacity-20 scale-90 bg-white/10"
            }`} />
            
            <button
              onClick={toggle}
              className={`relative size-40 rounded-full flex items-center justify-center shadow-2xl transition duration-300 active:scale-95 hover:scale-[1.01] cursor-pointer ${
                isLive ? "bg-red-600 text-white" : "bg-amber-500 text-black"
              }`}
            >
              {loading ? (
                <Loader2 className="size-14 animate-spin" strokeWidth={1.5} />
              ) : playing ? (
                <Pause className="size-14" strokeWidth={1.5} fill="currentColor" />
              ) : isLive ? (
                <Radio className="size-14" strokeWidth={1.5} />
              ) : (
                <Music className="size-14" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Cartão "A Tocar Agora" */}
          <div className="mt-6 w-full max-w-xs bg-white/[0.03] border border-white/10 p-3.5 rounded-2xl flex items-center gap-3.5 shadow-lg backdrop-blur-md">
            {currentSong && currentSong.art ? (
              <img 
                src={currentSong.art} 
                alt="Capa" 
                className="size-12 rounded-xl object-cover shrink-0 shadow-md border border-white/10" 
              />
            ) : (
              <div className="size-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Music className="size-6" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
                {isLive ? "A Transmitir" : "A Tocar Agora"}
              </div>
              <div className="text-xs font-bold text-white truncate mt-0.5">
                {isLive ? currentShowName : (currentSong?.title || "Circuito Interno")}
              </div>
              <div className="text-[11px] text-neutral-400 truncate font-medium">
                {isLive ? "Rádio Marcoense · 93.3 FM" : (currentSong?.artist || "Rádio Circuito Interno")}
              </div>
            </div>
          </div>

          {/* Controlo de Volume */}
          <div className="mt-4 w-full max-w-xs bg-white/[0.02] border border-white/5 p-3 rounded-xl">
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
                className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-amber-500 cursor-pointer"
              />
              <span className="text-xs tabular-nums text-neutral-400 w-6 text-right font-medium">
                {Math.round((muted ? 0 : volume) * 100)}
              </span>
            </div>
          </div>

          {!isLive && (
            <div className="mt-4 w-full max-w-xs bg-amber-500/[0.03] border border-amber-500/10 p-3.5 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-medium tracking-wide uppercase text-[10px]">
                <Clock className="size-3.5" /> Próximo programa em direto na Rádio Marcoense:
              </div>
              <div className="text-base font-mono font-bold text-neutral-200 mt-1.5 tracking-wider tabular-nums">
                {countdownText || "A carregar..."}
              </div>
            </div>
          )}
        </section>

        {/* 5 Canais */}
        <section className="py-3 shrink-0">
          <div className="text-center text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 mb-2.5">
            Canais & Redes Sociais
          </div>
          <div className="grid grid-cols-5 gap-1.5 w-full">
            <SocialTile href={SOCIALS.website} name="Web" icon={<Globe className="size-4 text-amber-400" />} />
            <SocialTile href={SOCIALS.instagram} name="Insta" icon={
              <svg viewBox="0 0 24 24" className="size-4 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            } />
            <SocialTile href={SOCIALS.facebook} name="FB" icon={
              <svg viewBox="0 0 24 24" className="size-4 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            } />
            <SocialTile href={SOCIALS.spotify} name="Spotify" icon={
              <svg viewBox="0 0 24 24" className="size-4 text-emerald-400" fill="currentColor">
                <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 1 1-.3-1.4c4.5-1 8.3-.5 11.4 1.3.4.2.5.6.3 1Zm1.5-3.3a.94.94 0 1 1-1.3.3c-3.2-2-8.1-2.5-11.9-1.4a.94.94 0 1 1-.5-1.8c4.3-1.3 9.7-.7 13.4 1.6.5.3.6.9.3 1.3Zm.1-3.4c-3.9-2.3-10.3-2.5-14-1.4a1.12 1.12 0 1 1-.6-2.2c4.3-1.3 11.4-1 15.9 1.6a1.12 1.12 0 1 1-1.2 1.9Z" />
              </svg>
            } />
            <SocialTile href={SOCIALS.youtube} name="YouTube" icon={
              <svg viewBox="0 0 24 24" className="size-4 text-red-500" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 0 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            } />
          </div>
        </section>

        <section className="py-3 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500">Programas em Direto</h2>
            <span className="text-[9px] text-amber-500/80 font-medium">Na Rádio Marcoense 93.3 FM</span>
          </div>
          <div className="space-y-2">
            {SHOWS_CONFIG.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                    <Radio className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-200 truncate">{s.name}</div>
                    <div className="text-[11px] text-neutral-500 truncate mt-0.5">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-3 pb-8 shrink-0">
          <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 mb-2">Contactos do programa</h2>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            <ContactRow icon={<Mail className="size-4" />} label="Email" value="circuitointerno@marcoensefm.com" href="mailto:circuitointerno@marcoensefm.com" />
            <ContactRow icon={<Phone className="size-4" />} label="Telefone / WhatsApp" value="+351 255 000 000" href="tel:+351255000000" />
          </div>
          
          <p className="mt-6 text-center text-[10px] text-neutral-600 font-light tracking-wide">
            © Circuito Interno 2026 · Paulo da Rocha Teixeira
          </p>
        </section>

      </div>
    </div>
  );
}

function SocialTile({ href, name, icon }: { href: string; name: string; icon: React.ReactNode }) {
  return (
    <a 
      href={href} 
      target="_blank" 
      rel="noreferrer" 
      className="flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] py-2 px-0.5 text-neutral-300 hover:text-white hover:bg-white/[0.08] transition duration-200 active:scale-95 shadow-sm"
    >
      {icon}
      <span className="text-[9px] font-bold tracking-tight text-neutral-300 truncate max-w-full">{name}</span>
    </a>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <a href={href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.01] transition active:bg-white/[0.02]">
      <div className="size-7 rounded-md bg-white/5 flex items-center justify-center text-neutral-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase font-bold tracking-wider text-neutral-500">{label}</div>
        <div className="text-xs font-medium text-neutral-300 truncate mt-0.5">{value}</div>
      </div>
    </a>
  );
}