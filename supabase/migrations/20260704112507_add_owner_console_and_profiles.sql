/*
# Console propriétaire (accès par code, sans compte) + profils clients

## Description
1. Ajoute la table `owner_console` qui permet de sécuriser le tableau de bord
   propriétaire par un simple CODE D'ACCÈS, sans inscription ni compte email visible.
   Le code est stocké HACHÉ (SHA-256 + sel). La table conserve aussi les identifiants
   techniques d'un utilisateur "console" caché (créé automatiquement côté serveur) qui
   sert à ouvrir une session Supabase valide pour le back-office. Cette table est
   accessible UNIQUEMENT par le rôle service (edge functions) : RLS activée sans aucune
   policy, donc ni anon ni authenticated ne peuvent la lire ou l'écrire.

2. Ajoute la table `profiles` pour que chaque client puisse enregistrer et modifier ses
   informations personnelles (nom, téléphone, entreprise). Chaque client ne voit et ne
   modifie que sa propre fiche.

## 1. Nouvelles tables
### `owner_console` (secret, service-role uniquement)
- `id` (int, singleton = 1)
- `access_code_hash` (text) — hachage du code d'accès propriétaire
- `code_salt` (text) — sel utilisé pour le hachage
- `session_email` (text) — email de l'utilisateur console caché
- `session_password` (text) — mot de passe technique de l'utilisateur console
- `created_at`, `updated_at`

### `profiles` (une fiche par client)
- `user_id` (uuid, clé primaire, défaut auth.uid())
- `full_name` (text) — nom complet
- `phone` (text) — téléphone
- `company` (text) — entreprise (optionnel)
- `updated_at`

## 2. Sécurité (RLS)
- `owner_console` : RLS activée, AUCUNE policy → inaccessible via les clés anon/authenticated,
  seul le rôle service (edge functions) y accède. Choix volontaire car la table contient
  des secrets.
- `profiles` : RLS activée, CRUD limité au propriétaire de la fiche (auth.uid() = user_id).

## 3. Notes importantes
1. Aucune donnée existante n'est supprimée.
2. Le code d'accès n'est jamais stocké en clair.
*/

CREATE TABLE IF NOT EXISTS owner_console (
  id int PRIMARY KEY DEFAULT 1,
  access_code_hash text,
  code_salt text,
  session_email text,
  session_password text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT owner_console_singleton CHECK (id = 1)
);

ALTER TABLE owner_console ENABLE ROW LEVEL SECURITY;
-- Volontairement aucune policy : accès réservé au rôle service (edge functions).

CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
