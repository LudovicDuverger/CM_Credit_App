# CM Credit App

## Mode Production (démo client)

Un seul terminal suffit — le backend sert le frontend buildé.

**Étape 1 : builder le frontend (une seule fois, ou après chaque modification UI)**

```bash
cd maestro-ui
npm run build
```

**Étape 2 : démarrer le backend**

```bash
cd backend
npm start
```

Accès à l'application : **http://localhost:3001**

Au démarrage, vérifier que le terminal affiche :

```
Frontend statique: maestro-ui/dist servi par le backend
```

Si la ligne indique `non servi`, c'est que le build est absent — relancer l'étape 1.

---

## Mode Développement

Deux terminaux, deux processus séparés.

**Terminal 1 — Backend**

```bash
cd backend
npm install
npm run dev
```

**Terminal 2 — Frontend**

```bash
cd maestro-ui
npm install
npm run dev
```

URLs :
- Frontend (Vite) : `http://localhost:5175`
- Backend (API) : `http://localhost:3001`

---

## Configuration OAuth (IMPORTANT)

La redirect URI OAuth est **dynamique** : elle utilise automatiquement `window.location.origin`, donc elle s'adapte au port en cours (`3001` en prod, `5175` en dev) sans aucune configuration.

La variable `VITE_UIPATH_REDIRECT_URI` ne doit **pas** être définie dans `maestro-ui/.env` — si elle est présente, elle écrase ce comportement dynamique.

L'URL de redirect doit être enregistrée comme **Redirect URI autorisée** dans la configuration de l'External Application UiPath pour chaque port utilisé (`localhost:3001` et `localhost:5175`).

---

## Arrêter les processus Node en cas de blocage de port

```powershell
Get-Process node | Stop-Process -Force
```
