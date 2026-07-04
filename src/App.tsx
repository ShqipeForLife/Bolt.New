import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient';
import ShopView from './ShopView';
import TrustpilotReviews from './TrustpilotReviews';
import AdminView from './AdminView';
import TrackOrderView from './TrackOrderView';
import CustomerAccountView from './CustomerAccountView';
import {
  Car,
  Smartphone,
  Settings,
  Wrench,
  Calendar,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  ChevronDown,
  Send,
  Menu,
  X,
  Cog,
  Shield,
  Zap,
  Clock,
  DollarSign,
  HeartHandshake,
  Navigation,
  Music,
  MessageSquare,
  PhoneCall,
  Map,
  Mic,
  Play,
  Wifi,
  Star,
  Info,
  Paperclip,
  ImageIcon,
  Trash2,
  Lock,
  Unlock,
} from 'lucide-react';

interface Service {
  id: string;
  title: string;
  price: string;
  description: string;
  icon: React.ElementType;
}

const services: Service[] = [
  {
    id: 'full-link',
    title: 'Activation Full Link / App-Connect / Audi Smartphone Interface',
    price: '200.- CHF',
    description: 'Activation complète de la connectivité smartphone pour Android Auto et Apple CarPlay.',
    icon: Smartphone,
  },
  {
    id: 'retrofit-manual',
    title: 'Installation manuelle (Retrofit) Module LVDS CarPlay & Android Auto',
    price: '150.- CHF',
    description: 'Installation d\'un module CarPlay/Android Auto sur votre système existant.',
    icon: Settings,
  },
  {
    id: 'bmw-fullscreen',
    title: 'Activation CarPlay Plein Écran (Fullscreen) BMW',
    price: '120.- CHF',
    description: 'Activation du mode plein écran pour Apple CarPlay. Disponible avec le système iDrive NBTevo_X ou Y.',
    icon: Car,
  },
  {
    id: 'coding-options',
    title: 'Codage de nouvelles options d\'origine',
    price: '120.- CHF',
    description: 'Activation de fonctionnalités cachées et options constructeur.',
    icon: Cog,
  },
  {
    id: 'assistance',
    title: 'Assistance technique, conseils & mise à jour GPS',
    price: '120.- CHF',
    description: 'Support technique complet et mise à jour de votre système GPS.',
    icon: Wrench,
  },
  {
    id: 'parts-replacement',
    title: 'Codage après remplacement de pièces',
    price: '100.- CHF',
    description: 'Recodage professionnel après changement de composants électroniques.',
    icon: Settings,
  },
];

const benefits = [
  { title: 'Travail professionnel', icon: Shield },
  { title: 'Compatible systèmes d\'origine', icon: Cog },
  { title: 'Service rapide', icon: Clock },
  { title: 'Tarifs transparents', icon: DollarSign },
  { title: 'Assistance personnalisée', icon: HeartHandshake },
  { title: 'Satisfaction garantie', icon: CheckCircle },
];

