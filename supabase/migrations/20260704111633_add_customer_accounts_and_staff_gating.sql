/*
# Comptes clients + verrouillage du back-office au staff

## Description
Introduit des comptes clients (connexion email/mot de passe) qui peuvent consulter
leurs propres commandes, tout en restreignant l'accès au back-office (commandes,
rendez-vous, gestion du catalogue) aux seuls comptes du staff. Auparavant, TOUT
utilisateur authentifié avait accès au back-office ; avec l'arrivée des comptes
clients (eux aussi authentifiés), il est indispensable de distinguer staff et clients.

## 1. Nouvelle table
### `staff_members`
- `user_id` (uuid, clé primaire, référence auth.users) — compte appartenant à l'équipe.
- `created_at` (timestamptz)
Les comptes existants sont considérés comme staff et sont insérés automatiquement.

## 2. Table modifiée : `orders`
- Ajout de `user_id` (uuid, nullable, défaut auth.uid()) — propriétaire de la commande
  lorsqu'elle est passée par un client connecté. Les commandes anonymes restent à null.

## 3. Sécurité (RLS)
- `staff_members` : chaque utilisateur peut lire sa propre ligne (pour savoir s'il est staff).
- `orders` :
  - Le staff (présent dans staff_members) lit et met à jour TOUTES les commandes.
  - Un client lit uniquement ses commandes (via user_id OU via l'email de son compte).
  - Insertion autorisée pour anon et authenticated (passage de commande).
- `products` : les écritures (insert/update/delete) sont désormais réservées au staff.
- `appointments` : la lecture est désormais réservée au staff.

## 4. Notes importantes
1. Aucune donnée n'est supprimée ; on ajoute une colonne, une table et on renforce les
   politiques existantes.
2. Un client voit aussi les commandes anonymes passées avec la même adresse email que
   son compte, ce qui évite toute perte d'historique.
*/

-- 1. Table staff
CREATE TABLE IF NOT EXISTS staff_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_self" ON staff_members;
CREATE POLICY "staff_read_self" ON staff_members FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

-- Les comptes déjà existants sont l'équipe : on les enregistre comme staff.
INSERT INTO staff_members (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 2. Propriétaire de commande
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE orders
      ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS orders_user_id_idx ON orders (user_id);

-- 3. Politiques orders : staff par appartenance, client par propriété/email
DROP POLICY IF EXISTS "staff_select_orders" ON orders;
CREATE POLICY "staff_select_orders" ON orders FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_members s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "staff_update_orders" ON orders;
CREATE POLICY "staff_update_orders" ON orders FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_members s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff_members s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "customer_select_own_orders" ON orders;
CREATE POLICY "customer_select_own_orders" ON orders FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR lower(email) = lower(auth.jwt() ->> 'email')
  );

DROP POLICY IF EXISTS "public_insert_orders" ON orders;
DROP POLICY IF EXISTS "anon_insert_orders" ON orders;
CREATE POLICY "anon_insert_orders" ON orders FOR INSERT
  TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "auth_insert_orders" ON orders;
CREATE POLICY "auth_insert_orders" ON orders FOR INSERT
  TO authenticated WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 4. Écritures produits réservées au staff
DROP POLICY IF EXISTS "staff_insert_products" ON products;
CREATE POLICY "staff_insert_products" ON products FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM staff_members s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "staff_update_products" ON products;
CREATE POLICY "staff_update_products" ON products FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_members s WHERE s.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM staff_members s WHERE s.user_id = auth.uid()));

DROP POLICY IF EXISTS "staff_delete_products" ON products;
CREATE POLICY "staff_delete_products" ON products FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_members s WHERE s.user_id = auth.uid()));

-- 5. Lecture des rendez-vous réservée au staff
DROP POLICY IF EXISTS "select_appointments" ON appointments;
CREATE POLICY "select_appointments" ON appointments FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM staff_members s WHERE s.user_id = auth.uid()));
