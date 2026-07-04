import { useState } from 'react';
import { supabase } from './supabaseClient';
import { TransportRefundNotice } from './CustomerAccountView';
import {
  ArrowLeft,
  Search,
  Loader2,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertCircle,
  ShoppingBag,
} from 'lucide-react';

type OrderItem = { name: string; qty: number; unit_price: number };

type TrackedOrder = {
  id: string;
  contact_name: string;
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

function stepIndex(o: TrackedOrder): number {
  if (o.status === 'delivered') return 3;
  if (o.status === 'shipped' || o.fulfillment_status === 'fulfilled' || o.tracking_number) return 2;
  if (o.payment_status === 'paid') return o.fulfillment_status === 'pending' ? 0 : 1;
  return -1;
}

export default function TrackOrderView({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<TrackedOrder[]>([]);

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('my-orders', {
        body: { email },
      });
      if (fnError || !data || data.error) {
        throw new Error(data?.error ?? 'Recherche impossible');
      }
      setOrders((data.orders as TrackedOrder[]) ?? []);
      setSearched(true);
    } catch (err) {
      setError((err as Error).message ?? 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  };

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

        <div className="mb-10">
          <span className="section-label">
            <Truck className="w-3.5 h-3.5" />
            Suivi de commande
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">
            Où en est ma commande ?
          </h1>
          <p className="text-lg text-slate-400 leading-relaxed">
            Saisissez l'adresse email utilisée lors de la commande pour suivre son
            statut et récupérer votre numéro de suivi.
          </p>
        </div>

        <form onSubmit={search} className="flex flex-col sm:flex-row gap-3 mb-10">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.com"
              className="w-full rounded-xl bg-slate-900 border border-white/10 text-white text-sm pl-10 pr-3 py-3.5 focus:outline-none focus:border-cyan-500/60"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-6 py-3.5 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Rechercher
          </button>
        </form>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm mb-6">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {searched && orders.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-600 mb-4" />
            <p className="text-white font-semibold">Aucune commande trouvée</p>
            <p className="text-slate-400 text-sm mt-1">
              Vérifiez l'adresse email saisie lors de votre achat.
            </p>
          </div>
        )}

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

        {orders.length > 0 && <TransportRefundNotice />}
      </div>
    </section>
  );
}
