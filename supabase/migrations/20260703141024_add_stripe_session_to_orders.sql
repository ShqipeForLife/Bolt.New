/*
# Corrélation des paiements Stripe

## Description
Ajoute la référence de session Stripe Checkout sur les commandes afin de relier une
commande au paiement en ligne (cartes bancaires et TWINT) et d'assurer l'idempotence
du webhook qui valide automatiquement la commande une fois le paiement confirmé.

## 1. Colonne ajoutée à `orders`
- `stripe_session_id` (text, nullable) : identifiant de la session Stripe Checkout.

## 2. Sécurité (RLS)
- Aucune nouvelle politique : les fonctions edge utilisent la clé service role et
  contournent la RLS ; l'insertion/mise à jour existantes couvrent le reste.

## 3. Notes importantes
1. Colonne nullable : aucune donnée existante n'est perdue.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_session_id text;
CREATE INDEX IF NOT EXISTS orders_stripe_session_idx ON orders (stripe_session_id);