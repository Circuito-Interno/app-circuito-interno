import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Mail, Phone, Radio, Globe, Loader2, Clock, Music, SkipForward, SkipBack } from "lucide-react";

const STREAM_URL = "https://streaming.shoutcast.com/marcoense-fm";

// Lista de músicas enviadas para a pasta public/playlist.mp3/
const PLAYLIST = [
  "/playlist.mp3/21 hertzWatching YouInfinity Coast2013Trip-Hop.mp3",
  "/playlist.mp3/A Flock Of SeagullsCastles In The SkySome Dreams2024-12-13.mp3",
  "/playlist.mp3/AaRONBlouson NoirWe Cut the Night2015.mp3",
  "/playlist.mp3/AaRONFASTLANEANATOMY OF LIGHT.mp3",
  "/playlist.mp3/Active ChildJohnny BelindaYou Are All I See2011Ambient Pop.mp3",
  "/playlist.mp3/AdnaDreamerNight2014-02-05.mp3",
  "/playlist.mp3/AimCold Water MusicCold Water Music2007Breaks; Downtempo; Electronic.mp3",
  "/playlist.mp3/Alabama ShakesThis FeelingSound & Color2015-04-22Soul.mp3",
  "/playlist.mp3/Alan WalkerFadedDifferent World2018Dance-Pop; Edm; Electro.mp3",
  "/playlist.mp3/AlexanderTruthAlexander2011-03-01Folk.mp3",
  "/playlist.mp3/All About EveMartha's HarbourAll About Eve1988Gothic Rock.mp3",
  "/playlist.mp3/All India RadioPersistFall2008-07-21Ambient.mp3",
  "/playlist.mp3/All India RadioThe Red RoomThe Unified Field2025.mp3",
  "/playlist.mp3/AmatorskiSoldierTbc2013-02-04.mp3",
  "/playlist.mp3/AmatorskiThe KingSame Stars We Shared2013-02-04.mp3",
  "/playlist.mp3/Amos LeeColorsAmos Lee2005-03-01Singer-Songwriter.mp3",
  "/playlist.mp3/Angelo BadalamentiTwin Peaks ThemeTwin Peaks (Limited Event Series Soundtrack)2017Ambient; Dark Jazz; Jazz.mp3",
  "/playlist.mp3/Angus & Julia StoneDraw Your SwordsDown The Way2010Folk; Folk Rock; Indie Pop.mp3",
  "/playlist.mp3/Angus PowellMonstersMonsters2015-10-02Bones.mp3",
  "/playlist.mp3/Animal Triste, Marina HandsA GIRL LIKE YOUA GIRL LIKE YOU2025.mp3",
  "/playlist.mp3/Anna von HausswolffMountains CraveCeremony2012-07-18Neofolk.mp3",
  "/playlist.mp3/AnnieAmerican CarsDark Hearts.mp3",
  "/playlist.mp3/AntipolePerceptionsCrystalline2023-05-12.mp3",
  "/playlist.mp3/Arcade FireYear of the SnakePink Elephant2025-05-09.mp3",
  "/playlist.mp3/ArchiveCity WallsCity Walls2026.mp3",
  "/playlist.mp3/Art School GirlfriendBending BackBending Back2017-09-08Dream Pop.mp3",
  "/playlist.mp3/Asaf AvidanDifferent PulsesDifferent Pulses2012Folk Rock; Pop; Rock.mp3",
  "/playlist.mp3/AthleteWiresTourist.mp3",
  "/playlist.mp3/BORDER 242RetrosonicAnalog Prog #32024-01-26.mp3",
  "/playlist.mp3/BalthazarBunkerBunker2015-07-06Indie.mp3",
  "/playlist.mp3/Band of HorsesThe FuneralEverything All The Time.mp3",
  "/playlist.mp3/Barclay James HarvestChild Of The UniverseEveryone Is Everybody Else2006Art Rock; Progressive Rock; Progressive-Rock.mp3",
  "/playlist.mp3/Ben HarperAmen OmenDiamonds on the Inside2003Blues.mp3",
  "/playlist.mp3/Ben HarperMorning YearningBoth Sides Of The Gun2006Adult Alternative Rock; Alternative And Punk; Alternative Rock.mp3",
  "/playlist.mp3/Bob DylanMan in the Long Black CoatChronicles, Volume One Limited Edition 6 Song Sampler2004-10-05Folk.mp3",
  "/playlist.mp3/Breaking BenjaminThe Diary of JanePhobia2006-08-08Alternative Rock.mp3",
  "/playlist.mp3/Bruce SpringsteenYoungstownThe Ghost Of Tom Joad1995-11-21.mp3",
  "/playlist.mp3/Bryan AdamsRun To You(Everything I Do) I Do It For You2001Ballad; Pop; Pop Rock.mp3",
  "/playlist.mp3/Bryan FerrySlave To LoveBoys And Girls1985.mp3",
  "/playlist.mp3/Cigarettes After SexApocalypseCigarettes After Sex2017-06-09Dream Pop.mp3",
  "/playlist.mp3/Cock RobinThe Promise You Made100 80s Hits2008.mp3",
  "/playlist.mp3/Cowboy JunkiesSweet JaneThe Trinity SessionAlternative Country; Alternative Rock; Blues Rock.mp3",
  "/playlist.mp3/Cutting Crew(I Just) Died In Your ArmsBroadcastAor Classic Rock; Electronic; New Wave.mp3",
  "/playlist.mp3/DaughterYouthIf You Leave2013Alternative Rock; Folk Rock; Indie Folk.mp3",
  "/playlist.mp3/Dire StraitsBrothers in ArmsBrothers in Arms2025-05-16Classic Rock.mp3",
  "/playlist.mp3/Drab MajestyToo Soon To TellThe Demonstration2017Dark Wave; Electronic; Ethereal Wave.mp3",
  "/playlist.mp3/EditorsThe Phone BookThe Weight Of Your Love2013Alternative Rock; Indie Rock; Rock.mp3",
  "/playlist.mp3/EmancipatorGreenlandSafe In The Steep Cliffs2010Downbeat; Downtempo; Electronic.mp3",
  "/playlist.mp3/EmikaPrimary ColoursDva2013Electronic.mp3",
  "/playlist.mp3/Emotive GreyCosmosSky Gazing2023-09-01.mp3",
  "/playlist.mp3/EuropeThe Final Countdown'80s Metal Gold2007Classic Rock; Heavy Metal; Rock.mp3",
  "/playlist.mp3/Fischer-ZSo LongGoing Deaf For A Living1980-05.mp3",
  "/playlist.mp3/Frankie Goes To HollywoodThe Power Of LoveBang! ... Hard On (The Greatest Hits & The Complete Ztt Videos)200280s; Alternative Dance; Ballad.mp3",
  "/playlist.mp3/GNRBem Vindo Ao PassadoPopless2006-07-14Portuguese.mp3",
  "/playlist.mp3/HIMJoin Me In DeathRazorblade Romance (Deluxe Re-Mastered)2014-12-15.mp3",
  "/playlist.mp3/HozierTake Me to ChurchHozier2023-06-16Indie.mp3",
  "/playlist.mp3/Hunter as a HorseFallen LeavesThe Two Magics Vol.12016-04-22Electronic.mp3",
  "/playlist.mp3/JamesOne Of The ThreeLaid2001Alternative Rock; Brit Pop; Indie Pop.mp3",
  "/playlist.mp3/KaleidaEcho Saw YouTear the Roots.mp3",
  "/playlist.mp3/KasabianWhere Did All The Love Go101 Classic Hits2017.mp3",
  "/playlist.mp3/Kings of LeonWALLSWALLS2016Alternative Rock.mp3",
  "/playlist.mp3/Lara LiTelepatia100 Grandes Vedetas Portuguesas1997Portuguese.mp3",
  "/playlist.mp3/Laura BraniganSelf ControlSelf Control Tour2001Pop.mp3",
  "/playlist.mp3/Led ZeppelinStairway to Heaven[Led Zeppelin IV]1971-11-08Classic Rock.mp3",
  "/playlist.mp3/Lenny KravitzBelieve in MeRozengeur & Wodka Lime, Deel 22002-11Rock.mp3",
  "/playlist.mp3/Linkin ParkOne More Light[standalone recordings]2020Ambient Pop.mp3",
  "/playlist.mp3/a-haI've Been Losing YouScoundrel Days (Deluxe Edition)1986-10-06.mp3",
  "/playlist.mp3/anaiisDeus DeusDeus Deus2025-06-13.mp3"
];

