import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import {
  ArrowLeft,
  Loader2,
  AlertCircle,
  UserRound,
  LogOut,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShoppingBag,
  RefreshCw,
  Save,
  Check,
  ShieldAlert,
} from 'lucide-react';

type OrderItem = { name: string; qty: number; unit_price: number };

type CustomerOrder = {
  id: string;
  items: OrderItem[];
  total: number;
  status: string;
  payment_status: string;
  fulfillment_status: string;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  created_at: string;
};

const CHF = (n: number) =>
  new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n);

const STEPS = [
  { key: 'paid', label: 'Payée', icon: CheckCircle2 },
  { key: 'processing', label: 'En préparation', icon: Package },
  { key: 'shipped', label: 'Expédiée', icon: Truck },
  { key: 'delivered', label: 'Livrée', icon: CheckCircle2 },
];

function stepIndex(o: CustomerOrder): number {
  if (o.status === 'delivered') return 3;
  if (o.status === 'shipped' || o.fulfillment_status === 'fulfilled' || o.tracking_number) return 2;
  if (o.payment_status === 'paid') return o.fulfillment_status === 'pending' ? 0 : 1;
  return -1;
}

export default function CustomerAccountView({ onBack }: { onBack: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <section className="relative min-h-screen pt-28 pb-24 md:pt-36 bg-slate-950 overflow-hidden">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(6,182,212,0.18), transparent 70%)',
        }}
      />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </button>

        {authLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : session ? (
          <Account session={session} />
        ) : (
          <AuthForm />
        )}
      </div>
    </section>
  );
}

function AuthForm() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(
          error.message.toLowerCase().includes('already')
            ? 'Un compte existe déjà avec cet email.'
            : error.message,
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('Email ou mot de passe incorrect.');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
          <UserRound className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">
          {mode === 'signin' ? 'Mon espace client' : 'Créer mon compte'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {mode === 'signin'
            ? 'Connectez-vous pour retrouver vos commandes et vos tarifs de gros.'
            : 'Créez un compte pour suivre vos commandes et commander plus vite.'}
        </p>
      </div>

      <form
        onSubmit={submit}
        className="rounded-3xl bg-slate-900/60 border border-white/10 p-6 space-y-4"
      >
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Mot de passe</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
        </button>
        <p className="text-center text-sm text-slate-400">
          {mode === 'signin' ? 'Pas encore de compte ?' : 'Déjà client ?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setError('');
            }}
            className="text-cyan-400 font-medium hover:text-cyan-300"
          >
            {mode === 'signin' ? 'Créer un compte' : 'Se connecter'}
          </button>
        </p>
      </form>
    </div>
  );
}

