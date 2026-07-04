import { useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  X,
  RefreshCw,
  Package,
  Star,
  Link2,
  Plug,
  CheckCircle2,
  XCircle,
  Search,
  Download,
} from 'lucide-react';
import { Product, CHF } from './types';

type CjResult = {
  pid: string;
  name: string;
  image: string;
  sku: string;
  price: number;
  category: string;
};

const empty: Partial<Product> = {
  name: '',
  description: '',
  price: 0,
  wholesale_price: 0,
  wholesale_min_qty: 10,
  image_url: '',
  category: 'CarPlay',
  stock: 0,
  featured: false,
  cost: 0,
  supplier: 'cj',
  supplier_pid: '',
  supplier_vid: '',
  supplier_sku: '',
};

export default function ProductsPanel({
  products,
  reload,
  supplierConfigured,
}: {
  products: Product[];
  reload: () => Promise<void>;
  supplierConfigured: boolean;
}) {
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<CjResult[]>([]);
  const [searchErr, setSearchErr] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [importingPid, setImportingPid] = useState<string | null>(null);
  const [importedPids, setImportedPids] = useState<Set<string>>(new Set());

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    const payload = {
      name: editing.name,
      description: editing.description ?? '',
      price: Number(editing.price) || 0,
      wholesale_price: Number(editing.wholesale_price) || 0,
      wholesale_min_qty: Number(editing.wholesale_min_qty) || 1,
      image_url: editing.image_url ?? '',
      category: editing.category ?? 'CarPlay',
      stock: Number(editing.stock) || 0,
      featured: Boolean(editing.featured),
      cost: Number(editing.cost) || 0,
      supplier: editing.supplier ?? 'cj',
      supplier_pid: editing.supplier_pid || null,
      supplier_vid: editing.supplier_vid || null,
      supplier_sku: editing.supplier_sku || null,
    };
    const res = editing.id
      ? await supabase.from('products').update(payload).eq('id', editing.id)
      : await supabase.from('products').insert([payload]);
    setSaving(false);
    if (res.error) {
      setError('Enregistrement impossible.');
      return;
    }
    setEditing(null);
    await reload();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) await reload();
  };

  const syncStock = async () => {
    setSyncing(true);
    setSyncMsg(null);
    const { data, error } = await supabase.functions.invoke('supplier', {
      body: { action: 'sync-stock' },
    });
    setSyncing(false);
    if (error || data?.error) {
      setSyncMsg(data?.error ?? 'Synchronisation impossible.');
      return;
    }
    setSyncMsg(`${data?.updated ?? 0} produit(s) synchronisé(s).`);
    await reload();
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const { data, error } = await supabase.functions.invoke('supplier', {
      body: { action: 'test-auth' },
    });
    setTesting(false);
    if (error || data?.ok === false) {
      setTestResult({ ok: false, msg: data?.error ?? 'Connexion CJ échouée.' });
      return;
    }
    setTestResult({ ok: true, msg: data?.message ?? 'Connexion CJ réussie.' });
  };

  const runSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchErr(null);
    setSearched(true);
    const { data, error } = await supabase.functions.invoke('supplier', {
      body: { action: 'search-products', keyword: query.trim(), page: 1 },
    });
    setSearching(false);
    if (error || data?.error) {
      setSearchErr(data?.error ?? 'Recherche impossible.');
      setResults([]);
      return;
    }
    setResults((data?.products ?? []) as CjResult[]);
  };

  const importProduct = async (pid: string) => {
    setImportingPid(pid);
    const { data, error } = await supabase.functions.invoke('supplier', {
      body: { action: 'import-product', pid },
    });
    setImportingPid(null);
    if (error || data?.error) {
      setSearchErr(data?.error ?? 'Import impossible.');
      return;
    }
    setImportedPids((prev) => new Set(prev).add(pid));
    await reload();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing({ ...empty })}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Nouveau produit
          </button>
          <button
            onClick={() => setImportOpen(true)}
            disabled={!supplierConfigured}
            title={supplierConfigured ? '' : 'Fournisseur non connecté'}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Download className="w-4 h-4" /> Importer depuis CJ
          </button>
          <button
            onClick={syncStock}
            disabled={syncing || !supplierConfigured}
            title={supplierConfigured ? '' : 'Fournisseur non connecté'}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Synchroniser le stock
          </button>
          <button
            onClick={testConnection}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-white text-sm font-medium hover:bg-white/10 transition-colors disabled:opacity-40"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
            Tester la connexion CJ
          </button>
        </div>
        <div className="flex items-center gap-3">
          {testResult && (
            <span
              className={`inline-flex items-center gap-1.5 text-sm ${
                testResult.ok ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {testResult.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
              {testResult.msg}
            </span>
          )}
          {syncMsg && <span className="text-sm text-slate-400">{syncMsg}</span>}
        </div>
      </div>

      {products.length === 0 && (
        <p className="text-slate-400 text-center py-16">Aucun produit. Ajoutez-en un.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((p) => (
          <article key={p.id} className="rounded-2xl bg-slate-900/60 border border-white/10 p-4 flex gap-4">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0">
              {p.image_url ? (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-slate-600" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="text-white font-semibold truncate">{p.name}</p>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => setEditing(p)}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => remove(p.id)}
                    className="p-1.5 text-slate-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap text-xs">
                <span className="text-cyan-300 font-semibold">{CHF(Number(p.price))}</span>
                <span className="text-slate-500">Stock : {p.stock}</span>
                {p.featured && (
                  <span className="inline-flex items-center gap-0.5 text-amber-300">
                    <Star className="w-3 h-3" /> Best-seller
                  </span>
                )}
                <span
                  className={`inline-flex items-center gap-0.5 ${
                    p.supplier_vid ? 'text-emerald-300' : 'text-slate-500'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  {p.supplier_vid ? 'Mappé CJ' : 'Non mappé'}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>

      {importOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setImportOpen(false)}
          />
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-white font-bold text-lg">Importer depuis CJ Dropshipping</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Recherchez le catalogue CJ (en anglais). Ex : « carplay dongle », « virtual cockpit audi ».
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="p-2 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={runSearch} className="flex gap-2 mb-4">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mot-clé produit (anglais)"
                className="flex-1 rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
              />
              <button
                type="submit"
                disabled={searching || !query.trim()}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-2.5 text-white text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Rechercher
              </button>
            </form>

            {searchErr && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-red-300 text-sm mb-3">
                {searchErr}
              </div>
            )}

            <div className="flex-1 overflow-y-auto -mx-1 px-1 space-y-2">
              {searched && !searching && results.length === 0 && !searchErr && (
                <p className="text-slate-400 text-center py-12 text-sm">
                  Aucun résultat pour cette recherche.
                </p>
              )}
              {results.map((r) => {
                const done = importedPids.has(r.pid);
                return (
                  <div
                    key={r.pid}
                    className="flex items-center gap-3 rounded-2xl bg-slate-950/60 border border-white/10 p-3"
                  >
                    <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                      {r.image ? (
                        <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium line-clamp-2">{r.name}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span className="text-emerald-300 font-semibold">
                          Coût ~ ${r.price.toFixed(2)}
                        </span>
                        {r.category && <span className="truncate">{r.category}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => importProduct(r.pid)}
                      disabled={done || importingPid === r.pid}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-60 flex-shrink-0 text-white hover:bg-white/10"
                    >
                      {importingPid === r.pid ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {done ? 'Importé' : 'Importer'}
                    </button>
                  </div>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500 mt-3">
              Le prix de vente est copié depuis le coût CJ — ajustez votre marge ensuite en modifiant le produit.
            </p>
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <form
            onSubmit={save}
            className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-white/10 p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-white font-bold text-lg">
                {editing.id ? 'Modifier le produit' : 'Nouveau produit'}
              </h3>
              <button type="button" onClick={() => setEditing(null)} className="p-2 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2.5 text-red-300 text-sm">
                {error}
              </div>
            )}

            <PField label="Nom" value={editing.name ?? ''} onChange={(v) => setEditing({ ...editing, name: v })} required />
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Description</label>
              <textarea
                value={editing.description ?? ''}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
                className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
            <PField label="URL de l'image" value={editing.image_url ?? ''} onChange={(v) => setEditing({ ...editing, image_url: v })} />
            <div className="grid grid-cols-2 gap-3">
              <PField label="Prix (CHF)" type="number" value={String(editing.price ?? 0)} onChange={(v) => setEditing({ ...editing, price: Number(v) })} />
              <PField label="Prix gros (CHF)" type="number" value={String(editing.wholesale_price ?? 0)} onChange={(v) => setEditing({ ...editing, wholesale_price: Number(v) })} />
              <PField label="Qté min. gros" type="number" value={String(editing.wholesale_min_qty ?? 1)} onChange={(v) => setEditing({ ...editing, wholesale_min_qty: Number(v) })} />
              <PField label="Coût achat (CHF)" type="number" value={String(editing.cost ?? 0)} onChange={(v) => setEditing({ ...editing, cost: Number(v) })} />
              <PField label="Stock" type="number" value={String(editing.stock ?? 0)} onChange={(v) => setEditing({ ...editing, stock: Number(v) })} />
              <PField label="Catégorie" value={editing.category ?? ''} onChange={(v) => setEditing({ ...editing, category: v })} />
            </div>

            <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
              <p className="text-sm font-semibold text-slate-200">Mapping fournisseur (CJ Dropshipping)</p>
              <div className="grid grid-cols-2 gap-3">
                <PField label="Product ID (PID)" value={editing.supplier_pid ?? ''} onChange={(v) => setEditing({ ...editing, supplier_pid: v })} />
                <PField label="Variant ID (VID)" value={editing.supplier_vid ?? ''} onChange={(v) => setEditing({ ...editing, supplier_vid: v })} />
              </div>
              <PField label="SKU fournisseur" value={editing.supplier_sku ?? ''} onChange={(v) => setEditing({ ...editing, supplier_sku: v })} />
              <p className="text-[11px] text-slate-500">
                Le Variant ID (VID) est requis pour l'envoi automatique de la commande et la
                synchronisation du stock.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={Boolean(editing.featured)}
                onChange={(e) => setEditing({ ...editing, featured: e.target.checked })}
                className="w-4 h-4 rounded"
              />
              Mettre en avant (best-seller)
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 px-4 py-3 text-white font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Enregistrer
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function PField({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        required={required}
        step={type === 'number' ? 'any' : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-slate-950 border border-white/10 text-white text-sm px-3 py-2.5 focus:outline-none focus:border-cyan-500/60"
      />
    </div>
  );
}
