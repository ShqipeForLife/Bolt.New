import { Mail, Phone, Building2, ShoppingBag } from 'lucide-react';
import { Order, Customer, CHF } from './types';

function aggregate(orders: Order[]): Customer[] {
  const map = new Map<string, Customer>();
  for (const o of orders) {
    const key = o.email.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      existing.ordersCount += 1;
      existing.totalSpent += Number(o.total);
      if (o.created_at > existing.lastOrder) existing.lastOrder = o.created_at;
    } else {
      map.set(key, {
        email: o.email,
        name: o.contact_name,
        phone: o.phone,
        company: o.company_name,
        ordersCount: 1,
        totalSpent: Number(o.total),
        lastOrder: o.created_at,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}

export default function CustomersPanel({ orders }: { orders: Order[] }) {
  const customers = aggregate(orders);

  if (customers.length === 0) {
    return <p className="text-slate-400 text-center py-16">Aucun client pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {customers.map((c) => (
        <article key={c.email} className="rounded-2xl bg-slate-900/60 border border-white/10 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-white font-bold truncate">{c.name}</p>
              {c.company && (
                <p className="text-xs text-slate-400 inline-flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5" /> {c.company}
                </p>
              )}
            </div>
            <span className="text-lg font-extrabold text-white flex-shrink-0">
              {CHF(c.totalSpent)}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="inline-flex items-center gap-1 truncate">
              <Mail className="w-3.5 h-3.5" /> {c.email}
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="w-3.5 h-3.5" /> {c.phone}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="inline-flex items-center gap-1 text-cyan-300">
              <ShoppingBag className="w-3.5 h-3.5" /> {c.ordersCount} commande{c.ordersCount > 1 ? 's' : ''}
            </span>
            <span className="text-slate-500">
              Dernière : {new Date(c.lastOrder).toLocaleDateString('fr-CH')}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}
