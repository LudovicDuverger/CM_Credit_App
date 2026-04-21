import { Router } from 'express';
import { TaskType } from '@uipath/uipath-typescript/tasks';
import { hasClientCredentials, hasUiPathBaseConfig, uiPathConfig } from '../config/uipath.ts';
import { createUiPathSdkContext, resolveFolderIdFromTask } from '../lib/uipath-sdk.ts';
import {
  getBearerTokenFromRequest,
  resolveAuthToken,
  uiPathJsonRequestWithHeaders,
} from '../lib/uipath-client.ts';

const router = Router();

const buildFolderHeaders = () => (
  uiPathConfig.folderKey ? { 'X-UIPATH-FolderKey': uiPathConfig.folderKey } : {}
);

const parseTaskId = (rawTaskId) => {
  const value = String(rawTaskId || '').trim();
  if (!/^\d+$/.test(value)) return null;
  return Number(value);
};

const decodeJwtPayload = (token) => {
  try {
    const [, payload = ''] = String(token || '').split('.');
    if (!payload) return {};
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
  } catch (_error) {
    return {};
  }
};

const normalizeTaskTypeForSdk = (taskType) => {
  const normalized = String(taskType || '').trim().toLowerCase();
  if (normalized === 'apptask') return TaskType.App;
  if (normalized === 'externaltask') return TaskType.External;
  if (normalized === 'documentvalidationtask') return TaskType.DocumentValidation;
  if (normalized === 'documentclassificationtask') return TaskType.DocumentClassification;
  if (normalized === 'datalabelingtask') return TaskType.DataLabeling;
  return TaskType.Form;
};

const toLegacyTaskShape = (task) => ({
  ...task,
  Id: task?.Id ?? task?.id,
  Title: task?.Title ?? task?.title,
  Status: task?.Status ?? task?.status,
  Type: task?.Type ?? task?.type,
  Priority: task?.Priority ?? task?.priority,
  TaskAssigneeName: task?.TaskAssigneeName ?? task?.taskAssigneeName,
  CreationTime: task?.CreationTime ?? task?.createdTime,
  CompletionTime: task?.CompletionTime ?? task?.completedTime,
  formLayout: task?.formLayout,
  formLayoutId: task?.formLayoutId,
  bulkFormLayoutId: task?.bulkFormLayoutId,
  actionLabel: task?.actionLabel,
  data: task?.data,
  action: task?.action,
  assignedToUser: task?.assignedToUser,
  type: task?.type,
  title: task?.title,
});

const ensureUiPathTaskAccess = async (req, res) => {
  if (!hasUiPathBaseConfig()) {
    res.status(400).json({ message: 'Mode mock actif: les actions sur AppTasks ne sont disponibles qu’en mode UiPath.' });
    return null;
  }

  if (!getBearerTokenFromRequest(req) && !hasClientCredentials()) {
    res.status(401).json({
      message: 'Mode UiPath actif mais aucun token OAuth fourni. Envoie Authorization: Bearer <token> ou configure UIPATH_CLIENT_SECRET.',
    });
    return null;
  }

  return resolveAuthToken(req);
};

const getTaskById = async (token, taskId) => {
  try {
    const sdk = createUiPathSdkContext(token);
    const task = await sdk.tasks.getById(taskId);
    return toLegacyTaskShape(task);
  } catch (_error) {
    // Fallback to raw endpoint if SDK cannot resolve task in a specific tenant.
  }

  const rawTask = await uiPathJsonRequestWithHeaders(
    token,
    `orchestrator_/odata/Tasks(${taskId})`,
    {},
    buildFolderHeaders(),
  );
  return toLegacyTaskShape(rawTask);
};

router.get('/tasks/:taskId', async (req, res) => {
  const taskId = parseTaskId(req.params.taskId);
  if (taskId === null) {
    res.status(400).json({ message: 'taskId invalide. Un entier UiPath est attendu.' });
    return;
  }

  try {
    const token = await ensureUiPathTaskAccess(req, res);
    if (!token) return;
    const task = await getTaskById(token, taskId);
    res.json(task);
  } catch (error) {
    res.status(502).json({ message: `Erreur backend UiPath: ${error.message}` });
  }
});