function Logo({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'w-9 h-9' : 'w-11 h-11';
  const screen = size === 'sm' ? 'w-6 h-4' : 'w-7 h-5';
  const carIcon = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  const wave = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  return (
    <div className={`relative ${box} rounded-xl flex items-center justify-center ring-1 ring-white/15 shadow-lg shadow-cyan-500/20`}
      style={{ background: 'linear-gradient(135deg, #1e3a8a, #0891b2)' }}>
      <Wifi className={`absolute top-1 ${wave} text-cyan-200/90`} />
      <div className={`${screen} rounded-[4px] bg-white/95 flex items-center justify-center mt-2`}>
        <Car className={`${carIcon} text-slate-900`} />
      </div>
    </div>
  );
}

function BrandLockup({ size = 'md' }: { size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-3">
      <Logo size={size} />
      <div className="flex flex-col leading-none">
        <span className={`font-bold text-white tracking-tight ${size === 'sm' ? 'text-base' : 'text-lg md:text-xl'}`}>
          Swiss Car Coding
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          <span>CarPlay</span>
          <span className="w-1 h-1 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400" />
          <span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent">Android Auto</span>
        </span>
      </div>
    </div>
  );
}

function App() {
  const [selectedService, setSelectedService] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [scrolled, setScrolled] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [view, setView] = useState<'home' | 'beforeAfter' | 'shop' | 'admin' | 'track' | 'account'>('home');
  const [paymentReturn, setPaymentReturn] = useState<'success' | 'cancel' | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    if (payment === 'success' || payment === 'cancel') {
      setPaymentReturn(payment);
      setView('shop');
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const heroRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const beforeAfterRef = useRef<HTMLDivElement>(null);
  const compatRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const benefitsRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<React.RefObject<HTMLDivElement | null> | null>(null);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled((prev) => {
          const next = window.scrollY > 50;
          return prev === next ? prev : next;
        });
        ticking = false;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    setMobileMenuOpen(false);
    if (ref === beforeAfterRef) {
      setView('beforeAfter');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    if (view !== 'home') {
      pendingScroll.current = ref;
      setView('home');
    } else {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const goToShop = () => {
    setMobileMenuOpen(false);
    setView('shop');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToTrack = () => {
    setMobileMenuOpen(false);
    setView('track');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToAdmin = () => {
    setMobileMenuOpen(false);
    setView('admin');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToAccount = () => {
    setMobileMenuOpen(false);
    setView('account');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (view === 'home' && pendingScroll.current) {
      const ref = pendingScroll.current;
      pendingScroll.current = null;
      requestAnimationFrame(() => ref.current?.scrollIntoView({ behavior: 'smooth' }));
    }
  }, [view]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const merged = [...attachedFiles, ...files].slice(0, 5);
    setAttachedFiles(merged);
    merged.forEach((file, i) => {
      if (filePreviews[i]) return;
      const reader = new FileReader();
      reader.onload = (ev) =>
        setFilePreviews((prev) => {
          const next = [...prev];
          next[i] = ev.target?.result as string;
          return next;
        });
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    const formData = new FormData(e.currentTarget);

    // Upload firmware photos to Supabase Storage
    const photoUrls: string[] = [];
    for (const file of attachedFiles) {
      const ext = file.name.split('.').pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('firmware-photos')
        .upload(path, file, { contentType: file.type });
      if (!uploadError) {
        const { data } = supabase.storage.from('firmware-photos').getPublicUrl(path);
        photoUrls.push(data.publicUrl);
      }
    }

    const data = {
      full_name: formData.get('fullName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      vehicle_brand: formData.get('brand') as string,
      vehicle_model: formData.get('model') as string,
      vehicle_year: parseInt(formData.get('year') as string),
      vin: (formData.get('vin') as string) || null,
      service_type: selectedService,
      preferred_date: formData.get('date') as string,
      message: (formData.get('message') as string) || null,
      firmware_photo_urls: photoUrls.length ? photoUrls : null,
    };

    const { error } = await supabase.from('appointments').insert([data]);

    if (error) {
      setSubmitStatus('error');
    } else {
      setSubmitStatus('success');
      (e.target as HTMLFormElement).reset();
      setSelectedService('');
      setAttachedFiles([]);
      setFilePreviews([]);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── Navigation ───────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-slate-900/95 backdrop-blur-md shadow-xl shadow-black/20 border-b border-white/5'
          : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 md:h-20">
            <BrandLockup size="md" />

            <div className="hidden md:flex items-center gap-8">
              {[
                { label: 'Accueil', ref: heroRef },
                { label: 'Services', ref: servicesRef },
                { label: 'Avant / Après', ref: beforeAfterRef },
                { label: 'Compatibilité', ref: compatRef },
                { label: 'Avis', ref: reviewsRef },
                { label: 'Rendez-vous', ref: formRef },
                { label: 'Avantages', ref: benefitsRef },
              ].map(({ label, ref }) => (
                <button
                  key={label}
                  onClick={() => scrollToSection(ref)}
                  className="text-white/70 hover:text-white font-medium transition-colors duration-200 text-sm tracking-wide"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={goToShop}
                className="text-white/70 hover:text-white font-medium transition-colors duration-200 text-sm tracking-wide"
              >
                Magasin
              </button>
              <button
                onClick={goToAccount}
                className="text-white/70 hover:text-white font-medium transition-colors duration-200 text-sm tracking-wide"
              >
                Mon compte
              </button>
              <button
                onClick={goToAdmin}
                className="text-white/70 hover:text-white font-medium transition-colors duration-200 text-sm tracking-wide"
              >
                Espace pro
              </button>
              <button
                onClick={() => scrollToSection(formRef)}
                className="btn-primary !px-5 !py-2.5 !text-sm"
              >
                Réserver
              </button>
            </div>

            <button
              className="md:hidden p-2 text-white/80"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-slate-900/98 backdrop-blur-xl border-t border-white/10">
            <div className="flex flex-col gap-1 px-4 py-4">
              {[
                { label: 'Accueil', ref: heroRef },
                { label: 'Services', ref: servicesRef },
                { label: 'Avant / Après', ref: beforeAfterRef },
                { label: 'Compatibilité', ref: compatRef },
                { label: 'Avis', ref: reviewsRef },
                { label: 'Rendez-vous', ref: formRef },
                { label: 'Avantages', ref: benefitsRef },
              ].map(({ label, ref }) => (
                <button
                  key={label}
                  onClick={() => scrollToSection(ref)}
                  className="text-white/80 hover:text-white font-medium text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={goToShop}
                className="text-white/80 hover:text-white font-medium text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all"
              >
                Magasin
              </button>
              <button
                onClick={goToAccount}
                className="text-white/80 hover:text-white font-medium text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all"
              >
                Mon compte
              </button>
              <button
                onClick={goToAdmin}
                className="text-white/80 hover:text-white font-medium text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-all"
              >
                Espace pro
              </button>
            </div>
          </div>
        )}
      </nav>

      {view === 'home' && (
      <>
      {/* ── Hero ─────────────────────────────────────── */}
      <section ref={heroRef} className="hero-section">
        {/* Pexels car dashboard background */}
        <div className="hero-bg-image" />
        <div className="hero-overlay" />

        {/* Animated grid + scan */}
        <div className="grid-overlay" />
        <div className="scan-line" />

        {/* Glowing accent orbs */}
        <div className="glow-orb w-[500px] h-[500px] opacity-30"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)', top: '-10%', left: '-5%' }} />
        <div className="glow-orb w-[400px] h-[400px] opacity-20"
          style={{ background: 'radial-gradient(circle, #06b6d4 0%, transparent 70%)', bottom: '5%', right: '-5%' }} />

        {/* ── CarPlay Panel — Left ── */}
        <div className="glass-panel absolute top-28 left-6 xl:left-20 w-72 hidden lg:block" style={{ animationDelay: '0s' }}>
          <div className="p-5">
            {/* CarPlay header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #f8f8f8, #e0e0e0)' }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#555"/>
                    <circle cx="12" cy="9" r="2.5" fill="#fff"/>
                  </svg>
                </div>
                <span className="text-white/90 text-sm font-semibold">Apple CarPlay</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="signal-dot" />
                <div className="signal-dot" />
                <div className="signal-dot" />
              </div>
            </div>
            {/* App grid */}
            <div className="grid grid-cols-4 gap-2.5 mb-4">
              {[
                { icon: Navigation, color: 'from-blue-500 to-blue-600', label: 'Maps' },
                { icon: Music, color: 'from-pink-500 to-rose-600', label: 'Music' },
                { icon: MessageSquare, color: 'from-green-500 to-emerald-600', label: 'SMS' },
                { icon: PhoneCall, color: 'from-green-400 to-green-600', label: 'Phone' },
                { icon: Map, color: 'from-orange-500 to-amber-500', label: 'Waze' },
                { icon: Play, color: 'from-red-500 to-red-600', label: 'Podcasts' },
                { icon: Mic, color: 'from-purple-500 to-violet-600', label: 'Siri' },
                { icon: Settings, color: 'from-slate-500 to-slate-600', label: 'Réglages' },
              ].map(({ icon: Icon, color, label }) => (
                <div key={label} className="flex flex-col items-center gap-1">
                  <div className={`app-icon bg-gradient-to-br ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-white/40 text-[9px]">{label}</span>
                </div>
              ))}
            </div>
            <div className="rainbow-bar" />
          </div>
        </div>

        {/* ── Android Auto Panel — Right ── */}
        <div className="glass-panel-alt absolute bottom-28 right-6 xl:right-20 w-80 hidden lg:block" style={{ animationDelay: '1s' }}>
          <div className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335)', padding: '2px' }}>
                  <div className="w-full h-full rounded-lg bg-slate-900 flex items-center justify-center">
                    <Smartphone className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
                <span className="text-white/90 text-sm font-semibold">Android Auto</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/40 text-xs">
                <Wifi className="w-3.5 h-3.5" />
                <span>14:22</span>
              </div>
            </div>

            {/* Nav card */}
            <div className="rounded-xl p-3.5 mb-3"
              style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.2)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
                  <Navigation className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/90 text-xs font-semibold">Navigation active</div>
                  <div className="text-white/50 text-xs truncate">Swiss Car Coding — Suisse</div>
                </div>
                <div className="text-cyan-400 text-xs font-bold">12 min</div>
              </div>
            </div>

            {/* Now playing */}
            <div className="rounded-xl p-3.5 mb-3"
              style={{ background: 'rgba(236,72,153,0.1)', border: '1px solid rgba(236,72,153,0.15)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                  <Music className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white/90 text-xs font-semibold">En cours</div>
                  <div className="text-white/50 text-xs">Spotify — Premium</div>
                </div>
                <Play className="w-4 h-4 text-pink-400" />
              </div>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2">
              {[
                { icon: PhoneCall, color: 'text-green-400', bg: 'rgba(34,197,94,0.1)' },
                { icon: MessageSquare, color: 'text-blue-400', bg: 'rgba(59,130,246,0.1)' },
                { icon: Map, color: 'text-orange-400', bg: 'rgba(251,146,60,0.1)' },
              ].map(({ icon: Icon, color, bg }, i) => (
                <div key={i} className="flex-1 h-11 rounded-xl flex items-center justify-center"
                  style={{ background: bg, border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
              ))}
            </div>
            <div className="rainbow-bar mt-3" />
          </div>
        </div>

        {/* ── Small badge — top right ── */}
        <div className="glass-panel absolute top-32 right-8 w-36 hidden xl:block" style={{ animationDelay: '2.5s', borderRadius: '16px' }}>
          <div className="p-4 text-center">
            <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #3b82f6)' }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div className="text-white text-xs font-semibold">CarPlay actif</div>
            <div className="flex justify-center gap-1 mt-2">
              <div className="signal-dot" />
              <div className="signal-dot" />
              <div className="signal-dot" />
            </div>
          </div>
        </div>

        {/* ── Stars badge — bottom left ── */}
        <div className="glass-panel absolute bottom-32 left-8 hidden xl:block" style={{ animationDelay: '3s', borderRadius: '16px' }}>
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              ))}
            </div>
            <div>
              <div className="text-white text-xs font-semibold">Clients satisfaits</div>
              <div className="text-white/50 text-[10px]">Suisse romande</div>
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <div className="animate-fade-in mb-6">
            <span className="badge-pill">
              <Zap className="w-3.5 h-3.5" />
              Spécialistes en codage véhicule — Suisse
            </span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white mb-6 animate-slide-up leading-tight tracking-tight">
            Activez tout le potentiel
            <br />
            <span className="text-gradient-brand">de votre véhicule</span>
          </h1>

          <p className="text-lg sm:text-xl text-white/60 max-w-2xl mx-auto mb-10 animate-slide-up leading-relaxed"
            style={{ animationDelay: '0.15s' }}>
            Votre spécialiste en Suisse pour l'activation CarPlay, Android Auto et le codage
            de fonctionnalités sur Audi, VW, Seat, Škoda et BMW.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up"
            style={{ animationDelay: '0.3s' }}>
            <button onClick={() => scrollToSection(formRef)} className="btn-primary">
              <Calendar className="w-5 h-5 mr-2" />
              Prendre rendez-vous
            </button>
            <button onClick={() => scrollToSection(servicesRef)} className="btn-ghost">
              Voir nos services
            </button>
          </div>

          {/* Platform logos row */}
          <div className="flex items-center justify-center gap-6 mt-14 animate-fade-in"
            style={{ animationDelay: '0.5s' }}>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-5 h-5 rounded bg-white/90 flex items-center justify-center">
                <Car className="w-3 h-3 text-slate-900" />
              </div>
              <span className="text-white/70 text-sm font-medium">Apple CarPlay</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="w-5 h-5 rounded flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #4285f4, #34a853)' }}>
                <Smartphone className="w-3 h-3 text-white" />
              </div>
              <span className="text-white/70 text-sm font-medium">Android Auto</span>
            </div>
            <div className="w-px h-5 bg-white/10" />
            <div className="flex items-center gap-2 px-4 py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Wifi className="w-4 h-4 text-cyan-400" />
              <span className="text-white/70 text-sm font-medium">Sans fil</span>
            </div>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
          <ChevronDown className="w-7 h-7 text-white/30" />
        </div>
      </section>

      {/* ── Services ─────────────────────────────────── */}
      <section ref={servicesRef} className="py-24 md:py-32 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="section-label">
              <Cog className="w-3.5 h-3.5" />
              Nos prestations
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Nos services
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Matériel professionnel exclusif pour un travail fiable, sécurisé et 100% compatible.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div key={service.id} className="service-card">
                <div className="icon-wrap">
                  <service.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2 leading-snug">
                  {service.title}
                </h3>
                <p className="text-slate-500 text-sm mb-5 leading-relaxed">
                  {service.description}
                </p>
                {service.id === 'retrofit-manual' && (
                  <p className="flex items-start gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-5 leading-relaxed">
                    <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>Boîtier LVDS non fourni : à commander sur notre boutique ou à apporter avant le rendez-vous. Les boîtiers LVDS sont expédiés directement par le fournisseur.</span>
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-extrabold text-slate-900">{service.price}</span>
                  <span className="text-xs font-medium px-3 py-1 rounded-full text-brand-600"
                    style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.12)' }}>
                    Sur place / Déplacement
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Déplacement notice */}
          <div className="mt-10 flex items-start gap-4 p-5 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.07), rgba(6,182,212,0.07))', border: '1px solid rgba(59,130,246,0.15)' }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
              <Info className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-slate-800 mb-1">Déplacement possible</p>
              <p className="text-sm text-slate-500 leading-relaxed">
                Nous pouvons nous déplacer directement chez vous ou sur votre lieu de travail.
                Les frais de déplacement et d'essence sont à la charge du client et seront convenus
                au préalable lors de la prise de rendez-vous.
              </p>
            </div>
          </div>
        </div>
      </section>
      </>
      )}

      {/* ── Démo App-Connect (bloqué / débloqué) ─────── */}
      {view === 'beforeAfter' && (
      <section ref={beforeAfterRef} className="relative pt-28 pb-24 md:pt-36 md:pb-32 overflow-hidden bg-slate-950">
        <div className="absolute inset-0 opacity-40"
          style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(6,182,212,0.18), transparent 70%)' }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="section-label">
              <Zap className="w-3.5 h-3.5" />
              Avant / Après
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Voici comment App-Connect est débloqué
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Sur de nombreux véhicules, App-Connect est verrouillé d'usine. Activez le bouton
              ci-dessous pour voir la différence sur votre écran d'infodivertissement.
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-4 mb-10">
            <span className={`text-sm font-semibold transition-colors ${unlocked ? 'text-slate-500' : 'text-red-400'}`}>
              Bloqué
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={unlocked}
              aria-label="Basculer App-Connect bloqué ou débloqué"
              onClick={() => setUnlocked((v) => !v)}
              className={`relative w-20 h-10 rounded-full transition-colors duration-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 ${
                unlocked ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`absolute top-1 left-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center transition-transform duration-500 ${
                  unlocked ? 'translate-x-10' : 'translate-x-0'
                }`}
              >
                {unlocked
                  ? <Unlock className="w-4 h-4 text-emerald-600" />
                  : <Lock className="w-4 h-4 text-slate-500" />}
              </span>
            </button>
            <span className={`text-sm font-semibold transition-colors ${unlocked ? 'text-emerald-400' : 'text-slate-500'}`}>
              Débloqué
            </span>
          </div>

          {/* Car head-unit mockup */}
          <div className="mx-auto max-w-2xl">
            <div className={`relative rounded-[28px] p-3 transition-all duration-500 ${
              unlocked ? 'bg-slate-800 shadow-[0_0_60px_-10px_rgba(6,182,212,0.4)]' : 'bg-slate-800 shadow-2xl'
            }`}>
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[16/9]">
                {/* Locked state */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center transition-opacity duration-500 ${
                  unlocked ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
                  style={{ background: 'linear-gradient(160deg, #0f172a, #020617)' }}>
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-red-500/10 border border-red-500/30">
                    <Lock className="w-8 h-8 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">App-Connect indisponible</p>
                    <p className="text-slate-400 text-sm mt-1">Fonction verrouillée par le constructeur</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 opacity-40">
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                      <Car className="w-5 h-5 text-white/60" />
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center">
                      <Smartphone className="w-5 h-5 text-white/60" />
                    </div>
                  </div>
                </div>

                {/* Unlocked state — CarPlay-style grid */}
                <div className={`absolute inset-0 p-5 transition-opacity duration-500 ${
                  unlocked ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                  style={{ background: 'linear-gradient(160deg, #0b1220, #0f172a)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                        <Unlock className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400 text-xs font-semibold">App-Connect activé</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-white/70">
                      <Wifi className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-medium">Sans fil</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 sm:gap-4">
                    {[
                      { icon: Map, grad: 'from-emerald-400 to-green-600', label: 'Plans' },
                      { icon: Music, grad: 'from-pink-400 to-rose-600', label: 'Musique' },
                      { icon: PhoneCall, grad: 'from-green-400 to-emerald-600', label: 'Tél.' },
                      { icon: MessageSquare, grad: 'from-sky-400 to-blue-600', label: 'Messages' },
                      { icon: Navigation, grad: 'from-cyan-400 to-teal-600', label: 'Nav' },
                      { icon: Mic, grad: 'from-blue-400 to-indigo-500', label: 'Assistant' },
                      { icon: Play, grad: 'from-amber-400 to-orange-600', label: 'Média' },
                      { icon: Smartphone, grad: 'from-slate-300 to-slate-500', label: 'Téléphone' },
                    ].map(({ icon: Icon, grad, label }, i) => (
                      <div key={label} className="flex flex-col items-center gap-1.5"
                        style={{ animation: unlocked ? `fadeIn 0.4s ease both ${0.1 + i * 0.05}s` : 'none' }}>
                        <div className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${grad} flex items-center justify-center shadow-lg`}>
                          <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <span className="text-[10px] sm:text-xs text-white/70 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center text-sm text-slate-500 mt-6">
              {unlocked
                ? 'Apple CarPlay & Android Auto entièrement fonctionnels après activation.'
                : 'Activez le bouton pour découvrir le résultat après déblocage.'}
            </p>
          </div>
        </div>
      </section>
      )}

      {view === 'home' && (
      <>
      {/* ── Compatibilité ────────────────────────────── */}
      <section ref={compatRef} className="py-24 md:py-32 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="section-label">
              <CheckCircle className="w-3.5 h-3.5" />
              Vérification préalable
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Compatibilité
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
              Afin de vérifier la compatibilité de votre véhicule, merci de nous envoyer
              une photo de la version firmware de votre système d'infodivertissement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* VW & Seat */}
            <div className="rounded-2xl p-6 border border-slate-100"
              style={{ background: 'linear-gradient(135deg, #f8fafc, #eff6ff)', boxShadow: '0 4px 24px rgba(59,130,246,0.06)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}>
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Volkswagen & Seat</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-brand-700"
                      style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                      2016 – 2020
                    </span>
                    <span className="text-slate-400 text-xs">Système MIB</span>
                  </div>
                </div>
              </div>
              <div className="rounded-xl px-4 py-3 font-mono text-sm font-semibold tracking-wide"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#1d4ed8' }}>
                MST2_XXX_XXX_XXX
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Rendez-vous dans les paramètres système de votre écran d'infodivertissement
                pour retrouver le numéro de version firmware commençant par <span className="font-semibold text-slate-700">MST2_</span>.
              </p>
            </div>

            {/* Audi */}
            <div className="rounded-2xl p-6 border border-slate-100"
              style={{ background: 'linear-gradient(135deg, #f8fafc, #ecfeff)', boxShadow: '0 4px 24px rgba(6,182,212,0.06)' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0e7490)' }}>
                  <Car className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Audi</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full text-cyan-700"
                      style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
                      2016 – 2020
                    </span>
                    <span className="text-slate-400 text-xs">Système MMI</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="rounded-xl px-4 py-3 font-mono text-sm font-semibold tracking-wide"
                  style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', color: '#0e7490' }}>
                  MHIG2_XXX_XXX_XXX
                </div>
                <div className="rounded-xl px-4 py-3 font-mono text-sm font-semibold tracking-wide"
                  style={{ background: 'rgba(6,182,212,0.06)', border: '1px dashed rgba(6,182,212,0.2)', color: '#0e7490' }}>
                  MHIG_XXX_XXX_XXX
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 leading-relaxed">
                Selon l'année du véhicule (2016 à 2020), le format peut varier entre
                <span className="font-semibold text-slate-700"> MHIG2_</span> et
                <span className="font-semibold text-slate-700"> MHIG_</span>.
                Retrouvez cette info dans les paramètres MMI.
              </p>
            </div>
          </div>

          {/* Call to action banner */}
          <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl p-6"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e3a8a)', border: '1px solid rgba(59,130,246,0.2)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}>
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-semibold text-white mb-1">Envoyez-nous la photo de votre firmware</p>
              <p className="text-sm text-white/60 leading-relaxed">
                Cette information nous permet de vérifier la compatibilité de votre véhicule
                avant de planifier l'intervention. Joignez simplement la photo lors de votre prise de rendez-vous.
              </p>
            </div>
            <button
              onClick={() => scrollToSection(formRef)}
              className="btn-primary whitespace-nowrap flex-shrink-0"
            >
              <Send className="w-4 h-4 mr-2" />
              Prendre RDV
            </button>
          </div>
        </div>
      </section>

      <div ref={reviewsRef}>
        <TrustpilotReviews />
      </div>

      {/* ── Booking Form ─────────────────────────────── */}
      <section ref={formRef} className="py-24 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="section-label">
              <Calendar className="w-3.5 h-3.5" />
              Prise de contact
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Demande de rendez-vous
            </h2>
            <p className="text-lg text-slate-500 max-w-2xl mx-auto">
              Remplissez le formulaire et nous vous contacterons pour confirmer votre rendez-vous.
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nom et prénom *
                  </label>
                  <input type="text" id="fullName" name="fullName" required className="form-input" />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Adresse e-mail *
                  </label>
                  <input type="email" id="email" name="email" required className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Numéro de téléphone *
                  </label>
                  <input type="tel" id="phone" name="phone" required className="form-input" />
                </div>
                <div>
                  <label htmlFor="brand" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Marque du véhicule *
                  </label>
                  <select id="brand" name="brand" required className="form-input">
                    <option value="">Sélectionner...</option>
                    <option value="Audi">Audi</option>
                    <option value="Volkswagen">Volkswagen (VW)</option>
                    <option value="Seat">Seat</option>
                    <option value="Skoda">Škoda</option>
                    <option value="BMW">BMW</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="model" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Modèle *
                  </label>
                  <input type="text" id="model" name="model" required className="form-input" />
                </div>
                <div>
                  <label htmlFor="year" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Année *
                  </label>
                  <input
                    type="number" id="year" name="year"
                    min="1990" max={new Date().getFullYear() + 1}
                    required className="form-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="vin" className="block text-sm font-medium text-slate-700 mb-1.5">
                  VIN (facultatif)
                </label>
                <input type="text" id="vin" name="vin" className="form-input" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="service" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Prestation souhaitée *
                  </label>
                  <select
                    id="service" name="service"
                    value={selectedService}
                    onChange={(e) => setSelectedService(e.target.value)}
                    required className="form-input"
                  >
                    <option value="">Sélectionnez une prestation...</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title} — {s.price}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Date souhaitée *
                  </label>
                  <input
                    type="date" id="date" name="date" required
                    min={new Date().toISOString().split('T')[0]}
                    className="form-input"
                  />
                </div>
              </div>

              {selectedService === 'retrofit-manual' && (
                <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                  <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-900 leading-relaxed">
                    <p className="font-semibold">Boîtier LVDS non fourni</p>
                    <p className="mt-1 text-amber-800">
                      Notre prestation couvre uniquement l'installation et la
                      configuration. Vous devez déjà posséder le boîtier LVDS ou le
                      commander sur notre boutique avant le rendez-vous. Les boîtiers
                      LVDS sont expédiés directement par le fournisseur.
                    </p>
                    <button
                      type="button"
                      onClick={goToShop}
                      className="mt-2 inline-flex items-center gap-1.5 font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950"
                    >
                      Commander un boîtier sur la boutique
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Message complémentaire
                </label>
                <textarea
                  id="message" name="message" rows={4}
                  className="form-input resize-none"
                />
              </div>

              {/* Firmware photo upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Photo(s) firmware (facultatif — recommandé)
                </label>
                <div
                  className="relative rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-brand-400 hover:bg-blue-50/40 transition-all duration-200 cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif"
                    multiple
                    className="sr-only"
                    onChange={handleFileChange}
                  />
                  <div className="flex flex-col items-center justify-center py-7 px-4 text-center">
                    <div className="w-12 h-12 rounded-xl mb-3 flex items-center justify-center"
                      style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(6,182,212,0.1))', border: '1px solid rgba(59,130,246,0.15)' }}>
                      <Paperclip className="w-5 h-5 text-brand-500" />
                    </div>
                    <p className="text-sm font-medium text-slate-700">
                      Cliquez pour joindre vos photos
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPG, PNG, HEIC — max 5 photos · 10 Mo chacune
                    </p>
                  </div>
                </div>

                {/* Previews */}
                {attachedFiles.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {attachedFiles.map((file, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square">
                        {filePreviews[i] ? (
                          <img
                            src={filePreviews[i]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(ev) => { ev.stopPropagation(); removeFile(i); }}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 py-1 px-1.5">
                          <p className="text-white text-[9px] truncate">{file.name}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <p className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 text-brand-400" />
                  Joignez une photo de la version firmware de votre écran pour que nous puissions
                  vérifier la compatibilité de votre véhicule.
                </p>
              </div>

              {submitStatus === 'success' && (
                <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
                  <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                  <span className="text-sm font-medium">Votre demande a été envoyée avec succès. Nous vous contacterons bientôt.</span>
                </div>
              )}

              {submitStatus === 'error' && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800">
                  <X className="w-5 h-5 flex-shrink-0 text-red-500" />
                  <span className="text-sm font-medium">Une erreur est survenue. Veuillez réessayer.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed !py-4"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Envoi en cours...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Send className="w-5 h-5" />
                    Envoyer ma demande
                  </span>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* ── Benefits ─────────────────────────────────── */}
      <section ref={benefitsRef} className="py-24 md:py-32 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #0f172a 100%)' }}>
        <div className="absolute inset-0 grid-overlay opacity-50" />
        <div className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(59,130,246,0.4), transparent)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="section-label">
              <Shield className="w-3.5 h-3.5" />
              Nos engagements
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Pourquoi Swiss Car Coding ?
            </h2>
            <p className="text-lg text-white/50 max-w-2xl mx-auto">
              Un service professionnel, fiable et de qualité pour votre véhicule.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {benefits.map((benefit, index) => (
              <div key={benefit.title} className="benefit-card" style={{ animationDelay: `${index * 0.1}s` }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(6,182,212,0.2))', border: '1px solid rgba(59,130,246,0.2)' }}>
                  <benefit.icon className="w-6 h-6 text-cyan-400" />
                </div>
                <span className="text-white font-semibold">{benefit.title}</span>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={() => scrollToSection(formRef)}
              className="btn-primary"
            >
              <Calendar className="w-5 h-5 mr-2" />
              Prendre rendez-vous maintenant
            </button>
          </div>
        </div>
      </section>
      </>
      )}

      {view === 'shop' && (
        <ShopView
          supabase={supabase}
          onBack={() => scrollToSection(heroRef)}
          onTrack={goToTrack}
          paymentReturn={paymentReturn}
        />
      )}

      {view === 'track' && (
        <TrackOrderView onBack={() => scrollToSection(heroRef)} />
      )}

      {view === 'account' && (
        <CustomerAccountView onBack={() => scrollToSection(heroRef)} />
      )}

      {view === 'admin' && (
        <AdminView onBack={() => scrollToSection(heroRef)} />
      )}

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="py-10 bg-slate-950 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <BrandLockup size="sm" />

            <div className="flex flex-col sm:flex-row items-center gap-5 text-slate-500 text-sm">
              <a
                href="https://wa.me/41796078346"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413" />
                </svg>
                WhatsApp
              </a>
              <a href="mailto:carcodingswiss@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4" />
                carcodingswiss@gmail.com
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Suisse
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/5 text-center text-slate-600 text-xs">
            © {new Date().getFullYear()} Swiss Car Coding. Tous droits réservés.
          </div>
        </div>
      </footer>

    </div>
  );
}

export default App;