const SOCIALS = {
  facebook: "https://www.facebook.com/radiomarcoense/",
  instagram: "https://www.instagram.com/radiomarcoense/",
  spotify: "https://open.spotify.com/user/radiomarcoense",
  website: "https://www.marcoensefm.com",
};

const SHOWS_CONFIG = [
  { name: "Circuito Interno - Romântico", days: [2, 3, 4], startHour: 22, startMin: 0, endHour: 24, endMin: 0, label: "Terça a Quinta - 22h00 às 24h00" },
  { name: "Circuito Interno - Rock & Indie Alternativo", days: [5], startHour: 22, startMin: 0, endHour: 24, endMin: 0, label: "Sexta - 22h00 às 24h00" },
  { name: "Circuito Interno - Grandes Clássicos", days: [6], startHour: 13, startMin: 0, endHour: 15, endMin: 0, label: "Sábado - 13h00 às 15h00" }
];

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  
  const [isLive, setIsLive] = useState(false);
  const [countdownText, setCountdownText] = useState("");

  const updateStreamStatus = () => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMin = now.getMinutes();
    const currentTimeInMins = currentHour * 60 + currentMin;

    let liveDetected = false;
    SHOWS_CONFIG.forEach(show => {
      if (show.days.includes(currentDay)) {
        const startTotal = show.startHour * 60 + show.startMin;
        const endTotal = show.endHour * 60 + show.endMin;
        if (currentTimeInMins >= startTotal && currentTimeInMins < endTotal) {
          liveDetected = true;
        }
      }
    });

    setIsLive(liveDetected);

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
    audioRef.current = new Audio();
    const a = audioRef.current;

    const handlePlaying = () => { setPlaying(true); setLoading(false); setError(null); };
    const handlePause = () => setPlaying(false);
    const handleWaiting = () => setLoading(true);
    const handleCanPlay = () => setLoading(false);
    const handleEnded = () => {
      if (!isLive && PLAYLIST.length > 0) {
        setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
      }
    };
    const handleError = () => {
      setLoading(false);
      setPlaying(false);
      setError("Erro ao carregar o áudio.");
    };

    a.addEventListener("playing", handlePlaying);
    a.addEventListener("pause", handlePause);
    a.addEventListener("waiting", handleWaiting);
    a.addEventListener("canplay", handleCanPlay);
    a.addEventListener("ended", handleEnded);
    a.addEventListener("error", handleError);

    updateStreamStatus();
    const timer = setInterval(updateStreamStatus, 1000);

    return () => {
      clearInterval(timer);
      a.pause();
      a.removeEventListener("playing", handlePlaying);
      a.removeEventListener("pause", handlePause);
      a.removeEventListener("waiting", handleWaiting);
      a.removeEventListener("canplay", handleCanPlay);
      a.removeEventListener("ended", handleEnded);
      a.removeEventListener("error", handleError);
    };
  }, [isLive]);

  useEffect(() => {
    if (playing && !isLive && audioRef.current && PLAYLIST.length > 0) {
      audioRef.current.src = PLAYLIST[currentTrackIndex];
      audioRef.current.play().catch(console.error);
    }
  }, [currentTrackIndex]);

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
      a.src = isLive ? STREAM_URL : PLAYLIST[currentTrackIndex];
      await a.play();
    } catch (e) {
      console.error(e);
      setError("Erro ao iniciar a reprodução.");
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };

  const nextTrack = () => {
    if (!isLive && PLAYLIST.length > 0) {
      setCurrentTrackIndex((prev) => (prev + 1) % PLAYLIST.length);
    }
  };

  const prevTrack = () => {
    if (!isLive && PLAYLIST.length > 0) {
      setCurrentTrackIndex((prev) => (prev - 1 + PLAYLIST.length) % PLAYLIST.length);
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
          <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] transition-all ${
            isLive ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"
          }`}>
            <span className="relative flex size-2">
              <span className={`absolute inline-flex h-full w-full rounded-full ${isLive ? "bg-red-500/60" : "bg-amber-500/60"} ${playing ? "animate-ping" : ""}`}></span>
              <span className={`relative inline-flex size-2 rounded-full ${isLive ? "bg-red-500" : "bg-amber-500"}`}></span>
            </span>
            {isLive ? "Programa Em Direto" : "Playlist Circuito Interno"}
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-b from-white to-neutral-300 bg-clip-text text-transparent">
            Circuito Interno
          </h1>
          <p className="mt-1 text-xs text-neutral-400 font-medium tracking-wide">
            Emissão em direto na Rádio Marcoense · 93.3 FM
          </p>
        </header>

        <section className="flex-1 flex flex-col items-center justify-center py-6">
          <div className="flex items-center gap-6">
            {!isLive && (
              <button onClick={prevTrack} className="p-3 text-neutral-400 hover:text-white transition active:scale-95">
                <SkipBack className="size-6" />
              </button>
            )}

            <div className="relative">
              <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${
                playing 
                  ? isLive ? "opacity-50 scale-110 bg-gradient-to-br from-red-600 via-orange-500 to-pink-600" : "opacity-40 scale-105 bg-gradient-to-br from-amber-500 to-orange-600"
                  : "opacity-20 scale-90 bg-white/10"
              }`} />
              
              <button
                onClick={toggle}
                className={`relative size-44 rounded-full flex items-center justify-center shadow-2xl transition duration-300 active:scale-95 hover:scale-[1.01] cursor-pointer ${
                  isLive ? "bg-red-600 text-white" : "bg-amber-500 text-black"
                }`}
              >
                {loading ? (
                  <Loader2 className="size-16 animate-spin" strokeWidth={1.5} />
                ) : playing ? (
                  <Pause className="size-16" strokeWidth={1.5} fill="currentColor" />
                ) : isLive ? (
                  <Radio className="size-16" strokeWidth={1.5} />
                ) : (
                  <Music className="size-16" strokeWidth={1.5} />
                )}
              </button>
            </div>

            {!isLive && (
              <button onClick={nextTrack} className="p-3 text-neutral-400 hover:text-white transition active:scale-95">
                <SkipForward className="size-6" />
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <div className="text-sm font-semibold tracking-wide flex items-center justify-center gap-1.5">
              {playing 
                ? isLive ? "A escutar o programa em direto na rádio!" : "A escutar a Playlist do Circuito Interno 🎧" 
                : loading ? "A ligar..." 
                : isLive ? "Toca para ligar à emissão em direto 🔴" 
                : "Toca para ouvir a Playlist 🎧"}
            </div>
            <div className="text-xs text-neutral-500 mt-1">Rádio Marcoense · 93.3 FM</div>
          </div>

          <div className="mt-6 w-full max-w-xs bg-white/[0.02] border border-white/5 p-3 rounded-xl">
            <div className="flex items-center gap-3">
              <button onClick={() => setMuted((m) => !m)} className="text-neutral-400 hover:text-white transition">
                {muted || volume === 0 ? <VolumeX className="size-4 text-red-400" /> : <Volume2 className="size-4" />}
              </button>
              <input
                type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume}
                onChange={(e) => { setMuted(false); setVolume(parseFloat(e.target.value)); }}
                className="flex-1 h-1 rounded-full appearance-none bg-white/10 accent-amber-500 cursor-pointer"
              />
              <span className="text-xs tabular-nums text-neutral-400 w-6 text-right font-medium">
                {Math.round((muted ? 0 : volume) * 100)}
              </span>
            </div>
          </div>

          {!isLive && (
            <div className="mt-6 w-full max-w-xs bg-amber-500/[0.03] border border-amber-500/10 p-4 rounded-xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-medium tracking-wide uppercase text-[10px]">
                <Clock className="size-3.5" /> Próximo programa em direto:
              </div>
              <div className="text-lg font-mono font-bold text-neutral-200 mt-2 tracking-wider tabular-nums">
                {countdownText || "A carregar..."}
              </div>
            </div>
          )}
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
                <path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24Zm5.5 17.3a.75.75 0 0 1-1 .3c-2.8-1.7-6.3-2.1-10.4-1.2a.75.75 0 1 1-.3-1.4c4.5-1 8.3-.5 11.4 1.3.4.2.5.6.3 1Zm1.5-3.3a.94.94 0 1 1-1.3.3c-3.2-2-8.1-2.5-11.9-1.4a.94.94 0 1 1-.5-1.8c4.3-1.3 9.7-.7 13.4 1.6.5.3.6.9.3 1.3Zm.1-3.4c-3.9-2.3-10.3-2.5-14-1.4a1.12 1.12 0 1 1-.6-2.2c4.3-1.3 11.4-1 15.9 1.6a1.12 1.12 0 1 1-1.2 1.9Z" />
              </svg>
            } />
            <SocialButton href={SOCIALS.website} label="Web" icon={<Globe className="size-4" />} />
          </div>
        </section>

        <section className="py-4 shrink-0">
          <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 mb-2.5">Programas</h2>
          <div className="space-y-2">
            {SHOWS_CONFIG.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3">
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

        <section className="pt-4 pb-8 shrink-0">
          <h2 className="text-[10px] uppercase font-bold tracking-[0.2em] text-neutral-500 mb-2.5">Contactos do programa</h2>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] divide-y divide-white/5">
            <ContactRow icon={<Mail className="size-4" />} label="Email" value="circuitointerno@marcoensefm.com" href="mailto:circuitointerno@marcoensefm.com" />
            <ContactRow icon={<Phone className="size-4" />} label="Telefone / WhatsApp" value="+351 255 000 000" href="tel:+351255000000" />
          </div>
          
          <p className="mt-6 text-center text-[10px] text-neutral-600 font-light tracking-wide">
            © Circuito Interno 2026
          </p>
        </section>

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