/*
# Dropshipping — mapping fournisseur des produits et gestion back-office

## Description
Ajoute à la table `products` les champs de correspondance avec le fournisseur
dropshipping (CJ Dropshipping) pour permettre l'envoi automatique des commandes et
la synchronisation du stock. Ajoute également les politiques de sécurité permettant
aux comptes staff authentifiés de gérer le catalogue (création, modification,
suppression de produits) depuis le tableau de bord administrateur.

## 1. Colonnes ajoutées à `products`
- `supplier` (text, défaut 'cj') — code du fournisseur dropshipping.
- `supplier_pid` (text) — identifiant produit chez le fournisseur.
- `supplier_vid` (text) — identifiant de la variante (utilisé pour commander et
  synchroniser le stock).
- `supplier_sku` (text) — référence SKU côté fournisseur.
- `cost` (numeric, défaut 0) — coût d'achat unitaire chez le fournisseur (CHF).
- `last_stock_sync` (timestamptz) — date de dernière synchronisation du stock.

## 2. Sécurité (RLS)
- `products` : ajout des politiques INSERT, UPDATE et DELETE réservées au rôle
  `authenticated` (comptes staff du back-office). La lecture publique existante
  (anon + authenticated) est conservée pour la boutique.

## 3. Notes importantes
1. Toutes les colonnes ont une valeur par défaut ou sont nullables : aucune donnée
   existante n'est perdue.
2. Les produits non mappés (`supplier_vid` vide) restent gérés manuellement ; seuls
   les produits mappés sont expédiés/synchronisés automatiquement.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='supplier') THEN
    ALTER TABLE products ADD COLUMN supplier text NOT NULL DEFAULT 'cj';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='supplier_pid') THEN
    ALTER TABLE products ADD COLUMN supplier_pid text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='supplier_vid') THEN
    ALTER TABLE products ADD COLUMN supplier_vid text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='supplier_sku') THEN
    ALTER TABLE products ADD COLUMN supplier_sku text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='cost') THEN
    ALTER TABLE products ADD COLUMN cost numeric NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='products' AND column_name='last_stock_sync') THEN
    ALTER TABLE products ADD COLUMN last_stock_sync timestamptz;
  END IF;
END $$;

DROP POLICY IF EXISTS "staff_insert_products" ON products;
CREATE POLICY "staff_insert_products" ON products FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_update_products" ON products;
CREATE POLICY "staff_update_products" ON products FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "staff_delete_products" ON products;
CREATE POLICY "staff_delete_products" ON products FOR DELETE
  TO authenticated USING (true);
