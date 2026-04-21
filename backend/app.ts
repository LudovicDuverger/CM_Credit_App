import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import systemRouter from './routes/system.ts';
import casesRouter from './routes/cases.ts';
import documentsRouter from './routes/documents.ts';
import loanRequestsRouter from './routes/loan-requests.ts';
import oauthRouter from './routes/oauth.ts';
import tasksRouter from './routes/tasks.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendDistPath = path.resolve(__dirname, '..', 'maestro-ui', 'dist');
const frontendEntryPath = path.join(frontendDistPath, 'index.html');

export const createApp = () => {
  const app = express();
  const hasFrontendBuild = fs.existsSync(frontendEntryPath);

  app.use(cors());
  app.use(express.json());

  app.use('/api', systemRouter);
  app.use('/api', loanRequestsRouter);
  app.use('/api', casesRouter);
  app.use('/api', tasksRouter);
  app.use('/api', documentsRouter);
  app.use('/api', oauthRouter);

  if (hasFrontendBuild) {
    app.use(express.static(frontendDistPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path === '/api') {
        return next();
      }
      res.sendFile(frontendEntryPath);
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({
        ok: true,
        message: 'Backend API running. Frontend is served separately in dev from maestro-ui, or from maestro-ui/dist after a production build.',
      });
    });
  }

  return {
    app,
    hasFrontendBuild,
  };
};
