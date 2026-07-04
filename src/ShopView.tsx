import { useState, useEffect } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Package,
  X,
  Check,
  Loader2,
  Truck,
  ShieldCheck,
  Tag,
  ArrowLeft,
  AlertCircle,
  CreditCard,
  Smartphone,
  Search,
} from 'lucide-react';

type Product = {
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
};

type CartLine = { product: Product; qty: number };

type SupplierResult = {
  pid: string;
  name: string;
  image: string;
  category: string;
  price: number;
};

const CHF = (n: number) =>
  new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF' }).format(n);

const unitPrice = (p: Product, qty: number) =>
  qty >= p.wholesale_min_qty ? p.wholesale_price : p.price;

export default function ShopView({
  supabase,
  onBack,
  onTrack,
  paymentReturn,
}: {
  supabase: SupabaseClient;
  onBack: () => void;
  onTrack: () => void;
  paymentReturn?: 'success' | 'cancel' | null;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'success' | 'cancel' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [supplierResults, setSupplierResults] = useState<SupplierResult[]>([]);
  const [supplierLoading, setSupplierLoading] = useState(false);
  const [supplierSearched, setSupplierSearched] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);
  const [importingPid, setImportingPid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) =>
      setCustomerEmail(data.session?.user.email ?? null),
    );
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) =>
      setCustomerEmail(s?.user.email ?? null),
    );
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (paymentReturn === 'success') {
      setCart([]);
      setCartOpen(true);
      setCheckout(false);
      setOrderStatus('success');
    } else if (paymentReturn === 'cancel') {
      setCartOpen(true);
      setOrderStatus('cancel');
    }
  }, [paymentReturn]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('featured', { ascending: false })
        .order('price', { ascending: true });
      if (!active) return;
      if (error || !data) {
        setLoadError(true);
      } else {
        setProducts(data as Product[]);
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [supabase]);

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...prev, { product, qty: 1 }];
    });
    setCartOpen(true);
  };

  const setQty = (id: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((l) => l.product.id !== id));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.product.id === id ? { ...l, qty } : l))
    );
  };

  const searchSupplier = async () => {
    const kw = search.trim();
    if (!kw) return;
    setSupplierLoading(true);
    setSupplierError(null);
    setSupplierSearched(true);
    try {
      const { data, error } = await supabase.functions.invoke('catalog', {
        body: { action: 'search', keyword: kw },
      });
      if (error || !data || data.error) {
        throw new Error(data?.error ?? 'Recherche indisponible');
      }
      setSupplierResults((data.products as SupplierResult[]) ?? []);
    } catch (err) {
      setSupplierError((err as Error).message ?? 'Recherche indisponible.');
      setSupplierResults([]);
    } finally {
      setSupplierLoading(false);
    }
  };

  const addSupplierProduct = async (pid: string) => {
    setImportingPid(pid);
    setSupplierError(null);
    try {
      const { data, error } = await supabase.functions.invoke('catalog', {
        body: { action: 'import', pid },
      });
      if (error || !data || data.error || !data.product) {
        throw new Error(data?.error ?? 'Ajout impossible');
      }
      const product = data.product as Product;
      setProducts((prev) =>
        prev.some((p) => p.id === product.id) ? prev : [...prev, product],
      );
      addToCart(product);
    } catch (err) {
      setSupplierError((err as Error).message ?? 'Ce produit n\'a pas pu être ajouté.');
    } finally {
      setImportingPid(null);
    }
  };

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);  const total = cart.reduce((s, l) => s + unitPrice(l.product, l.qty) * l.qty, 0);
  const retailTotal = cart.reduce((s, l) => s + l.product.price * l.qty, 0);
  const savings = retailTotal - total;

  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const q = search.trim().toLowerCase();
  const filtered = products.filter((p) => {
    const matchesCat = activeCat === 'all' || p.category === activeCat;
    const matchesText =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q);
    return matchesCat && matchesText;
  });

  const handleCheckout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setOrderStatus('idle');
    setErrorMsg(null);

    const payWindow = window.open('', '_blank');

    const form = new FormData(e.currentTarget);
    const items = cart.map((l) => ({
      product_id: l.product.id,
      name: l.product.name,
      qty: l.qty,
      unit_price: unitPrice(l.product, l.qty),
    }));
    const order = {
      company_name: (form.get('company') as string) || null,
      contact_name: form.get('contact') as string,
      email: form.get('email') as string,
      phone: form.get('phone') as string,
      address: (form.get('address') as string) || null,
      ship_address: (form.get('address') as string) || null,
      ship_zip: (form.get('zip') as string) || null,
      ship_city: (form.get('city') as string) || null,
      ship_province: (form.get('province') as string) || null,
      ship_country: (form.get('country') as string) || 'CH',
      items,
      notes: (form.get('notes') as string) || null,
    };

    const { data: checkoutData, error: fnError } = await supabase.functions.invoke(
      'create-checkout',
      { body: { order, origin: window.location.origin } },
    );

    if (fnError || !checkoutData?.url) {
      payWindow?.close();
      setErrorMsg(
        checkoutData?.error ?? 'Le paiement n\'a pas pu être initialisé. Merci de réessayer.',
      );
      setOrderStatus('error');
      setSubmitting(false);
      return;
    }

    const url = checkoutData.url as string;
    if (payWindow) {
      payWindow.location.href = url;
    } else {
      window.location.href = url;
    }
    setSubmitting(false);
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
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 text-sm font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour à l'accueil
        </button>

        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div>
            <span className="section-label">
              <Package className="w-3.5 h-3.5" />
              Magasin en gros
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-white mb-3 tracking-tight">
              Boîtiers CarPlay externes
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl leading-relaxed">
              Adaptateurs CarPlay et Android Auto en vente en ligne. Tarifs dégressifs
              automatiques pour les commandes en gros.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start">
            <button
              onClick={onTrack}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              <Truck className="w-5 h-5 text-cyan-400" />
              Suivi
            </button>
            <button
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-2 rounded-2xl bg-white/5 border border-white/10 px-5 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              Panier
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-6 mb-10 text-sm text-slate-400">
          <span className="inline-flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-400" /> Expédition depuis la Suisse
          </span>
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-cyan-400" /> Garantie 24 mois
          </span>
          <span className="inline-flex items-center gap-2">
            <Tag className="w-4 h-4 text-cyan-400" /> Prix de gros dès la quantité minimale
          </span>
        </div>

        {!loading && !loadError && products.length > 0 && (
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-10">
            <div className="relative flex-1 max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un produit (CarPlay, Android Auto, Audi...)"
                className="w-full rounded-2xl bg-slate-900/60 border border-white/10 text-white text-sm pl-12 pr-10 py-3.5 focus:outline-none focus:border-cyan-500/60 transition-colors"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSupplierResults([]);
                    setSupplierSearched(false);
                    setSupplierError(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <CatPill label="Tout" active={activeCat === 'all'} onClick={() => setActiveCat('all')} />
                {categories.map((c) => (
                  <CatPill
                    key={c}
                    label={c}
                    active={activeCat === c}
                    onClick={() => setActiveCat(c)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !loadError && search.trim() && (
          <div className="-mt-4 mb-10 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="text-slate-400">
              Vous ne trouvez pas votre modèle dans notre boutique ?
            </span>
            <button
              onClick={searchSupplier}
              disabled={supplierLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2 text-white font-medium hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              {supplierLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4 text-cyan-400" />
              )}
              Rechercher chez notre fournisseur
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-3" /> Chargement du catalogue...
          </div>
        )}

        {!loading && loadError && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mb-4" />
            <p className="text-white font-semibold">Impossible de charger le catalogue</p>
            <p className="text-slate-400 text-sm mt-1">
              Veuillez réessayer dans quelques instants.
            </p>
          </div>
        )}

        {!loading && !loadError && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Package className="w-10 h-10 text-slate-500 mb-4" />
            <p className="text-white font-semibold">Aucun produit disponible</p>
          </div>
        )}

        {!loading && !loadError && products.length > 0 && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Search className="w-10 h-10 text-slate-500 mb-4" />
            <p className="text-white font-semibold">Aucun produit ne correspond</p>
            <p className="text-slate-400 text-sm mt-1">
              Essayez un autre mot-clé ou catégorie.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setActiveCat('all');
              }}
              className="mt-4 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors"
            >
              Réinitialiser la recherche
            </button>
          </div>
        )}

        {!loading && !loadError && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((p) => (
              <article
                key={p.id}
                className="group flex flex-col rounded-3xl overflow-hidden bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
                  <img
                    src={p.image_url}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-3 left-3 rounded-full bg-slate-950/80 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-300 border border-white/10">
                    {p.category}
                  </span>
                  {p.featured && (
                    <span className="absolute top-3 right-3 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-1 text-[11px] font-bold text-white">
                      Best-seller
                    </span>
                  )}
                </div>
                <div className="flex flex-col flex-1 p-5">
                  <h3 className="text-white font-bold text-lg leading-snug mb-2">
                    {p.name}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed flex-1">
                    {p.description}
                  </p>
                  <div className="mt-4 flex items-end justify-between">
                    <div>
                      <p className="text-2xl font-extrabold text-white">{CHF(p.price)}</p>
                      <p className="text-xs text-cyan-400 mt-0.5">
                        {CHF(p.wholesale_price)} / u. dès {p.wholesale_min_qty} pièces
                      </p>
                    </div>
                    <span className="text-xs text-slate-500">
                      {p.stock > 0 ? `${p.stock} en stock` : 'Rupture'}
                    </span>
                  </div>
                  <button
                    onClick={() => addToCart(p)}
                    disabled={p.stock <= 0}
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter au panier
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {(supplierSearched || supplierError) && (
          <div className="mt-14">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px flex-1 bg-white/10" />
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 uppercase tracking-wide">
                <Package className="w-4 h-4" /> Catalogue fournisseur
              </span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {supplierError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {supplierError}
              </div>
            )}

            {supplierLoading ? (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mr-3" /> Recherche en cours...
              </div>
            ) : supplierSearched && supplierResults.length === 0 && !supplierError ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Search className="w-10 h-10 text-slate-500 mb-4" />
                <p className="text-white font-semibold">Aucun résultat chez notre fournisseur</p>
                <p className="text-slate-400 text-sm mt-1">
                  Essayez un autre mot-clé (marque ou modèle).
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {supplierResults.map((r) => (
                  <article
                    key={r.pid}
                    className="group flex flex-col rounded-3xl overflow-hidden bg-slate-900/60 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-slate-800">
                      {r.image ? (
                        <img
                          src={r.image}
                          alt={r.name}
                          loading="lazy"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-10 h-10 text-slate-600" />
                        </div>
                      )}
                      {r.category && (
                        <span className="absolute top-3 left-3 rounded-full bg-slate-950/80 backdrop-blur px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-cyan-300 border border-white/10">
                          {r.category}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 p-5">
                      <h3 className="text-white font-bold text-base leading-snug mb-2 line-clamp-2">
                        {r.name}
                      </h3>
                      <div className="mt-auto flex items-end justify-between pt-3">
                        <p className="text-2xl font-extrabold text-white">{CHF(r.price)}</p>
                      </div>
                      <button
                        onClick={() => addSupplierProduct(r.pid)}
                        disabled={importingPid === r.pid}
                        className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                      >
                        {importingPid === r.pid ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Ajout...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" /> Ajouter au panier
                          </>
                        )}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {cartOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setCartOpen(false);
              setCheckout(false);
              setOrderStatus('idle');
            }}
          />
          <div className="relative w-full max-w-md h-full bg-slate-900 border-l border-white/10 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
              <h3 className="text-white font-bold text-lg flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-400" />
                {checkout ? 'Finaliser la commande' : 'Votre panier'}
              </h3>
              <button
                onClick={() => {
                  setCartOpen(false);
                  setCheckout(false);
                  setOrderStatus('idle');
                }}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {orderStatus === 'success' ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Paiement confirmé</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Merci ! Votre paiement a été reçu et votre commande est
                      automatiquement validée. Vous recevez un email de confirmation
                      et nous préparons l'expédition.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      setCheckout(false);
                      setOrderStatus('idle');
                    }}
                    className="mt-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-white font-medium hover:bg-white/10 transition-colors"
                  >
                    Continuer mes achats
                  </button>
                  <button
                    onClick={() => {
                      setCartOpen(false);
                      setOrderStatus('idle');
                      onTrack();
                    }}
                    className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                  >
                    <Truck className="w-4 h-4" /> Suivre ma commande
                  </button>
                </div>
              ) : orderStatus === 'cancel' ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-2">
                  <div className="w-16 h-16 rounded-full bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
                    <AlertCircle className="w-8 h-8 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg">Paiement annulé</p>
                    <p className="text-slate-400 text-sm mt-1">
                      Votre paiement n'a pas été finalisé. Vos articles sont toujours
                      disponibles, vous pouvez réessayer quand vous le souhaitez.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setOrderStatus('idle');
                      setCheckout(false);
                    }}
                    className="mt-2 rounded-xl bg-white/5 border border-white/10 px-5 py-2.5 text-white font-medium hover:bg-white/10 transition-colors"
                  >
                    Retour à la boutique
                  </button>
                </div>
              ) : cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 text-slate-400">
                  <ShoppingCart className="w-10 h-10 text-slate-600" />
                  <p>Votre panier est vide.</p>
                </div>
              ) : !checkout ? (
                <div className="space-y-4">
                  {cart.map((l) => {
                    const u = unitPrice(l.product, l.qty);
                    const wholesale = l.qty >= l.product.wholesale_min_qty;
                    return (
                      <div
                        key={l.product.id}
                        className="flex gap-3 rounded-2xl bg-white/5 border border-white/10 p-3"
                      >
                        <img
                          src={l.product.image_url}
                          alt={l.product.name}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">
                            {l.product.name}
                          </p>
                          <p className="text-cyan-400 text-sm font-bold mt-0.5">
                            {CHF(u)}
                            {wholesale && (
                              <span className="ml-1 text-[10px] font-semibold uppercase text-emerald-400">
                                prix gros
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={() => setQty(l.product.id, l.qty - 1)}
                              className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={l.qty}
                              onChange={(e) =>
                                setQty(l.product.id, parseInt(e.target.value) || 1)
                              }
                              className="w-14 text-center rounded-lg bg-slate-950 border border-white/10 text-white text-sm py-1"
                            />
                            <button
                              onClick={() => setQty(l.product.id, l.qty + 1)}
                              className="w-7 h-7 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setQty(l.product.id, 0)}
                              className="ml-auto p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {!wholesale && (
                            <p className="text-[11px] text-slate-500 mt-1.5">
                              Encore {l.product.wholesale_min_qty - l.qty} pour le tarif de
                              gros ({CHF(l.product.wholesale_price)}/u.)
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <form id="checkout-form" onSubmit={handleCheckout} className="space-y-4">
                  {orderStatus === 'error' && (
                    <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-red-300 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {errorMsg ?? 'Une erreur est survenue. Merci de réessayer.'}
                    </div>
                  )}
                  <Field name="company" label="Entreprise (optionnel)" />
                  <Field name="contact" label="Nom du contact" required />
                  <Field
                    name="email"
                    label="Email"
                    type="email"
                    required
                    defaultValue={customerEmail ?? undefined}
                  />
                  <Field name="phone" label="Téléphone" type="tel" required />
                  <Field name="address" label="Adresse de livraison" required />
                  <div className="grid grid-cols-2 gap-3">
                    <Field name="zip" label="Code postal" required />
                    <Field name="city" label="Ville" required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field name="province" label="Canton / région" />
                    <Field name="country" label="Pays (code ISO)" defaultValue="CH" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Remarques
                    </label>
                    <textarea
                      name="notes"
                      rows={3}
                      className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
                    />
                  </div>
                  <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
                    <p className="text-sm font-medium text-slate-300 mb-3">
                      Paiement sécurisé
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 border border-white/10 px-3 py-2 text-sm text-white">
                        <CreditCard className="w-4 h-4 text-cyan-400" /> Carte bancaire
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 border border-white/10 px-3 py-2 text-sm text-white">
                        <Smartphone className="w-4 h-4 text-cyan-400" /> TWINT
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-3">
                      Vous serez redirigé vers notre page de paiement sécurisée. La
                      commande est validée automatiquement dès confirmation du paiement.
                    </p>
                  </div>
                </form>
              )}
            </div>

            {cart.length > 0 && orderStatus !== 'success' && orderStatus !== 'cancel' && (
              <div className="border-t border-white/10 px-6 py-5 space-y-3">
                {savings > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Économie tarif de gros</span>
                    <span>-{CHF(savings)}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400">Total</span>
                  <span className="text-2xl font-extrabold text-white">{CHF(total)}</span>
                </div>
                {!checkout ? (
                  <button
                    onClick={() => setCheckout(true)}
                    className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3.5 text-white font-semibold hover:opacity-90 transition-opacity"
                  >
                    Passer commande
                  </button>
                ) : (
                  <button
                    type="submit"
                    form="checkout-form"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3.5 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Redirection...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" /> Payer {CHF(total)}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function CatPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-medium border transition-colors ${
        active
          ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-transparent'
          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'
      }`}
    >
      {label}
    </button>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">
        {label}
        {required && <span className="text-cyan-400"> *</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
      />
    </div>
  );
}
