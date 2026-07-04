import { useState, useEffect, useCallback } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import {
  Lock,
  LogOut,
  Loader2,
  AlertCircle,
  ShoppingBag,
  TrendingUp,
  Clock,
  ArrowLeft,
  RefreshCw,
  Users,
  Boxes,
  Truck,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/owner-console`;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

async function ownerConsole(action: string, code?: string) {
  const res = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
    body: JSON.stringify({ action, code }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) {
    throw new Error(data?.error ?? 'Erreur de connexion à la console.');
  }
  return data as { initialized?: boolean; access_token?: string; refresh_token?: string };
}
import { Order, Product, CHF } from './admin/types';
import OrdersPanel from './admin/OrdersPanel';
import ProductsPanel from './admin/ProductsPanel';
import CustomersPanel from './admin/CustomersPanel';

export default function AdminView({ onBack }: { onBack: () => void }) {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isStaff, setIsStaff] = useState<boolean | null>(null);

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

  useEffect(() => {
    if (!session) {
      setIsStaff(null);
      return;
    }
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('staff_members')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      if (active) setIsStaff(Boolean(data));
    })();
    return () => {
      active = false;
    };
  }, [session]);

  if (authLoading) {
    return (
      <section className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-slate-950 pt-24 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour au site
        </button>
        {!session ? (
          <OwnerGate />
        ) : isStaff === null ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : isStaff ? (
          <Dashboard email="Propriétaire" />
        ) : (
          <NotStaff email={session.user.email ?? ''} />
        )}
      </div>
    </section>
  );
}

function NotStaff({ email }: { email: string }) {
  return (
    <div className="max-w-md mx-auto text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
        <Lock className="w-6 h-6 text-orange-400" />
      </div>
      <h1 className="text-2xl font-extrabold text-white">Accès réservé</h1>
      <p className="text-slate-400 text-sm mt-2">
        Le compte <span className="text-white font-medium">{email}</span> n'est pas
        autorisé à accéder à l'espace magasin. Cet espace est réservé à l'équipe.
      </p>
      <button
        onClick={() => supabase.auth.signOut()}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-white font-medium hover:bg-white/10 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Se déconnecter
      </button>
    </div>
  );
}

function OwnerGate() {
  const [phase, setPhase] = useState<'loading' | 'setup' | 'login'>('loading');
  const [code, setCode] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { initialized } = await ownerConsole('status');
        if (active) setPhase(initialized ? 'login' : 'setup');
      } catch {
        if (active) {
          setError('Console indisponible. Réessayez dans un instant.');
          setPhase('login');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const applySession = async (tokens: { access_token?: string; refresh_token?: string }) => {
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Session invalide.');
    }
    const { error } = await supabase.auth.setSession({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });
    if (error) throw new Error('Impossible d\'ouvrir la session.');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (phase === 'setup') {
      if (code.length < 6) {
        setError('Le code doit contenir au moins 6 caractères.');
        return;
      }
      if (code !== confirmCode) {
        setError('Les deux codes ne correspondent pas.');
        return;
      }
    }
    setSubmitting(true);
    try {
      const tokens = await ownerConsole(phase === 'setup' ? 'setup' : 'login', code);
      await applySession(tokens);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  if (phase === 'loading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mx-auto mb-4">
          <KeyRound className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-white">
          {phase === 'setup' ? 'Créer votre code d\'accès' : 'Console propriétaire'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {phase === 'setup'
            ? 'Choisissez un code d\'accès pour protéger votre tableau de bord. Gardez-le précieusement.'
            : 'Entrez votre code d\'accès pour gérer la boutique.'}
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
          <label className="block text-sm font-medium text-slate-300 mb-1.5">
            Code d'accès
          </label>
          <input
            type="password"
            required
            autoFocus
            minLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
          />
        </div>
        {phase === 'setup' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Confirmer le code
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ShieldCheck className="w-4 h-4" />
          )}
          {phase === 'setup' ? 'Créer le code et entrer' : 'Ouvrir le tableau de bord'}
        </button>
      </form>
    </div>
  );
}

type Tab = 'orders' | 'products' | 'customers';

function Dashboard({ email }: { email: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Tab>('orders');
  const [supplierConfigured, setSupplierConfigured] = useState(false);

  const loadProducts = useCallback(async () => {
    const { data } = await supabase
      .from('products')
      .select('*')
      .order('featured', { ascending: false })
      .order('name', { ascending: true });
    if (data) setProducts(data as Product[]);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    const [ordersRes] = await Promise.all([
      supabase.from('orders').select('*').order('created_at', { ascending: false }),
      loadProducts(),
    ]);
    if (ordersRes.error || !ordersRes.data) {
      setError(true);
    } else {
      setOrders(ordersRes.data as Order[]);
    }
    setLoading(false);
  }, [loadProducts]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    supabase.functions
      .invoke('supplier', { body: { action: 'status' } })
      .then(({ data }) => setSupplierConfigured(Boolean(data?.configured)))
      .catch(() => setSupplierConfigured(false));
  }, []);

  const revenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((s, o) => s + Number(o.total), 0);
  const pending = orders.filter((o) => o.status === 'pending').length;
  const toShip = orders.filter(
    (o) => o.payment_status === 'paid' && o.fulfillment_status !== 'fulfilled' && o.status !== 'cancelled',
  ).length;

  const tabs: { key: Tab; label: string; icon: typeof ShoppingBag }[] = [
    { key: 'orders', label: 'Commandes', icon: ShoppingBag },
    { key: 'products', label: 'Produits', icon: Boxes },
    { key: 'customers', label: 'Clients', icon: Users },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Tableau de bord</h1>
          <p className="text-slate-400 text-sm mt-1 inline-flex items-center gap-2">
            Connecté en tant que {email}
            <span
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                supplierConfigured
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
              }`}
            >
              <Truck className="w-3 h-3" />
              CJ {supplierConfigured ? 'connecté' : 'non connecté'}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Actualiser
          </button>
          <button
            onClick={() => supabase.auth.signOut()}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={ShoppingBag} label="Commandes" value={String(orders.length)} />
        <StatCard icon={TrendingUp} label="Chiffre d'affaires" value={CHF(revenue)} />
        <StatCard icon={Clock} label="En attente" value={String(pending)} />
        <StatCard icon={Truck} label="À expédier" value={String(toShip)} />
      </div>

      <div className="flex items-center gap-2 mb-6 border-b border-white/10">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-cyan-400 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-3" /> Chargement...
        </div>
      )}

      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
          <p className="text-white font-semibold">Impossible de charger les données</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {tab === 'orders' && (
            <OrdersPanel orders={orders} setOrders={setOrders} supplierConfigured={supplierConfigured} />
          )}
          {tab === 'products' && (
            <ProductsPanel products={products} reload={loadProducts} supplierConfigured={supplierConfigured} />
          )}
          {tab === 'customers' && <CustomersPanel orders={orders} />}
        </>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-900/60 border border-white/10 p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-slate-400 text-sm truncate">{label}</p>
        <p className="text-white text-xl font-extrabold">{value}</p>
      </div>
    </div>
  );
}
