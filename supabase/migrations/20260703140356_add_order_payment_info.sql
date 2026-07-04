/*
# Ajout des informations de paiement aux commandes

## Description
Ajoute le suivi du moyen et du statut de paiement pour les commandes de la boutique.
La solution de paiement retenue (hors Stripe) est le virement bancaire (QR-facture
suisse) ainsi que TWINT : le client passe commande, reçoit les coordonnées de
paiement, et l'équipe marque la commande comme payée depuis l'espace pro.

## 1. Colonnes ajoutées à `orders`
- `payment_method` (text, défaut 'bank_transfer') : 'bank_transfer' ou 'twint'.
- `payment_status` (text, défaut 'unpaid') : 'unpaid' ou 'paid'.

## 2. Sécurité (RLS)
- Aucune nouvelle politique nécessaire : l'insertion (anon/authenticated) et la mise
  à jour (staff authentifié) existantes couvrent ces colonnes.

## 3. Notes importantes
1. Colonnes ajoutées avec valeurs par défaut : aucune donnée existante n'est perdue.
2. Le contrôle du paiement reste manuel (marquage "payé" par l'équipe), adapté au
   virement bancaire et à TWINT.
*/

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'bank_transfer';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';