router.get('/tasks/:taskId/form', async (req, res) => {
  const taskId = parseTaskId(req.params.taskId);
  if (taskId === null) {
    res.status(400).json({ message: 'taskId invalide. Un entier UiPath est attendu.' });
    return;
  }

  try {
    const token = await ensureUiPathTaskAccess(req, res);
    if (!token) return;

    const task = await getTaskById(token, taskId);
    if (task?.formLayout || task?.data || task?.formLayoutId) {
      res.json(task);
      return;
    }

    const form = await uiPathJsonRequestWithHeaders(
      token,
      'orchestrator_/forms/TaskForms/GetTaskFormById',
      { taskId },
      buildFolderHeaders(),
    );
    res.json(form);
  } catch (error) {
    res.status(502).json({ message: `Erreur backend UiPath: ${error.message}` });
  }
});

router.post('/tasks/:taskId/assign-self', async (req, res) => {
  const taskId = parseTaskId(req.params.taskId);
  if (taskId === null) {
    res.status(400).json({ message: 'taskId invalide. Un entier UiPath est attendu.' });
    return;
  }

  try {
    const token = await ensureUiPathTaskAccess(req, res);
    if (!token) return;

    const task = await getTaskById(token, taskId);
    const rawBearerToken = getBearerTokenFromRequest(req);
    const jwtPayload = decodeJwtPayload(rawBearerToken);
    const userNameOrEmail = String(
      jwtPayload.preferred_username
      || jwtPayload.email
      || jwtPayload.name
      || '',
    ).trim();

    if (!userNameOrEmail) {
      res.status(204).send();
      return;
    }

    const taskAssigneeName = String(task?.TaskAssigneeName || task?.taskAssigneeName || '').trim().toLowerCase();
    if (taskAssigneeName && taskAssigneeName.includes(userNameOrEmail.toLowerCase())) {
      res.status(204).send();
      return;
    }

    const sdk = createUiPathSdkContext(token);
    await sdk.tasks.assign({ taskId, userNameOrEmail });
    res.status(204).send();
  } catch (_error) {
    res.status(204).send();
  }
});

router.post('/tasks/:taskId/complete', async (req, res) => {
  const taskId = parseTaskId(req.params.taskId);
  if (taskId === null) {
    res.status(400).json({ message: 'taskId invalide. Un entier UiPath est attendu.' });
    return;
  }

  const action = String(req.body?.action || '').trim();
  const data = req.body?.data ?? req.body?.taskData ?? req.body?.outputData ?? {};

  if (!action) {
    res.status(400).json({ message: "Le champ 'action' est requis pour compléter la tâche (ex: submit)." });
    return;
  }

  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    res.status(400).json({ message: "Le champ 'data' doit être un objet JSON contenant les valeurs de sortie." });
    return;
  }

  try {
    const token = await ensureUiPathTaskAccess(req, res);
    if (!token) return;

    const task = await getTaskById(token, taskId);
    const folderId = resolveFolderIdFromTask(task);
    if (!folderId) {
      res.status(502).json({
        message: `Erreur backend UiPath: impossible de determiner folderId pour la tâche ${taskId}.`,
        hint: 'Configure UIPATH_FOLDER_ID ou verifie les metadonnees folderId de la tâche.',
      });
      return;
    }

    const sdk = createUiPathSdkContext(token);
    const response = await sdk.tasks.complete(
      {
        taskId,
        type: normalizeTaskTypeForSdk(task?.Type || task?.type),
        action,
        data,
      },
      folderId,
    );

    res.json(response?.data || { success: response?.success ?? true });
  } catch (error) {
    res.status(502).json({ message: `Erreur backend UiPath: ${error.message}` });
  }
});

export default router;

