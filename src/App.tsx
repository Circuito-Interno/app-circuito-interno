import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Mail, Phone, Radio, Globe, Loader2 } from "lucide-react";

const STREAM_URL = "https://streaming.shoutcast.com/marcoense-fm";

const SOCIALS = {
  facebook: "https://www.facebook.com/radiomarcoense/",
  instagram: "https://www.instagram.com/radiomarcoense/",
  spotify: "https://open.spotify.com/user/radiomarcoense",
  website: "https://www.marcoensefm.com",
};

const SHOWS = [
  { name: "Circuito Interno - Romântico", schedule: "Terça a Quinta - 22h00 às 24h00" },
  { name: "Circuito Interno - Rock & Indie Alternativo", schedule: "Sexta - 22h00 às 24h00" },
  { name: "Circuito Interno - Grandes Clássicos", schedule: "Sábado - 13h00 às 15h00" }
];

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio();
    const a = audioRef.current;

    const handlePlaying = () => { setPlaying(true); setLoading(false); setError(null); };
    const handlePause = () => setPlaying(false);
    const handleWaiting = () => setLoading(true);
    const handleCanPlay = () => setLoading(false);
    const handleError = () => {
      setLoading(false);
      setPlaying(false);
      setError("Emissão offline ou link de stream incorreto.");
    };

    a.addEventListener("playing", handlePlaying);
    a.addEventListener("pause", handlePause);
    a.addEventListener("waiting", handleWaiting);
    a.addEventListener("canplay", handleCanPlay);
    a.addEventListener("error", handleError);

    return () => {
      a.pause();
      a.removeEventListener("playing", handlePlaying);
      a.removeEventListener("pause", handlePause);
      a.removeEventListener("waiting", handleWaiting);
      a.removeEventListener("canplay", handleCanPlay);
      a.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : volume;
    }
  }, [volume, muted]);

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
      a.src = STREAM_URL;
      await a.play();
    } catch (e) {
      console.error(e);
      setError("Erro ao ligar ao servidor de emissão.");
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

        <header className="pt-12 pb-6 text-center shrink-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-neutral-400">
            <span className="relative flex size-2">
              <span className={`absolute inline-flex h-full w-full rounded-full bg-red-500/60 ${playing ? "animate-ping" : ""}`}></span>
              <span className="relative inline-flex size-2 rounded-full bg-red-500"></span>
            </span>
            {playing ? "Em direto · 93.3 FM" : "Disponível · 93.3 FM"}
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight bg-gradient-to-b from-white to-neutral-400 bg-clip-text text-transparent">Rádio Marcoense</h1>
          <p className="mt-1 text-sm text-neutral-400 font-medium tracking-wide">Circuito Interno</p>
        </header>

        <section className="flex-1 flex flex-col items-center justify-center py-6">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${playing ? "opacity-50 scale-110" : "opacity-20 scale-90"} bg-gradient-to-br from-red-600 via-orange-500 to-pink-600`} />
            <button
              onClick={toggle}
              className="relative size-44 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition active:scale-95 hover:scale-[1.01]"
            >
              {loading ? (
                <Loader2 className="size-16 animate-spin text-neutral-800" strokeWidth={1.5} />
              ) : playing ? (
                <Pause className="size-16 text-neutral-900" strokeWidth={1.5} fill="currentColor" />
              ) : (
                <Play className="size-16 ml-2 text-neutral-900" strokeWidth={1.5} fill="currentColor" />
              )}
            </button>
          </div>

          <div className="mt-6 text-center">
            <div className="text-sm font-semibold tracking-wide">{playing ? "A tocar agora" : loading ? "A ligar..." : "Toca para ouvir o direto"}</div>
            <div className="text-xs text-neutral-500 mt-1">marcoensefm.com</div>
          </div>

          <div className="mt-8 w-full max-w-xs bg-white/[0.02] border border-white/5 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => setMuted((m) => !m)} className="text-neutral-400 hover:text-white transition">
                {muted || volume === 0 ? <VolumeX className="size-4 text-red-400" /> : <Volume2 className="size-4" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                onChange={(e) => { setMuted(false); setVolume(parseFloat(e.target.value)); }}
                className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-red-500 cursor-pointer"
              />
              <span className="text-xs tabular-nums text-neutral-400 w-6 text-right font-medium">
                {Math.round((muted ? 0 : volume) * 100)}
              </span>
            </div>
          </div>
        </section>

        <section className="py-4 shrink-0">
          <div className="grid grid-cols-4 gap-2.5">
            <SocialButton href={SOCIALS.facebook} label="Facebook" icon={
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
            } />
            <SocialButton href={SOCIALS.instagram} label="Instagram" icon={
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
            } />
            <SocialButton href={SOCIALS.spotify} label="Spotify" icon={
              <svg viewBox="0 0 24 24" className="size-4" fill="currentColor">
                <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 1 1-.3-1.4c4.5-1 8.3-.5 11.4 1.3.4.2.5.6.3 1Zm1.5-3.3a.94.94 0 0 1-1.3.3c-3.2-2-8.1-2.5-11.9-1.4a.94.94 0 1 1-.5-1.8c4.3-1.3 9.7-.7 13.4 1.6.5.3.6.9.3 1.3Zm.1-3.4c-3.9-2.3-10.3-2.5-14-1.4a1.12 1.12 0 1 1-.6-2.2c4.3-1.3 11.4-1 15.9 1.6a1.12 1.12 0 1 1-1.2 1.9Z" />
              </svg>
            } />
            <SocialButton href={SOCIALS.website} label="Web" icon={<Globe className="size-4" />} />
          </div>
        </section>

        <section className="py-4 shrink-0">
          <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 mb-2.5">Programas</h2>
          <div className="space-y-2">
            {SHOWS.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                    <Radio className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-neutral-200 truncate">{s.name}</div>
                    <div className="text-[11px] text-neutral-500 truncate mt-0.5">{s.schedule}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-4 pb-8 shrink-0">
          <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 mb-2.5">Contactos do programa</h2>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            <ContactRow icon={<Mail className="size-4" />} label="Email" value="circuitointerno@marcoensefm.com" href="mailto:circuitointerno@marcoensefm.com" />
            <ContactRow icon={<Phone className="size-4" />} label="Telefone / WhatsApp" value="+351 255 000 000" href="tel:+351255000000" />
          </div>
          <p className="mt-6 text-center text-[10px] text-neutral-600 font-light tracking-wide">
            © Rádio Marcoense · 93.3 FM
          </p>
        </section>

        {/* BOTÃO DE INSTALAÇÃO DA APP */}
      <div className="mt-6 text-center">
        <button 
          onClick={() => setShowInstallHelp(true)}
          className="inline-flex items-center gap-2 bg-neutral-800 text-white text-xs font-semibold px-4 py-2 rounded-full hover:bg-neutral-700 transition"
        >
          📱 Instalar App no Telemóvel
        </button>
      </div>

      {/* PAINEL FLUTUANTE DE AJUDA À INSTALAÇÃO */}
      {showInstallHelp && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-md w-full relative">
            <button 
              onClick={() => setShowInstallHelp(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white text-lg font-bold"
            >
              ✕
            </button>
            
            <h3 className="text-base font-bold text-white text-center mb-4">
              Como Instalar a App da Rádio
            </h3>
            
            <div className="space-y-4 text-xs text-neutral-300">
              <div className="bg-neutral-800/50 p-3 rounded-xl border border-neutral-800">
                <p className="font-bold text-white mb-1">🍏 No iPhone (Safari):</p>
                <p>1. Clique no botão de <strong>Partilhar</strong> (quadrado com seta para cima) na barra inferior do Safari.</p>
                <p>2. Faça scroll para baixo e escolha <strong>"Adicionar ao Ecrã Principal"</strong>.</p>
              </div>

              <div className="bg-neutral-800/50 p-3 rounded-xl border border-neutral-800">
                <p className="font-bold text-white mb-1">🤖 No Android (Chrome):</p>
                <p>1. Clique nos <strong>3 pontinhos</strong> no canto superior direito.</p>
                <p>2. Selecione a opção <strong>"Instalar aplicação"</strong> ou "Adicionar ao ecrã principal".</p>
              </div>
            </div>

            <button 
              onClick={() => setShowInstallHelp(false)}
              className="mt-5 w-full bg-white text-black font-bold text-xs py-2.5 rounded-xl hover:bg-neutral-200 transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      </div>
    </div>
  );
}

function SocialButton({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-1.5 rounded-xl border border-white/5 bg-white/[0.02] py-2.5 text-neutral-400 hover:text-white hover:bg-white/[0.05] transition active:scale-95">
      {icon}
      <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
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
