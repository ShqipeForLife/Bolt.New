/*
# Dropshipping — cache des jetons d'authentification fournisseur

## Description
Crée la table `supplier_auth` qui stocke le jeton d'accès (access token) du
fournisseur dropshipping. L'API CJ Dropshipping limite fortement la fréquence
d'appel à son point d'authentification (un appel toutes les ~5 minutes) et fournit
un jeton valable plusieurs jours ; il est donc indispensable de mettre ce jeton en
cache dans la base plutôt que de le régénérer à chaque requête.

## 1. Nouvelle table
### `supplier_auth`
- `provider` (text, clé primaire) — code du fournisseur (ex: 'cj').
- `access_token` (text) — jeton d'accès courant.
- `expires_at` (timestamptz) — date d'expiration du jeton.
- `updated_at` (timestamptz) — date de dernière mise à jour.

## 2. Sécurité (RLS)
- RLS activée. AUCUNE politique n'est créée : la table est donc totalement
  inaccessible via la clé anonyme ou un utilisateur authentifié. Seules les
  fonctions edge utilisant la clé service_role (qui contourne RLS) peuvent la lire
  ou l'écrire. C'est volontaire : un jeton d'API ne doit jamais être exposé au
  navigateur.

## 3. Notes importantes
1. Cette table ne contient jamais la clé API du fournisseur (celle-ci reste dans
   les variables d'environnement sécurisées), uniquement le jeton temporaire dérivé.
*/

CREATE TABLE IF NOT EXISTS supplier_auth (
  provider text PRIMARY KEY,
  access_token text NOT NULL DEFAULT '',
  expires_at timestamptz,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE supplier_auth ENABLE ROW LEVEL SECURITY;
