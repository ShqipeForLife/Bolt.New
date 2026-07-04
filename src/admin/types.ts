export type OrderItem = { product_id: string; name: string; qty: number; unit_price: number };

export type Order = {
  id: string;
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string;
  address: string | null;
  ship_address: string | null;
  ship_city: string | null;
  ship_zip: string | null;
  ship_province: string | null;
  ship_country: string | null;
  items: OrderItem[];
  total: number;
  notes: string | null;
  status: string;
  payment_method: string;
  payment_status: string;
  fulfillment_status: string;
  supplier: string | null;
  supplier_order_id: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
  supplier_error: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  wholesale_price: number;
  wholesale_min_qty: number;
  image_url: string;
  category: string;
  stock: number;
  featured: boolean;
  supplier: string | null;
  supplier_pid: string | null;
  supplier_vid: string | null;
  supplier_sku: string | null;
  cost: number;
  last_stock_sync: string | null;
};

export type Customer = {
  email: string;
  name: string;
  phone: string;
  company: string | null;
  ordersCount: number;
  totalSpent: number;
  lastOrder: string;
};

export const CHF = (n: number) =>
  new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n);

export const ORDER_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'pending', label: 'En attente', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { value: 'confirmed', label: 'Confirmée', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  { value: 'shipped', label: 'Expédiée', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { value: 'delivered', label: 'Livrée', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  { value: 'cancelled', label: 'Annulée', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
];

export const FULFILLMENT_META: Record<string, { label: string; color: string }> = {
  pending: { label: 'À traiter', color: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  processing: { label: 'Envoyée fournisseur', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  fulfilled: { label: 'Expédiée', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  failed: { label: 'Échec', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  manual: { label: 'Manuel', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
};
