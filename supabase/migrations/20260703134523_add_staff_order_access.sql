/*
# Espace magasin — accès aux commandes pour les comptes staff

## Description
Ajoute les politiques de sécurité permettant aux comptes du magasin (utilisateurs
authentifiés via email/mot de passe) de consulter et de mettre à jour les commandes
passées par les clients. Les clients continuent de commander de façon anonyme; seuls
les comptes staff connectés peuvent lire le back-office.

## 1. Tables modifiées
- `orders`: ajout de politiques SELECT et UPDATE pour le rôle `authenticated`.

## 2. Sécurité (RLS)
- `orders` SELECT: réservé aux utilisateurs authentifiés (comptes magasin/staff).
- `orders` UPDATE: réservé aux utilisateurs authentifiés (mise à jour du statut).
- La politique d'insertion existante (anon + authenticated) est conservée pour le
  passage de commande depuis la boutique publique.

## 3. Notes importantes
1. Les comptes créés via l'écran de connexion de l'espace pro sont considérés comme
   des comptes staff/magasin. Ils ont accès à l'ensemble des commandes du back-office.
2. Aucune donnée n'est supprimée; seules des politiques sont ajoutées.
*/

DROP POLICY IF EXISTS "staff_select_orders" ON orders;
CREATE POLICY "staff_select_orders" ON orders FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_update_orders" ON orders;
CREATE POLICY "staff_update_orders" ON orders FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);