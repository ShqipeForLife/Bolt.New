/*
# Automatisation dropshipping — suivi de traitement et adresse structurée des commandes

## Description
Ajoute à la table `orders` les informations nécessaires à l'automatisation du
dropshipping : une adresse de livraison structurée (exigée par les fournisseurs
comme CJ Dropshipping pour créer une expédition), ainsi que le suivi de
l'exécution de la commande auprès du fournisseur (statut, identifiant de commande
fournisseur, numéro de suivi, transporteur, erreurs éventuelles).

## 1. Colonnes ajoutées à `orders`
- `ship_address` (text) — rue / n° de l'adresse de livraison.
- `ship_city` (text) — ville de livraison.
- `ship_zip` (text) — code postal.
- `ship_province` (text) — canton / région / état.
- `ship_country` (text, défaut 'CH') — code pays ISO à 2 lettres.
- `fulfillment_status` (text, défaut 'pending') — état d'exécution fournisseur :
  'pending' (en attente), 'processing' (envoyée au fournisseur), 'fulfilled'
  (expédiée), 'failed' (échec), 'manual' (à traiter manuellement).
- `supplier` (text, défaut 'cj') — code du fournisseur dropshipping.
- `supplier_order_id` (text) — identifiant de la commande chez le fournisseur.
- `tracking_number` (text) — numéro de suivi du colis.
- `tracking_url` (text) — lien de suivi.
- `carrier` (text) — transporteur / méthode logistique.
- `supplier_error` (text) — dernier message d'erreur renvoyé par le fournisseur.
- `fulfilled_at` (timestamptz) — date d'envoi au fournisseur.

## 2. Sécurité (RLS)
- Aucune nouvelle politique nécessaire : les colonnes sont couvertes par les
  politiques existantes (insertion anon/authenticated, lecture/mise à jour staff).

## 3. Notes importantes
1. Toutes les colonnes ont une valeur par défaut ou sont nullables : aucune donnée
   existante n'est perdue.
2. Le champ `address` texte libre existant est conservé pour compatibilité ;
   les nouveaux champs structurés servent à l'automatisation fournisseur.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='ship_address') THEN
    ALTER TABLE orders ADD COLUMN ship_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='ship_city') THEN
    ALTER TABLE orders ADD COLUMN ship_city text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='ship_zip') THEN
    ALTER TABLE orders ADD COLUMN ship_zip text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='ship_province') THEN
    ALTER TABLE orders ADD COLUMN ship_province text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='ship_country') THEN
    ALTER TABLE orders ADD COLUMN ship_country text NOT NULL DEFAULT 'CH';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='fulfillment_status') THEN
    ALTER TABLE orders ADD COLUMN fulfillment_status text NOT NULL DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='supplier') THEN
    ALTER TABLE orders ADD COLUMN supplier text NOT NULL DEFAULT 'cj';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='supplier_order_id') THEN
    ALTER TABLE orders ADD COLUMN supplier_order_id text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_number') THEN
    ALTER TABLE orders ADD COLUMN tracking_number text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='tracking_url') THEN
    ALTER TABLE orders ADD COLUMN tracking_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='carrier') THEN
    ALTER TABLE orders ADD COLUMN carrier text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='supplier_error') THEN
    ALTER TABLE orders ADD COLUMN supplier_error text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='fulfilled_at') THEN
    ALTER TABLE orders ADD COLUMN fulfilled_at timestamptz;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_email_idx ON orders (email);
CREATE INDEX IF NOT EXISTS orders_fulfillment_idx ON orders (fulfillment_status);
