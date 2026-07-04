import { useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Loader2,
  Mail,
  Phone,
  Building2,
  Landmark,
  Smartphone,
  CreditCard,
  CircleDollarSign,
  CheckCircle2,
  Truck,
  RefreshCw,
  Send,
  ExternalLink,
  AlertTriangle,
  MapPin,
} from 'lucide-react';
import { Order, CHF, ORDER_STATUSES, FULFILLMENT_META } from './types';

const statusMeta = (s: string) =>
  ORDER_STATUSES.find((x) => x.value === s) ?? ORDER_STATUSES[0];

export default function OrdersPanel({
  orders,
  setOrders,
  supplierConfigured,
}: {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  supplierConfigured: boolean;
}) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const patch = (id: string, changes: Partial<Order>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...changes } : o)));

  const updateStatus = async (id: string, status: string) => {
    setUpdating(id);
    const { error } = await supabase.from('orders').update({ status }).eq('id', id);
    if (!error) patch(id, { status });
    setUpdating(null);
  };

  const togglePaid = async (id: string, current: string) => {
    const payment_status = current === 'paid' ? 'unpaid' : 'paid';
    setUpdating(id);
    const { error } = await supabase.from('orders').update({ payment_status }).eq('id', id);
    if (!error) patch(id, { payment_status });
    setUpdating(null);
  };

  const callSupplier = async (id: string, action: 'fulfill' | 'sync-order') => {
    setBusy(id);
    try {
      const { data, error } = await supabase.functions.invoke('supplier', {
        body: { action, order_id: id },
      });
      if (error || data?.error) {
        patch(id, { supplier_error: data?.error ?? 'Erreur fournisseur' });
      } else {
        const { data: fresh } = await supabase
          .from('orders')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (fresh) patch(id, fresh as Order);
      }
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      {!supplierConfigured && (
        <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-4 py-3.5 text-amber-200 text-sm">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Fournisseur dropshipping non connecté</p>
            <p className="text-amber-200/80 mt-0.5">
              Les commandes payées sont marquées « Manuel ». Ajoutez vos identifiants
              CJ Dropshipping (CJ_EMAIL et CJ_API_KEY) pour activer l'envoi automatique
              et la récupération des numéros de suivi.
            </p>
          </div>
        </div>
      )}

      {orders.length === 0 && (
        <p className="text-slate-400 text-center py-16">Aucune commande pour le moment.</p>
      )}

      {orders.map((o) => {
        const meta = statusMeta(o.status);
        const fMeta = FULFILLMENT_META[o.fulfillment_status] ?? FULFILLMENT_META.pending;
        const working = busy === o.id;
        return (
          <article key={o.id} className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-white">{o.contact_name}</span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${meta.color}`}>
                    {meta.label}
                  </span>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${
                      o.payment_status === 'paid'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-orange-500/15 text-orange-300 border-orange-500/30'
                    }`}
                  >
                    <CircleDollarSign className="w-3 h-3" />
                    {o.payment_status === 'paid' ? 'Payé' : 'Non payé'}
                  </span>
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${fMeta.color}`}>
                    <Truck className="w-3 h-3" />
                    {fMeta.label}
                  </span>
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full border border-white/10 text-slate-300 inline-flex items-center gap-1">
                    {o.payment_method === 'twint' ? (
                      <><Smartphone className="w-3 h-3" /> TWINT</>
                    ) : o.payment_method === 'card' ? (
                      <><CreditCard className="w-3 h-3" /> Carte</>
                    ) : (
                      <><Landmark className="w-3 h-3" /> Virement</>
                    )}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                  {o.company_name && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" /> {o.company_name}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> {o.email}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5" /> {o.phone}
                  </span>
                  <span>
                    {new Date(o.created_at).toLocaleDateString('fr-CH', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {(o.ship_address || o.address) && (
                  <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {[o.ship_address || o.address, o.ship_zip, o.ship_city, o.ship_country]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 lg:flex-col lg:items-end">
                <span className="text-xl font-extrabold text-white">{CHF(Number(o.total))}</span>
                <div className="flex items-center gap-2">
                  {updating === o.id && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                  <button
                    onClick={() => togglePaid(o.id, o.payment_status)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                      o.payment_status === 'paid'
                        ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'
                        : 'border-white/10 text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {o.payment_status === 'paid' ? 'Payé' : 'Marquer payé'}
                  </button>
                  <select
                    value={o.status}
                    onChange={(e) => updateStatus(o.id, e.target.value)}
                    className="rounded-lg bg-slate-950 border border-white/10 text-white text-sm px-2 py-1.5 focus:outline-none focus:border-cyan-500/60"
                  >
                    {ORDER_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <ul className="space-y-1.5">
                {o.items.map((it, i) => (
                  <li key={i} className="flex justify-between text-sm text-slate-300">
                    <span className="truncate">{it.qty} &times; {it.name}</span>
                    <span className="text-slate-400 flex-shrink-0 ml-4">{CHF(it.unit_price * it.qty)}</span>
                  </li>
                ))}
              </ul>
              {o.notes && <p className="text-xs text-slate-500 mt-3 italic">Note : {o.notes}</p>}
            </div>

            {/* Fulfillment / tracking row */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
              {o.tracking_number ? (
                <div className="flex items-center gap-2 text-sm">
                  <Truck className="w-4 h-4 text-cyan-400" />
                  <span className="text-white font-mono">{o.tracking_number}</span>
                  {o.carrier && <span className="text-slate-500">· {o.carrier}</span>}
                  {o.tracking_url && (
                    <a
                      href={o.tracking_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                    >
                      Suivre <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ) : (
                <span className="text-sm text-slate-500">
                  {o.supplier_order_id
                    ? `Commande fournisseur : ${o.supplier_order_id}`
                    : 'Pas encore expédiée'}
                </span>
              )}

              <div className="ml-auto flex items-center gap-2">
                {working && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
                {o.payment_status === 'paid' && !o.supplier_order_id && (
                  <button
                    onClick={() => callSupplier(o.id, 'fulfill')}
                    disabled={working}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    <Send className="w-3.5 h-3.5" /> Envoyer au fournisseur
                  </button>
                )}
                {o.supplier_order_id && (
                  <button
                    onClick={() => callSupplier(o.id, 'sync-order')}
                    disabled={working}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5 transition-colors disabled:opacity-60"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Actualiser le suivi
                  </button>
                )}
              </div>
            </div>

            {o.supplier_error && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-red-300">
                <AlertTriangle className="w-3.5 h-3.5" /> {o.supplier_error}
              </p>
            )}
          </article>
        );
      })}
    </div>
  );
}
