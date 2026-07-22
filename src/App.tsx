import { useEffect, useRef, useState } from "react";
import { Pause, Volume2, VolumeX, Mail, Phone, Radio, Loader2, Clock, Music, Globe, ShieldCheck, X, Mic, Send } from "lucide-react";

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
          const songTitle = data.now_playing.song.title || "Música no Ar";
          const songArtist = data.now_playing.song.artist || "Circuito Interno";
          
          const mainTitle = isLive ? `Circuito Interno · ${currentShowName}` : "Circuito Interno";
          const subtitleArtist = isLive ? "Rádio Marcoense 93.3 FM" : `${songArtist} - ${songTitle}`;
          
          const artworkUrl = data.now_playing.song.art || "/logo.png";

          setCurrentSong({
            title: songTitle,
            artist: songArtist,
            art: data.now_playing.song.art || ""
          });

          if ("mediaSession" in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: mainTitle,
              artist: subtitleArtist,
              album: "Emissão 24/7",
              artwork: [
                { src: artworkUrl, sizes: "512x512", type: "image/png" }
              ]
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
    <div className="min-h-screen bg-[#080808] text-neutral-100 flex flex-col antialiased selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col px-5">
        
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-center text-xs text-red-200 backdrop-blur-md">
            {error}
          </div>
        )}

        {/* Topo / Header */}
        <header className="pt-8 pb-3 text-center shrink-0 flex flex-col items-center gap-2">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
            <img 
              src="/logo.png" 
              alt="Circuito Interno Logo" 
              className="relative h-14 w-auto object-contain drop-shadow-[0_0_20px_rgba(249,115,22,0.35)]" 
            />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white mt-1">
            Circuito Interno
          </h1>

          <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300 shadow-lg ${
            isLive 
              ? "border-red-500/40 bg-red-500/15 text-red-400 shadow-red-500/10" 
              : "border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-amber-500/5"
          }`}>
            <span className="relative flex size-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isLive ? "bg-red-500/80" : "bg-amber-500/80"} ${playing ? "animate-ping" : ""}`}></span>
              <span className={`relative inline-flex size-2 rounded-full ${isLive ? "bg-red-500" : "bg-amber-500"}`}></span>
            </span>
            {isLive ? `Em Direto · ${currentShowName}` : "Emissão Online 24/7"}
          </div>
        </header>

        {/* Leitor Principal */}
        <section className="flex-1 flex flex-col items-center justify-center py-5">
          
          {/* Botão de Play com Pulsação Suave de Som */}
          <div className="relative my-6 flex items-center justify-center">
            <button
              onClick={toggle}
              className={`relative size-40 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 active:scale-95 hover:scale-[1.02] cursor-pointer border border-white/10 z-10 ${
                playing ? "button-pulsing" : ""
              } ${
                isLive 
                  ? "bg-gradient-to-br from-red-500 to-red-700 text-white shadow-red-900/40" 
                  : "bg-gradient-to-br from-amber-400 to-amber-500 text-black shadow-amber-500/20"
              }`}
            >
              {loading ? (
                <Loader2 className="size-14 animate-spin" strokeWidth={1.5} />
              ) : playing ? (
                <Pause className="size-14 fill-current" strokeWidth={1} />
              ) : isLive ? (
                <Radio className="size-14" strokeWidth={1.5} />
              ) : (
                <Music className="size-14 ml-1" strokeWidth={1.5} />
              )}
            </button>
          </div>

          {/* Cartão "A Tocar Agora" em Glassmorphism */}
          <div className="mt-6 w-full max-w-xs bg-white/[0.04] border border-white/10 p-3.5 rounded-2xl flex items-center gap-3.5 shadow-xl backdrop-blur-xl">
            {currentSong && currentSong.art ? (
              <img 
                src={currentSong.art} 
                alt="Capa" 
                className="size-12 rounded-xl object-cover shrink-0 shadow-md border border-white/10" 
              />
            ) : (
              <div className="size-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Music className="size-6" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-amber-400">
                <span className="size-1.5 rounded-full bg-amber-400 animate-ping" />
                {isLive ? "No Ar Agora" : "A Tocar Agora"}
              </div>
              <div className="text-xs font-bold text-white truncate mt-0.5">
                {isLive ? currentShowName : (currentSong?.title || "Circuito Interno")}
              </div>
              <div className="text-[11px] text-neutral-400 truncate font-medium">
                {isLive ? "Rádio Marcoense · 93.3 FM" : (currentSong?.artist || "Rádio Circuito Interno")}
              </div>
            </div>
          </div>

          {/* Controlo de Volume Integrado */}
          <div className="mt-3.5 w-full max-w-xs bg-white/[0.02] border border-white/5 p-3 rounded-xl backdrop-blur-md">
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
                {Math.round((muted ? 0 : volume) * 100)}%
              </span>
            </div>
          </div>

          {!isLive && (
            <div className="mt-3.5 w-full max-w-xs bg-amber-500/[0.04] border border-amber-500/15 p-3.5 rounded-xl text-center backdrop-blur-md">
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-400 font-bold tracking-widest uppercase">
                <Clock className="size-3.5" /> Próximo programa na Rádio Marcoense:
              </div>
              <div className="text-base font-mono font-bold text-neutral-100 mt-1 tracking-wider tabular-nums">
                {countdownText || "A carregar..."}
              </div>
            </div>
          )}
        </section>

        {/* Canais / Redes */}
        <section className="py-3 shrink-0">
          <div className="text-center text-[10px] uppercase font-extrabold tracking-[0.25em] text-neutral-500 mb-2.5">
            Canais Oficiais
          </div>
          <div className="grid grid-cols-5 gap-2 w-full">
            <SocialTile href={SOCIALS.website} icon={<Globe className="size-5 text-amber-400" />} />
            <SocialTile href={SOCIALS.instagram} icon={
              <svg viewBox="0 0 24 24" className="size-5 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            } />
            <SocialTile href={SOCIALS.facebook} icon={
              <svg viewBox="0 0 24 24" className="size-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            } />
            <SocialTile href={SOCIALS.spotify} icon={
              <svg viewBox="0 0 24 24" className="size-5 text-emerald-400" fill="currentColor">
                <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 1 1-.3-1.4c4.5-1 8.3-.5 11.4 1.3.4.2.5.6.3 1Zm1.5-3.3a.94.94 0 1 1-1.3.3c-3.2-2-8.1-2.5-11.9-1.4a.94.94 0 1 1-.5-1.8c4.3-1.3 9.7-.7 13.4 1.6.5.3.6.9.3 1.3Zm.1-3.4c-3.9-2.3-10.3-2.5-14-1.4a1.12 1.12 0 1 1-.6-2.2c4.3-1.3 11.4-1 15.9 1.6a1.12 1.12 0 1 1-1.2 1.9Z" />
              </svg>
            } />
            <SocialTile href={SOCIALS.youtube} icon={
              <svg viewBox="0 0 24 24" className="size-5 text-red-600" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            } />
          </div>
        </section>

        {/* Programação */}
        <section className="py-3 shrink-0">
          <div className="text-center text-[10px] uppercase font-extrabold tracking-[0.2em] text-neutral-500 mb-2.5">
            Programação em Direto · Rádio Marcoense 93.3 FM
          </div>
          <div className="space-y-2">
            {SHOWS_CONFIG.map((s) => (
              <div 
                key={s.name} 
                className={`flex items-center justify-between rounded-xl border px-4 py-3 transition duration-300 ${
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
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-neutral-100 truncate">{s.name}</div>
                    <div className="text-[11px] text-neutral-400 truncate mt-0.5">{s.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Cartão do Autor elegante */}
          <div className="mt-3.5 p-3 rounded-xl border border-amber-500/10 bg-amber-500/[0.02] flex items-center justify-center gap-2.5 text-center">
            <Mic className="size-4 text-amber-400 shrink-0" />
            <div className="text-xs text-neutral-300">
              <span className="text-neutral-500">Produção e apresentação: </span>
              <span className="font-bold text-amber-400">Paulo da Rocha Teixeira</span>
            </div>
          </div>
        </section>

        {/* Contactos */}
        <section className="pt-3 pb-8 shrink-0">
          <h2 className="text-[10px] uppercase font-extrabold tracking-[0.2em] text-neutral-500 mb-2">
            Contactos do Programa
          </h2>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5 overflow-hidden">
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
          
          {/* Rodapé */}
          <div className="mt-6 flex flex-col items-center justify-center gap-1.5 text-[10px] text-neutral-500 font-light tracking-wide">
            <div className="font-medium text-neutral-400">© Circuito Interno 2026</div>
            <button 
              onClick={() => setShowPrivacyModal(false)} 
              className="text-neutral-500 hover:text-amber-400 underline underline-offset-2 transition cursor-pointer"
            >
              Política de Privacidade
            </button>
          </div>
        </section>

      </div>

      {/* Modal de Privacidade */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 rounded-2xl max-w-sm w-full p-5 text-neutral-300 relative shadow-2xl">
            <button 
              onClick={() => setShowPrivacyModal(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white p-1"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-3">
              <ShieldCheck className="size-5" />
              Política de Privacidade
            </div>

            <div className="text-xs space-y-2.5 text-neutral-300 leading-relaxed max-h-[60vh] overflow-y-auto pr-1 font-light">
              <p>
                A aplicação <strong>Circuito Interno</strong> respeita integralmente a sua privacidade.
              </p>
              <p>
                • <strong>Sem recolha de dados:</strong> Não recolhemos, armazenamos ou partilhamos informações pessoais, localização ou histórico de navegação.
              </p>
              <p>
                • <strong>Emissão de Áudio:</strong> O leitor apenas acede à transmissão de áudio em direto e metadados das músicas para reprodução em tempo real.
              </p>
              <p>
                • <strong>Contacto:</strong> Para qualquer questão, contacte circuitointernoproducoes@gmail.com.
              </p>
            </div>

            <button 
              onClick={() => setShowPrivacyModal(false)}
              className="mt-5 w-full bg-amber-500 text-black font-bold text-xs py-2.5 rounded-xl hover:bg-amber-400 transition"
            >
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
    <a 
      href={href} 
      target="_blank" 
      rel="noreferrer" 
      className="flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-neutral-300 hover:text-white hover:bg-white/[0.08] hover:border-amber-500/30 transition duration-300 active:scale-95 shadow-sm"
    >
      {icon}
    </a>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition active:bg-white/[0.05]">
      <div className="size-8 rounded-lg bg-white/5 flex items-center justify-center text-neutral-400">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase font-bold tracking-widest text-neutral-500">{label}</div>
        <div className="text-xs font-semibold text-neutral-200 truncate mt-0.5">{value}</div>
      </div>
      <Send className="size-3.5 text-neutral-600" />
    </a>
  );
}