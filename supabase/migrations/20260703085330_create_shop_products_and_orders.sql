/*
# Boutique en ligne — Catalogue de boîtiers CarPlay et commandes en gros

## Description
Ajoute la partie e-commerce du site: un catalogue public de boîtiers CarPlay/Android Auto
externes et une table de commandes en gros passées par les clients professionnels.

## 1. Nouvelles tables

### `products` (catalogue public, lecture seule côté site)
- `id` (uuid, clé primaire)
- `name` (text) — nom du produit
- `description` (text) — description commerciale
- `price` (numeric) — prix unitaire au détail (CHF)
- `wholesale_price` (numeric) — prix unitaire en gros (CHF)
- `wholesale_min_qty` (int) — quantité minimale pour le tarif de gros
- `image_url` (text) — URL de l'image produit
- `category` (text) — catégorie (ex: CarPlay, Android Auto, Accessoire)
- `stock` (int) — stock disponible
- `featured` (boolean) — produit mis en avant
- `created_at` (timestamptz)

### `orders` (commandes clients)
- `id` (uuid, clé primaire)
- `company_name` (text) — raison sociale (optionnel)
- `contact_name` (text) — nom du contact
- `email` (text) — email de contact
- `phone` (text) — téléphone
- `address` (text) — adresse de livraison
- `items` (jsonb) — lignes de commande [{product_id, name, qty, unit_price}]
- `total` (numeric) — montant total (CHF)
- `notes` (text) — remarques éventuelles
- `status` (text) — statut de traitement (défaut: pending)
- `created_at` (timestamptz)

## 2. Sécurité (RLS)
- RLS activée sur les deux tables.
- `products`: lecture publique (anon + authenticated), le catalogue est volontairement public.
  Aucune écriture publique (gestion réservée à l'administration via la console).
- `orders`: insertion autorisée (anon + authenticated) pour permettre à un client de passer
  commande. Pas de lecture publique afin de protéger les données des clients.

## 3. Notes importantes
1. L'application ne comporte pas d'authentification: les politiques ciblent donc anon
   et authenticated pour que le site public puisse lire le catalogue et créer des commandes.
2. Les prix sont exprimés en CHF.
*/

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  wholesale_price numeric NOT NULL DEFAULT 0,
  wholesale_min_qty int NOT NULL DEFAULT 10,
  image_url text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'CarPlay',
  stock int NOT NULL DEFAULT 0,
  featured boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_select_products" ON products;
CREATE POLICY "public_select_products" ON products FOR SELECT
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  address text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
CREATE POLICY "public_insert_orders" ON orders FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS products_featured_idx ON products (featured);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);