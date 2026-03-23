# CM Credit App

Refactor en architecture séparée:

- `backend/`: API Node.js (Express)
- `frontend/`: interface AngularJS (templates HTML séparés)

## Démarrage

1. Installer les dépendances backend:

```bash
cd backend
npm install
```

2. Lancer l'application:

```bash
npm run dev
```

Puis ouvrir:

`http://localhost:3001`

## Mode UiPath réel (au lieu des données mock)

1. Copier le fichier d'exemple:

```bash
cd backend
cp .env.example .env
```

2. Renseigner les valeurs dans `backend/.env`:

- `UIPATH_BASE_URL`
- `UIPATH_ORG_NAME`
- `UIPATH_TENANT_NAME`
- `UIPATH_CLIENT_ID`
- `UIPATH_CLIENT_SECRET`
- `UIPATH_SCOPE`

3. Redémarrer le backend:

```bash
npm run dev
```

Tu peux vérifier le mode actif avec `GET /api/source`:

- `"mode":"mock"` = configuration incomplète
- `"mode":"uipath"` = données UiPath actives

## Structure frontend (templates)

- `frontend/app/templates/home.html`
- `frontend/app/templates/case-detail.html`

Tu peux modifier ces templates directement pour changer l'aspect visuel des pages.

## Endpoints API

- `GET /api/health`
- `GET /api/cases`
- `GET /api/cases/:id`


## LAncer lee serveur
cd /Users/ludovic.duverger/Projets/CM_Credit_APPV2
pkill -f "node server.js" 2>/dev/null || true
cd /Users/ludovic.duverger/Projets/CM_Credit_APPV2/backend
node server.js

## Dans un autre terminal (test rapide) :
curl -s http://localhost:3001/api/health


https://staging.uipath.com/france/DefaultTenant/maestro_/case-management/f49c9887-2dee-41cf-97df-fc023ee56c20/overview?folderKey=ca3a3767-d130-4db1-ab3b-d7664a8d72f4
https://staging.uipath.com/france/DefaultTenant/maestro_/case-management/f49c9887-2dee-41cf-97df-fc023ee56c20/overview?folderKey=0c787285-7c32-4140-ae2b-8cb5b8e36463


https://staging.uipath.com/france/DefaultTenant/maestro_/case-management/f49c9887-2dee-41cf-97df-fc023ee56c20/overview?folderKey=0c787285-7c32-4140-ae2b-8cb5b8e36463