function Account({ session }: { session: Session }) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Ask the backend to refresh tracking from the supplier for pending orders,
    // so the latest tracking numbers show up automatically.
    try {
      await supabase.functions.invoke('customer-track', { body: {} });
    } catch {
      // Non-blocking: we still show whatever we have on record.
    }
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, items, total, status, payment_status, fulfillment_status, tracking_number, tracking_url, carrier, created_at',
      )
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      setError('Impossible de charger vos commandes.');
      setOrders([]);
    } else {
      setOrders((data as CustomerOrder[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <UserRound className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Mon espace client</p>
            <p className="text-slate-400 text-sm">{session.user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" /> Actualiser
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Déconnexion
          </button>
        </div>
      </div>

      <ProfileSection userId={session.user.id} />

      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <ShoppingBag className="w-5 h-5 text-cyan-400" /> Mes commandes
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Chargement...
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-3xl bg-slate-900/60 border border-white/10">
          <ShoppingBag className="w-10 h-10 text-slate-600 mb-4" />
          <p className="text-white font-semibold">Aucune commande pour le moment</p>
          <p className="text-slate-400 text-sm mt-1">
            Vos futures commandes apparaîtront ici automatiquement.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {orders.map((o) => {
            const idx = stepIndex(o);
            const cancelled = o.status === 'cancelled';
            return (
              <article
                key={o.id}
                className="rounded-3xl bg-slate-900/60 border border-white/10 p-6"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                  <div>
                    <p className="text-xs text-slate-500 font-mono">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-white font-bold text-lg">{CHF(Number(o.total))}</p>
                  </div>
                  <span className="text-xs text-slate-400 inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(o.created_at).toLocaleDateString('fr-CH', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>

                {cancelled ? (
                  <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Cette commande a été annulée.
                  </div>
                ) : (
                  <div className="flex items-center mb-5">
                    {STEPS.map((step, i) => {
                      const done = i <= idx;
                      const Icon = step.icon;
                      return (
                        <div key={step.key} className="flex items-center flex-1 last:flex-none">
                          <div className="flex flex-col items-center gap-1.5">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors ${
                                done
                                  ? 'bg-gradient-to-br from-blue-500 to-cyan-500 border-transparent text-white'
                                  : 'bg-slate-800 border-white/10 text-slate-500'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <span
                              className={`text-[10px] font-medium text-center ${
                                done ? 'text-cyan-300' : 'text-slate-500'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {i < STEPS.length - 1 && (
                            <div
                              className={`h-0.5 flex-1 mx-1 -mt-4 ${
                                i < idx ? 'bg-cyan-500' : 'bg-white/10'
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {o.tracking_number && (
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4 mb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-slate-400">Numéro de suivi</p>
                        <p className="text-white font-mono font-semibold">
                          {o.tracking_number}
                        </p>
                        {o.carrier && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Transporteur : {o.carrier}
                          </p>
                        )}
                      </div>
                      {o.tracking_url && (
                        <a
                          href={o.tracking_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                          Suivre le colis
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <ul className="space-y-1.5 pt-4 border-t border-white/10">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex justify-between text-sm text-slate-300">
                      <span className="truncate">
                        {it.qty} &times; {it.name}
                      </span>
                      <span className="text-slate-400 flex-shrink-0 ml-4">
                        {CHF(it.unit_price * it.qty)}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}

      <TransportRefundNotice />
    </div>
  );
}

export function TransportRefundNotice() {
  return (
    <div className="mt-8 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 flex gap-3">
      <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-amber-200 font-semibold text-sm mb-1">
          Produit endommagé ou défectueux ?
        </p>
        <p className="text-amber-100/80 text-sm leading-relaxed">
          En cas de problème avec un produit pendant le transport ou si vous constatez
          qu'il est défectueux à la réception, veuillez contacter le service de transport
          indiqué sur votre suivi ou notre fournisseur, qui pourra procéder au remboursement.
          Conservez le numéro de suivi et des photos du colis pour accélérer la démarche.
        </p>
      </div>
    </div>
  );
}

function ProfileSection({ userId }: { userId: string }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone, company')
        .eq('user_id', userId)
        .maybeSingle();
      if (!active) return;
      if (data) {
        setFullName(data.full_name ?? '');
        setPhone(data.phone ?? '');
        setCompany(data.company ?? '');
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    const { error } = await supabase.from('profiles').upsert({
      user_id: userId,
      full_name: fullName,
      phone,
      company,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      setError('Enregistrement impossible. Réessayez.');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
    setSaving(false);
  };

  return (
    <div className="mb-8 rounded-3xl bg-slate-900/60 border border-white/10 p-6">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <UserRound className="w-5 h-5 text-cyan-400" /> Mes informations
      </h2>
      {loading ? (
        <div className="flex items-center py-6 text-slate-400 text-sm">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Chargement...
        </div>
      ) : (
        <form onSubmit={save} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Nom complet
              </label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Téléphone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Entreprise (optionnel)
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-5 py-2.5 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Enregistré' : 'Enregistrer'}
          </button>
        </form>
      )}
    </div>
  );
}
