import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 3001;


const uiPathConfig = {
  baseUrl: (process.env.UIPATH_BASE_URL || '').replace(/\/+$/, ''),
  orgName: (process.env.UIPATH_ORG_NAME || '').trim(),
  tenantName: (process.env.UIPATH_TENANT_NAME || '').trim(),
  folderKey: (process.env.UIPATH_FOLDER_KEY || '').trim(),
  clientId: (process.env.UIPATH_CLIENT_ID || '').trim(),
  clientSecret: (process.env.UIPATH_CLIENT_SECRET || '').trim(),
  scope: (process.env.UIPATH_SCOPE || 'OR.Execution OR.Folders OR.Jobs OR.Tasks PIMS DataFabric.Data.Read DataFabric.Data.Write DataFabric.Schema.Read').trim(),
  targetProcessKey: (process.env.TARGET_CASE_PROCESS_KEY || 'CM_Credit_MainProcess').trim(),
  targetCaseModelId: (process.env.TARGET_CASE_MODEL_ID || '').trim(),
  mainCaseEntityName: (process.env.MAINCASE_ENTITY_NAME || 'CM_Credit_MainCase').trim(),
  caseDocumentsEntityName: (process.env.CASEDOCUMENTS_ENTITY_NAME || 'CM_Credit_CaseDocuments').trim(),
  caseDocumentsAttachmentField: (process.env.CASEDOCUMENTS_ATTACHMENT_FIELD || 'File').trim(),
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 20,
  },
});

const hasUiPathBaseConfig = () => {
  // Allow forcing mock mode via environment variable
  if (process.env.USE_MOCK_DATA === 'true') {
    return false;
  }
  return Boolean(
    uiPathConfig.baseUrl &&
    uiPathConfig.orgName &&
    uiPathConfig.tenantName
  );
};

const hasClientCredentials = () => Boolean(
  uiPathConfig.clientId &&
  uiPathConfig.clientSecret
);

let tokenCache = {
  accessToken: null,
  expiresAt: 0,
};

const normalizeToken = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const normalizeField = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const getStringField = (record, fields) => {
  if (!record || typeof record !== 'object') return '';
  for (const field of fields) {
    if (field in record && record[field] !== null && record[field] !== undefined) {
      const value = String(record[field]).trim();
      if (value) return value;
    }
  }
  return '';
};

const cleanPlaceholder = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  const lowered = normalized.toLowerCase();
  if (lowered === 'unknown' || normalized === '-') return '';
  return normalized;
};

const normalizeSlaStatus = (value) => {
  const raw = cleanPlaceholder(value);
  if (!raw) return '';
  const normalized = normalizeField(raw);
  if (normalized.includes('atrisk') || (normalized.includes('at') && normalized.includes('risk'))) return 'At Risk';
  if (normalized.includes('ontrack') || normalized.includes('ok') || normalized.includes('green') || normalized.includes('respect')) return 'On Track';
  if (normalized.includes('breach') || normalized.includes('overdue') || normalized.includes('violat') || normalized.includes('miss')) return 'Breached';
  if (normalized.includes('warning') || normalized.includes('attention') || normalized.includes('amber') || normalized.includes('orange')) return 'Warning';
  return raw;
};


const normalizeProgressStatus = (value) => normalizeField(String(value || ''));

const isActiveProgressStatus = (value) => {
  const normalized = normalizeProgressStatus(value);
  return normalized.includes('active')
    || normalized.includes('inprogress')
    || normalized.includes('running')
    || normalized.includes('started')
    || normalized.includes('pending');
};

const getTaskTime = (task, aliases = []) => {
  const direct = getStringField(task, aliases);
  if (direct) return direct;
  return findValueByKeyTokens(task, aliases);
};

const mapTaskLikeObject = (task, index = 0, fallback = {}) => {
  const stageName =
    getStringField(task, ['stageName', 'stage', 'stageDisplayName'])
    || getStringField(task?.stage || {}, ['name', 'stageName'])
    || fallback.stageName
    || '';
  const stageId =
    getStringField(task, ['stageId', 'currentStageId'])
    || getStringField(task?.stage || {}, ['id', 'stageId'])
    || fallback.stageId
    || '';

  const startedTime = getTaskTime(task, ['startedTime', 'startTime', 'startedAt', 'createdTime', 'createdAt', 'startDate', 'startDateTime']);
  const completedTime = getTaskTime(task, ['completedTime', 'endTime', 'completedAt', 'finishedTime', 'updatedAt', 'endDate', 'completedDateTime']);

  return {
    id: getStringField(task, ['id', 'taskId', 'TaskId', 'key']) || `task-${index + 1}`,
    name: getStringField(task, ['name', 'taskName', 'displayName', 'title']) || '',
    status: getStringField(task, ['status', 'state', 'taskState']) || '',
    type: getStringField(task, ['type', 'taskType', 'kind']) || '',
    assignee: getStringField(task, ['assignee', 'assignedTo', 'assigneeName', 'assignedUser', 'owner']) || 'Unassigned',
    dueDate: getTaskTime(task, ['dueDate', 'dueAt', 'dueTime', 'deadline', 'targetDate', 'targetTime']),
    slaStatus: normalizeSlaStatus(
      getStringField(task, ['slaStatus', 'SlaStatus', 'slaState'])
      || findValueByKeyTokens(task, ['sla', 'deadline'])
    ) || 'Unknown',
    taskState: getStringField(task, ['taskState', 'state', 'status']) || '',
    stageName,
    stageId,
    startedTime,
    completedTime,
  };
};

const buildTaskDedupeKey = (task) => {
  const id = getStringField(task, ['id', 'taskId', 'TaskId', 'key']);
  if (id) return `id:${id}`;
  const name = getStringField(task, ['name', 'taskName', 'displayName', 'title']);
  const stageName = getStringField(task, ['stageName', 'stage', 'stageDisplayName']);
  const dueDate = getTaskTime(task, ['dueDate', 'dueAt', 'dueTime', 'deadline']);
  return `fallback:${normalizeField(name)}:${normalizeField(stageName)}:${normalizeField(dueDate)}`;
};

const mapActivityItem = (item, index = 0) => {
  const time =
    getStringField(item, ['timestamp', 'time', 'eventTime', 'createdTime', 'createdAt', 'startTime', 'startedTime', 'completedTime', 'updatedAt'])
    || findValueByKeyTokens(item, ['time', 'date', 'timestamp']);
  const title =
    getStringField(item, ['title', 'name', 'eventName', 'displayName', 'action', 'message'])
    || findValueByKeyTokens(item, ['event', 'activity', 'action'])
    || 'Activity';
  const actor =
    getStringField(item, ['actor', 'performedBy', 'user', 'username', 'email', 'initiatedBy'])
    || getStringField(item?.actor || {}, ['name', 'displayName', 'email'])
    || '';
  const status = getStringField(item, ['status', 'state', 'result']) || '';
  const details =
    getStringField(item, ['details', 'description', 'reason', 'comment'])
    || findValueByKeyTokens(item, ['reason', 'error', 'message']);

  return {
    id: getStringField(item, ['id', 'eventId', 'historyId']) || `activity-${index + 1}`,
    title,
    time,
    actor,
    status,
    details,
    source: getStringField(item, ['source', 'type', 'category']) || '',
  };
};

const findValueByKeyTokens = (record, keyTokens = []) => {
  if (!record || typeof record !== 'object' || !Array.isArray(keyTokens) || !keyTokens.length) return '';
  const normalizedTokens = keyTokens.map((token) => normalizeField(token)).filter(Boolean);
  const visited = new Set();

  const visit = (value) => {
    if (value === null || value === undefined) return '';
    if (visited.has(value)) return '';

    if (Array.isArray(value)) {
      visited.add(value);
      for (const item of value) {
        const found = visit(item);
        if (found) return found;
      }
      return '';
    }

    if (typeof value === 'object') {
      visited.add(value);
      for (const [key, child] of Object.entries(value)) {
        const normalizedKey = normalizeField(key);
        const keyMatches = normalizedTokens.some((token) => normalizedKey.includes(token));
        if (keyMatches) {
          if (typeof child === 'string' || typeof child === 'number') {
            const direct = String(child).trim();
            if (direct) return direct;
          }
          const deepFromMatchedKey = visit(child);
          if (deepFromMatchedKey) return deepFromMatchedKey;
        }
      }

      for (const child of Object.values(value)) {
        const found = visit(child);
        if (found) return found;
      }
    }

    return '';
  };

  return visit(record);
};

const findCaseIdPattern = (record) => {
  if (!record || typeof record !== 'object') return '';
  const visited = new Set();
  const pattern = /\b[A-Z]{2,8}-\d{4,}\b/i;

  const visit = (value) => {
    if (value === null || value === undefined) return '';
    if (visited.has(value)) return '';

    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim();
      const match = text.match(pattern);
      return match ? match[0] : '';
    }

    if (Array.isArray(value)) {
      visited.add(value);
      for (const item of value) {
        const found = visit(item);
        if (found) return found;
      }
      return '';
    }

    if (typeof value === 'object') {
      visited.add(value);
      for (const child of Object.values(value)) {
        const found = visit(child);
        if (found) return found;
      }
    }

    return '';
  };

  return visit(record);
};

const findRecordValueByKey = (record, key, aliases = []) => {
  if (!record || typeof record !== 'object') return '-';
  const expected = [key, ...aliases].map(normalizeField);
  const found = Object.entries(record).find(([recordKey]) => expected.includes(normalizeField(recordKey)));
  if (!found) return '-';
  const value = String(found[1] ?? '').trim();
  return value || '-';
};

const scanObjectForTokens = (value, candidates, visited = new Set()) => {
  if (value === null || value === undefined) return false;
  if (visited.has(value)) return false;

  if (typeof value === 'string' || typeof value === 'number') {
    const token = normalizeToken(value);
    return candidates.some((candidate) => candidate && (token === candidate || token.includes(candidate) || candidate.includes(token)));
  }

  if (Array.isArray(value)) {
    visited.add(value);
    return value.some((item) => scanObjectForTokens(item, candidates, visited));
  }

  if (typeof value === 'object') {
    visited.add(value);
    return Object.values(value).some((item) => scanObjectForTokens(item, candidates, visited));
  }

  return false;
};

const getCaseIdFromRecord = (record) => {
  if (!record || typeof record !== 'object') return '';
  const visited = new Set();

  const visit = (value, keyHint = '') => {
    if (value === null || value === undefined) return '';
    if (visited.has(value)) return '';

    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = normalizeField(keyHint);
      const looksLikeCaseId =
        normalized.includes('caseid') ||
        normalized.includes('referenceid') ||
        normalized.includes('businesskey') ||
        normalized.includes('casenumber') ||
        normalized.includes('ocaseid');
      return looksLikeCaseId ? String(value).trim() : '';
    }

    if (Array.isArray(value)) {
      visited.add(value);
      for (const item of value) {
        const found = visit(item, keyHint);
        if (found) return found;
      }
      return '';
    }

    if (typeof value === 'object') {
      visited.add(value);
      for (const [childKey, childValue] of Object.entries(value)) {
        const found = visit(childValue, childKey);
        if (found) return found;
      }
      return '';
    }

    return '';
  };

  return visit(record, '');
};

const getEntityRecordId = (record) => getStringField(record, ['id', 'Id', 'ID', '_id', 'recordId', 'RecordId']);

const getAttachmentFieldCandidates = (record) => {
  const preferred = ['File', 'file', 'Document', 'document', 'Documents', 'documents', 'Attachment', 'attachment'];
  const dynamic = Object.keys(record || {}).filter((key) => {
    const normalized = normalizeField(key);
    return normalized.includes('file') || normalized.includes('document') || normalized.includes('attachment');
  });
  return [...new Set([...preferred, ...dynamic])];
};

const extractMainCaseReferenceIdsFromDocument = (record) => {
  const results = new Set();
  const visited = new Set();

  const visit = (value, keyHint = '') => {
    if (value === null || value === undefined) return;
    if (visited.has(value)) return;

    if (typeof value === 'string' || typeof value === 'number') {
      const normalized = normalizeField(keyHint);
      const looksLikeMainCaseRef =
        normalized.includes('maincaseid') ||
        normalized.includes('maincaseentityid') ||
        (normalized.includes('maincase') && normalized.includes('id')) ||
        normalized.includes('creditmaincaseid');
      if (looksLikeMainCaseRef) {
        const valueString = String(value).trim();
        if (valueString) results.add(valueString);
      }
      return;
    }

    if (Array.isArray(value)) {
      visited.add(value);
      value.forEach((item) => visit(item, keyHint));
      return;
    }

    if (typeof value === 'object') {
      visited.add(value);
      Object.entries(value).forEach(([key, child]) => visit(child, key));
    }
  };

  visit(record, '');
  return [...results];
};

const getBearerTokenFromRequest = (req) => {
  const header = String(req.headers.authorization || '');
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
};

const getAccessTokenByClientCredentials = async () => {
  const now = Date.now();
  if (tokenCache.accessToken && tokenCache.expiresAt > now + 30_000) {
    return tokenCache.accessToken;
  }

  if (!hasClientCredentials()) {
    throw new Error('Client credentials manquants. Fournis un Bearer token OAuth dans Authorization, ou configure UIPATH_CLIENT_ID/UIPATH_CLIENT_SECRET.');
  }

  const tokenUrl = `${uiPathConfig.baseUrl}/${uiPathConfig.orgName}/identity_/connect/token`;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: uiPathConfig.clientId,
    client_secret: uiPathConfig.clientSecret,
    scope: uiPathConfig.scope,
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token UiPath refusé (${response.status}): ${text}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (Number(data.expires_in || 3600) * 1000),
  };

  return tokenCache.accessToken;
};

const resolveAuthToken = async (req) => {
  const bearerToken = getBearerTokenFromRequest(req);
  if (bearerToken) return bearerToken;
  return getAccessTokenByClientCredentials();
};

const buildUiPathUrl = (path, query = {}) => {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(`${uiPathConfig.baseUrl}/${uiPathConfig.orgName}/${uiPathConfig.tenantName}/${normalizedPath}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
};

const withDataFabricFolderContext = (path, query = {}) => {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  if (!normalizedPath.startsWith('datafabric_/api/')) return query;
  if (!uiPathConfig.folderKey) return query;
  if (query.folderKey !== undefined && query.folderKey !== null && query.folderKey !== '') return query;
  return {
    ...query,
    folderKey: uiPathConfig.folderKey,
  };
};

const parseUiPathJsonResponse = async (response, path, contextLabel = '') => {
  const statusLabel = contextLabel ? ` (${contextLabel})` : '';
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`UiPath API erreur (${response.status}) sur ${path}${statusLabel}: ${bodyText}`);
  }

  if (!bodyText) {
    return {};
  }

  const seemsHtml = bodyText.trim().startsWith('<!DOCTYPE') || bodyText.trim().startsWith('<html');
  try {
    return JSON.parse(bodyText);
  } catch {
    const preview = bodyText.slice(0, 300);
    const hint = seemsHtml
      ? 'Réponse HTML reçue (token/scope invalide ou endpoint non-JSON).'
      : 'Réponse non JSON reçue.';
    throw new Error(
      `UiPath API réponse invalide sur ${path}${statusLabel}: ${hint} content-type=${contentType || 'unknown'} body=${preview}`,
    );
  }
};

const uiPathJsonRequest = async (token, path, query = {}) => {
  const response = await fetch(buildUiPathUrl(path, withDataFabricFolderContext(path, query)), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return parseUiPathJsonResponse(response, path);
};

const uiPathJsonRequestWithoutFolderContext = async (token, path, query = {}) => {
  const response = await fetch(buildUiPathUrl(path, query), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return parseUiPathJsonResponse(response, path, 'no-folder');
};

const buildUiPathHeaders = (token, extraHeaders = {}) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  ...extraHeaders,
});

const toTimestamp = (value) => {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const uiPathJsonRequestWithHeaders = async (token, path, query = {}, extraHeaders = {}) => {
  const response = await fetch(buildUiPathUrl(path, query), {
    headers: buildUiPathHeaders(token, extraHeaders),
  });
  return parseUiPathJsonResponse(response, path);
};

const CASE_TRIGGER_NODE_TYPE = 'case-management:Trigger';
const CASE_NOT_STARTED_STATUS = 'Not Started';

const resolveCaseBinding = (value, bindingsMap) => {
  if (typeof value === 'string' && value.startsWith('=bindings.')) {
    const bindingId = value.slice('=bindings.'.length);
    const binding = bindingsMap.get(bindingId);
    return binding?.default || binding?.name || value;
  }
  return value;
};

const createCaseBindingsMap = (caseJson) => {
  const bindingsMap = new Map();
  const bindings = caseJson?.root?.data?.uipath?.bindings;
  if (Array.isArray(bindings)) {
    bindings.forEach((binding) => {
      if (binding?.id) bindingsMap.set(binding.id, binding);
    });
  }
  return bindingsMap;
};

const createElementExecutionMap = (executionHistory) => {
  const executionMap = new Map();
  const elementExecutions = Array.isArray(executionHistory?.elementExecutions) ? executionHistory.elementExecutions : [];
  elementExecutions.forEach((execution) => {
    if (execution?.elementId) executionMap.set(execution.elementId, execution);
  });
  return executionMap;
};

const transformCaseTaskFromNode = (task, executionMap, bindingsMap) => {
  const taskId = task?.id || task?.elementId || task?.key || '';
  const taskExecution = taskId ? executionMap.get(taskId) : null;
  let taskName = task?.displayName || task?.name || task?.label || '';
  if (!taskName && task?.data?.name) {
    taskName = resolveCaseBinding(task.data.name, bindingsMap);
  }

  return {
    id: taskId || `task-${Math.random().toString(36).slice(2, 8)}`,
    name: taskName || 'Undefined',
    status: taskExecution?.status || CASE_NOT_STARTED_STATUS,
    type: task?.type || 'Undefined',
    startedTime: taskExecution?.startedTime || '',
    completedTime: taskExecution?.completedTime || '',
    stageId: '',
    stageName: '',
  };
};

const buildStagesFromCaseDefinition = (caseJson, executionHistory) => {
  const nodes = Array.isArray(caseJson?.nodes) ? caseJson.nodes : [];
  if (!nodes.length) return [];

  const executionMap = createElementExecutionMap(executionHistory);
  const bindingsMap = createCaseBindingsMap(caseJson);

  return nodes
    .filter((node) => node && node.type !== CASE_TRIGGER_NODE_TYPE)
    .map((node, index) => {
      const execution = executionMap.get(node.id);
      const taskGroups = Array.isArray(node?.data?.tasks) ? node.data.tasks : [];
      const tasks = taskGroups
        .map((group) => Array.isArray(group) ? group.map((task) => transformCaseTaskFromNode(task, executionMap, bindingsMap)) : [])
        .flat()
        .map((task) => ({
          ...task,
          stageId: node.id,
          stageName: node?.data?.label || `Stage ${index + 1}`,
        }));

      return {
        id: node.id || `stage-${index + 1}`,
        name: node?.data?.label || `Stage ${index + 1}`,
        sla: node?.data?.sla || null,
        status: execution?.status || CASE_NOT_STARTED_STATUS,
        startedTime: execution?.startedTime || '',
        completedTime: execution?.completedTime || '',
        isCurrent: false,
        tasks,
      };
    });
};

const getStageStatusRank = (status) => {
  const normalized = normalizeField(status);
  if (normalized.includes('fault') || normalized.includes('fail')) return 4;
  if (normalized.includes('running') || normalized.includes('progress') || normalized.includes('active') || normalized.includes('pause')) return 3;
  if (normalized.includes('notstarted') || normalized.includes('pending')) return 2;
  if (normalized.includes('complete') || normalized.includes('success')) return 1;
  return 0;
};

const inferCurrentStageName = (stages = []) => {
  const activeStage = stages.find((stage) => getStageStatusRank(stage.status) === 3);
  if (activeStage?.name) return activeStage.name;
  const firstPending = stages.find((stage) => getStageStatusRank(stage.status) === 2);
  if (firstPending?.name) return firstPending.name;
  const latestStarted = [...stages]
    .filter((stage) => stage.startedTime)
    .sort((a, b) => toTimestamp(b.startedTime) - toTimestamp(a.startedTime))[0];
  return latestStarted?.name || '';
};

const normalizeActionTask = (task) => {
  const assignedUser = task?.AssignedToUser || task?.assignedToUser || null;
  const taskSlaDetail = task?.TaskSlaDetail || task?.taskSlaDetail || null;
  const tags = Array.isArray(task?.Tags || task?.tags) ? (task.Tags || task.tags) : [];
  const stageTag = tags.find((tag) => normalizeField(tag?.Name || tag?.name).includes('stage'))
    || tags.find((tag) => normalizeField(tag?.DisplayName || tag?.displayName).includes('stage'));

  return {
    id: String(task?.Id ?? task?.id ?? task?.Key ?? task?.key ?? ''),
    name: String(task?.Title ?? task?.title ?? ''),
    status: String(task?.Status ?? task?.status ?? ''),
    taskState: String(task?.Status ?? task?.status ?? ''),
    type: String(task?.Type ?? task?.type ?? ''),
    assignee: assignedUser?.DisplayName || assignedUser?.displayName || task?.TaskAssigneeName || task?.taskAssigneeName || 'Unassigned',
    dueDate: taskSlaDetail?.ExpiryTime || taskSlaDetail?.expiryTime || '',
    slaStatus: normalizeSlaStatus(taskSlaDetail?.Status || taskSlaDetail?.status || ''),
    startedTime: String(task?.CreatedTime ?? task?.createdTime ?? ''),
    completedTime: String(task?.CompletedTime ?? task?.completedTime ?? ''),
    stageName: stageTag?.DisplayValue || stageTag?.displayValue || '',
    stageId: '',
    activities: Array.isArray(task?.Activities || task?.activities) ? (task.Activities || task.activities) : [],
    externalLink: task.ExternalLink || task.externalLink || '',
  };
};

const buildActivityFromExecutionHistory = (executionHistory, actionTasks = []) => {
  const events = [];
  const elementExecutions = Array.isArray(executionHistory?.elementExecutions) ? executionHistory.elementExecutions : [];

  elementExecutions.forEach((execution) => {
    if (execution?.startedTime) {
      events.push({
        id: `exec-start-${execution.elementId}`,
        title: `Started ${execution.elementName || 'Step'}`,
        time: execution.startedTime,
        actor: execution.externalLink ? 'User' : 'Automation',
        status: execution.status,
        details: '',
        source: 'execution',
      });
    }
    if (execution?.completedTime) {
      events.push({
        id: `exec-end-${execution.elementId}`,
        title: `${String(execution.status || '').toLowerCase().includes('complete') ? 'Completed' : execution.status || 'Updated'} ${execution.elementName || 'Step'}`,
        time: execution.completedTime,
        actor: execution.externalLink ? 'User' : 'Automation',
        status: execution.status,
        details: '',
        source: 'execution',
      });
    }
  });

  actionTasks.forEach((task) => {
    (task.activities || []).forEach((activity, index) => {
      events.push({
        id: `task-activity-${task.id}-${index + 1}`,
        title: activity?.ActivityType || activity?.activityType || task.name || 'Task',
        time: activity?.CreatedTime || activity?.createdTime || task.startedTime || '',
        actor: task.assignee || 'User',
        status: task.status,
        details: task.name || '',
        source: 'task',
      });
    });
  });

  return events.sort((a, b) => toTimestamp(b.time) - toTimestamp(a.time));
};

const resolveEntityByConfiguredName = (entities, configuredName, tokenHints = []) => {
  const configuredRaw = String(configuredName || '').trim();
  const configuredLower = configuredRaw.toLowerCase();
  const normalizedConfigured = normalizeField(configuredName);
  const normalizedHints = tokenHints.map((hint) => normalizeField(hint)).filter(Boolean);

  const getNameCandidates = (entity) => [entity?.name, entity?.displayName].map((value) => String(value || '').trim()).filter(Boolean);

  if (configuredRaw) {
    const strict = entities.find((entity) => {
      const candidates = getNameCandidates(entity);
      return candidates.some((value) => value === configuredRaw || value.toLowerCase() === configuredLower);
    });
    if (strict) return strict;
    return null;
  }

  const exact = entities.find((entity) => {
    const candidates = getNameCandidates(entity).map(normalizeField);
    return candidates.includes(normalizedConfigured);
  });
  if (exact) return exact;

  const containsConfigured = entities.find((entity) => {
    const candidates = getNameCandidates(entity).map(normalizeField);
    return candidates.some((value) => value.includes(normalizedConfigured) || normalizedConfigured.includes(value));
  });
  if (containsConfigured) return containsConfigured;

  if (!normalizedHints.length) return null;

  return entities.find((entity) => {
    const candidates = getNameCandidates(entity).map(normalizeField);
    return candidates.some((value) => normalizedHints.every((hint) => value.includes(hint)));
  }) || null;
};

const readEntityRecordsWithFallback = async (token, entityId, readQuery) => {
  try {
    const scopedResponse = await uiPathJsonRequest(token, `datafabric_/api/EntityService/entity/${entityId}/read`, readQuery);
    const scopedItems = extractItems(scopedResponse);
    if (scopedItems.length > 0) return scopedItems;
  } catch (_error) {
  }

  const unscopedResponse = await uiPathJsonRequestWithoutFolderContext(token, `datafabric_/api/EntityService/entity/${entityId}/read`, readQuery);
  return extractItems(unscopedResponse);
};

const uiPathRequest = async (token, path, options = {}) => {
  const {
    method = 'GET',
    query = {},
    headers = {},
    body,
  } = options;

  const response = await fetch(buildUiPathUrl(path, withDataFabricFolderContext(path, query)), {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let json = null;
  if (contentType.includes('application/json') && text) {
    try {
      json = JSON.parse(text);
    } catch (_error) {
      json = null;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    text,
    json,
  };
};

const getFirstObjectFromResponse = (responseBody) => {
  if (!responseBody) return null;
  if (Array.isArray(responseBody) && responseBody.length > 0 && typeof responseBody[0] === 'object') return responseBody[0];
  if (Array.isArray(responseBody?.items) && responseBody.items.length > 0) return responseBody.items[0];
  if (Array.isArray(responseBody?.value) && responseBody.value.length > 0) return responseBody.value[0];
  if (Array.isArray(responseBody?.createdItems) && responseBody.createdItems.length > 0) return responseBody.createdItems[0];
  if (responseBody?.item && typeof responseBody.item === 'object') return responseBody.item;
  if (typeof responseBody === 'object') return responseBody;
  return null;
};

const createEntityRecord = async (token, entityId, payload) => {
  const candidateCalls = [
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/insert`,
      body: payload,
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/insert`,
      body: { item: payload },
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/insert`,
      body: { items: [payload] },
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/create`,
      body: { items: [payload] },
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/create`,
      body: payload,
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsert`,
      body: { items: [payload] },
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/insert`,
      body: { items: [payload] },
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsert`,
      body: payload,
    },
  ];

  const errors = [];

  for (const candidate of candidateCalls) {
    const response = await uiPathRequest(token, candidate.path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(candidate.body),
    });

    if (response.ok) {
      const createdRecord = getFirstObjectFromResponse(response.json || {});
      const createdRecordId = getEntityRecordId(createdRecord || {});
      if (createdRecordId) {
        return {
          record: createdRecord,
          recordId: createdRecordId,
        };
      }

      if (createdRecord && typeof createdRecord === 'object') {
        return {
          record: createdRecord,
          recordId: getStringField(createdRecord, ['Id', 'id', 'ID']),
        };
      }

      return {
        record: createdRecord,
        recordId: '',
      };
    }

    errors.push(`${candidate.path} -> ${response.status}: ${response.text}`);
  }

  throw new Error(`Impossible de créer un enregistrement DataFabric pour l'entité ${entityId}. Détails: ${errors.join(' | ')}`);
};

const insertThenUpdateCaseId = async (token, entityId, payload, caseIdValue) => {
  const caseIdPayload = {
    CaseID: caseIdValue,
    caseID: caseIdValue,
    caseId: caseIdValue,
    oCaseID: caseIdValue,
    ReferenceID: caseIdValue,
    BusinessKey: caseIdValue,
  };
  const incomingChannelPayload = {
    IncomingChannel: 'WEB',
    incomingChannel: 'WEB',
    Incoming_Channel: 'WEB',
    Channel: 'WEB',
    SourceChannel: 'WEB',
  };
  const insertPayload = {
    ...(payload || {}),
    ...caseIdPayload,
    ...incomingChannelPayload,
  };
  const insertCandidates = [
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/insert`,
      body: insertPayload,
      bodyFormat: 'object',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/insert`,
      body: { item: insertPayload },
      bodyFormat: 'item-object',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/insert`,
      body: { items: [insertPayload] },
      bodyFormat: 'items-array',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/insertRecordsById`,
      body: { items: [insertPayload] },
      bodyFormat: 'insertRecordsById-items-array',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/create`,
      body: { items: [insertPayload] },
      bodyFormat: 'create-items-array',
    },
  ];

  const insertErrors = [];
  let insertedRecord = null;
  let insertedRecordId = '';

  for (const candidate of insertCandidates) {
    const response = await uiPathRequest(token, candidate.path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(candidate.body),
    });

    if (!response.ok) {
      insertErrors.push(`${candidate.path} -> ${response.status}: ${response.text}`);
      continue;
    }

    insertedRecord = getFirstObjectFromResponse(response.json || {});
    insertedRecordId = getEntityRecordId(insertedRecord || {}) || getStringField(insertedRecord || {}, ['Id', 'id', 'ID']);
    if (insertedRecordId) break;
  }

  if (!insertedRecordId) {
    throw new Error(`Insert record échoué (recordId introuvable) pour l'entité ${entityId}. Détails: ${insertErrors.join(' | ')}`);
  }

  const updateCandidates = [
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsertRecordsById`,
      body: { items: [{ Id: insertedRecordId, ...insertPayload }] },
      method: 'POST',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsertRecordsById`,
      body: { items: [{ id: insertedRecordId, ...insertPayload }] },
      method: 'POST',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsert`,
      body: { items: [{ Id: insertedRecordId, ...insertPayload }] },
      method: 'POST',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsert`,
      body: { Id: insertedRecordId, ...insertPayload },
      method: 'POST',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/record/${insertedRecordId}`,
      body: insertPayload,
      method: 'PATCH',
    },
  ];

  const updateErrors = [];
  let usedUpdatePath = '';

  for (const candidate of updateCandidates) {
    const response = await uiPathRequest(token, candidate.path, {
      method: candidate.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(candidate.body),
    });

    if (response.ok) {
      usedUpdatePath = candidate.path;
      return {
        record: insertedRecord,
        recordId: insertedRecordId,
        updatePath: usedUpdatePath,
        updateWarning: '',
      };
    }

    updateErrors.push(`${candidate.path} -> ${response.status}: ${response.text}`);
  }

  return {
    record: insertedRecord,
    recordId: insertedRecordId,
    updatePath: '',
    updateWarning: `Update post-insert indisponible dans ce tenant (endpoints introuvables). Détails: ${updateErrors.join(' | ')}`,
  };
};

const updateDocumentFieldsByRecordId = async (token, entityId, recordId, payload) => {
  const candidates = [
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsertRecordsById`,
      body: { items: [{ Id: recordId, ...(payload || {}) }] },
      method: 'POST',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsertRecordsById`,
      body: { items: [{ id: recordId, ...(payload || {}) }] },
      method: 'POST',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsert`,
      body: { items: [{ Id: recordId, ...(payload || {}) }] },
      method: 'POST',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/upsert`,
      body: { Id: recordId, ...(payload || {}) },
      method: 'POST',
    },
    {
      path: `datafabric_/api/EntityService/entity/${entityId}/record/${recordId}`,
      body: payload || {},
      method: 'PATCH',
    },
  ];

  const errors = [];
  for (const candidate of candidates) {
    const response = await uiPathRequest(token, candidate.path, {
      method: candidate.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(candidate.body),
    });

    if (response.ok) return;
    errors.push(`${candidate.path} -> ${response.status}: ${response.text}`);
  }

  throw new Error(`Impossible de mettre à jour les champs document pour ${recordId}. Détails: ${errors.join(' | ')}`);
};

const uploadEntityAttachment = async (token, entityName, recordId, fieldName, file) => {
  const formData = new FormData();
  const blob = new Blob([file.buffer], { type: file.mimetype || 'application/octet-stream' });
  formData.append('file', blob, file.originalname || 'document.bin');

  const methods = ['POST', 'PUT'];
  const errors = [];

  for (const method of methods) {
    const response = await uiPathRequest(token, `datafabric_/api/Attachment/${entityName}/${recordId}/${fieldName}`, {
      method,
      body: formData,
    });

    if (response.ok) return;
    errors.push(`${method} -> ${response.status}: ${response.text}`);
  }

  throw new Error(`Impossible d'uploader la pièce jointe sur ${entityName}/${recordId}/${fieldName}. ${errors.join(' | ')}`);
};

const extractItems = (response) => {
  if (Array.isArray(response)) return response;
  if (response && typeof response === 'object' && Array.isArray(response.items)) return response.items;
  if (response && typeof response === 'object' && Array.isArray(response.value)) return response.value;
  return [];
};

const getEntitySampleRecord = async (token, entityId) => {
  const response = await uiPathJsonRequest(token, `datafabric_/api/EntityService/entity/${entityId}/read`, {
    limit: 1,
    start: 0,
    expansionLevel: 2,
  });
  const items = extractItems(response);
  return items[0] && typeof items[0] === 'object' ? items[0] : {};
};

const mapValuesToEntityColumns = (sourceValues, sampleRecord) => {
  const sampleKeys = Object.keys(sampleRecord || {}).filter((key) => !['id', 'Id', 'ID', '_id'].includes(key));
  const normalizedKeyMap = new Map(sampleKeys.map((key) => [normalizeField(key), key]));
  const forcedEntityKeys = {
    incomingChannel: 'IncomingChannel',
  };

  const resolveEntityKey = (aliases = [], allowFuzzy = true) => {
    const normalizedAliases = aliases.map(normalizeField).filter(Boolean);
    for (const alias of normalizedAliases) {
      if (normalizedKeyMap.has(alias)) return normalizedKeyMap.get(alias);
    }
    if (!allowFuzzy) return '';
    for (const alias of normalizedAliases) {
      const fuzzyMatch = sampleKeys.find((key) => {
        const normalized = normalizeField(key);
        return normalized.includes(alias);
      });
      if (fuzzyMatch) return fuzzyMatch;
    }
    return '';
  };

  const mapped = {};
  const fieldDefs = [
    { valueKey: 'caseId', aliases: ['CaseID', 'caseID', 'caseId', 'oCaseID', 'ReferenceID', 'BusinessKey'] },
    { valueKey: 'clientCode', aliases: ['ClientID', 'ClientId', 'clientId', 'ClientCode', 'ClientRef', 'ReferenceClient'] },
    { valueKey: 'incomingChannel', aliases: ['IncomingChannel', 'Incoming_Channel', 'Channel', 'SourceChannel'] },
    { valueKey: 'name', aliases: ['Name', 'FullName', 'ClientName'], allowFuzzy: false },
    { valueKey: 'birthDate', aliases: ['BirthDate'] },
    { valueKey: 'creditType', aliases: ['CreditType', 'TypeCredit'] },
    { valueKey: 'requestedAmount', aliases: ['RequestedAmount', 'AmountRequested', 'LoanAmount'] },
    { valueKey: 'duration', aliases: ['Duration', 'DurationMonths'] },
    { valueKey: 'loanPurpose', aliases: ['LoanPurpose'] },
    { valueKey: 'caseStatus', aliases: ['CaseStatus', 'Status', 'DossierStatus'] },
    { valueKey: 'incomes', aliases: ['Incomes', 'Income'] },
    { valueKey: 'expenses', aliases: ['Expenses', 'Expense'] },
    { valueKey: 'otherIncome', aliases: ['OtherIncome'] },
    { valueKey: 'debtRatio', aliases: ['DebtRatio'] },
    { valueKey: 'iban', aliases: ['IBAN', 'Iban'] },
    { valueKey: 'bankName', aliases: ['BankName'], allowFuzzy: false },
    { valueKey: 'address', aliases: ['Address'] },
    { valueKey: 'city', aliases: ['City'] },
    { valueKey: 'phone', aliases: ['Phone'] },
    { valueKey: 'email', aliases: ['Email'] },
    { valueKey: 'familyStatus', aliases: ['FamilyStatus'] },
    { valueKey: 'housingStatus', aliases: ['HousingStatus'] },
    { valueKey: 'profession', aliases: ['Profession', 'JobTitle'] },
    { valueKey: 'employer', aliases: ['Employer'] },
    { valueKey: 'contractType', aliases: ['ContractType'] },
    { valueKey: 'seniority', aliases: ['Seniority'] },
    { valueKey: 'consent', aliases: ['Consent'] },
    { valueKey: 'createTime', aliases: ['CreateTime', 'CreatedAt'] },
  ];

  for (const def of fieldDefs) {
    const entityKey = forcedEntityKeys[def.valueKey] || resolveEntityKey(def.aliases, def.allowFuzzy !== false);
    if (!entityKey) continue;
    const value = sourceValues[def.valueKey];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    mapped[entityKey] = value;
  }

  return mapped;
};

const mapDocumentValuesToEntityColumns = (sourceValues, sampleRecord) => {
  const sampleKeys = Object.keys(sampleRecord || {}).filter((key) => !['id', 'Id', 'ID', '_id'].includes(key));
  const normalizedKeyMap = new Map(sampleKeys.map((key) => [normalizeField(key), key]));

  // Fallback keys when schema doesn't expose the field at all
  const fallbackKeys = {
    caseId:   'OCaseID',
    fileName: 'FileName',
    fileType: 'FileType',
  };

  const resolveEntityKey = (aliases = []) => {
    const normalizedAliases = aliases.map(normalizeField).filter(Boolean);
    for (const alias of normalizedAliases) {
      if (normalizedKeyMap.has(alias)) return normalizedKeyMap.get(alias);
    }
    for (const alias of normalizedAliases) {
      const fuzzyMatch = sampleKeys.find((key) => normalizeField(key).includes(alias));
      if (fuzzyMatch) return fuzzyMatch;
    }
    return '';
  };

  const mapped = {};
  const fieldDefs = [
    { valueKey: 'caseId',   aliases: ['OCaseID', 'OCaseId', 'oCaseID', 'oCaseId', 'CaseID'] },
    { valueKey: 'fileName', aliases: ['FileName', 'Filename', 'filename', 'Name'] },
    { valueKey: 'fileType', aliases: ['FileType', 'fileType'] },
  ];

  for (const def of fieldDefs) {
    const value = sourceValues[def.valueKey];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '' && def.valueKey !== 'fileType') continue;
    // Use actual schema key if found, otherwise use the canonical fallback name
    const entityKey = resolveEntityKey(def.aliases) || fallbackKeys[def.valueKey];
    mapped[entityKey] = value;
  }

  return mapped;
};

const matchesTargetCaseModel = (instance) => {
  const targetModelId = normalizeToken(uiPathConfig.targetCaseModelId);
  if (!targetModelId) return true;

  const candidates = [
    getStringField(instance, ['packageId']),
    getStringField(instance, ['processKey', 'processDefinitionKey']),
    getStringField(instance, ['caseType']),
    getStringField(instance?.caseAppConfig || {}, ['id', 'Id', 'key', 'Key']),
    getStringField(instance, ['packageKey']),
  ].map(normalizeToken).filter(Boolean);

  return candidates.includes(targetModelId);
};

const matchesTargetProcessKey = (instance) => {
  const targetProcessKey = normalizeToken(uiPathConfig.targetProcessKey);
  if (!targetProcessKey) return true;

  const candidates = [
    getStringField(instance, ['processKey', 'processDefinitionKey', 'caseType', 'packageKey']),
    getStringField(instance?.caseAppConfig || {}, ['key', 'Key']),
  ].map(normalizeToken).filter(Boolean);

  if (candidates.includes(targetProcessKey)) return true;
  return scanObjectForTokens(instance, [targetProcessKey]);
};

const matchesTargetFolder = (instance) => {
  const targetFolderKey = normalizeToken(uiPathConfig.folderKey);
  if (!targetFolderKey) return true;

  const candidates = [
    getStringField(instance, ['folderKey', 'folderId', 'organizationUnitId']),
    getStringField(instance?.folder || {}, ['key', 'id']),
  ].map(normalizeToken).filter(Boolean);

  if (candidates.includes(targetFolderKey)) return true;
  return scanObjectForTokens(instance, [targetFolderKey]);
};

const buildMainCaseIndex = (records) => {
  const index = new Map();
  for (const record of records) {
    const caseId = getCaseIdFromRecord(record);
    const oCaseId = getStringField(record, ['oCaseID', 'oCaseId', 'OCaseID', 'OCaseId']);
    const caseIdPattern = findCaseIdPattern(record);
    const caseReference = findValueByKeyTokens(record, ['caseid', 'referenceid', 'businesskey', 'casenumber']);
    const linkedInstanceId = findValueByKeyTokens(record, ['instanceid', 'processinstanceid', 'workflowinstanceid']);
    const entityId = getEntityRecordId(record);
    if (caseId) index.set(normalizeToken(caseId), record);
    if (oCaseId) index.set(normalizeToken(oCaseId), record);
    if (caseIdPattern) index.set(normalizeToken(caseIdPattern), record);
    if (caseReference) index.set(normalizeToken(caseReference), record);
    if (linkedInstanceId) index.set(normalizeToken(linkedInstanceId), record);
    if (entityId) index.set(normalizeToken(entityId), record);
  }
  return index;
};

const enrichInstanceWithMainCase = (instance, mainCaseRecords, mainCaseIndex) => {
  const instanceId = getStringField(instance, ['instanceId', 'id']);
  const instanceCaseRef = getStringField(instance, ['caseId', 'externalId', 'referenceId', 'businessKey', 'caseNumber']);
  // instanceDisplayName et caseTitle sont les vrais champs (RawCaseInstanceGetResponse)
  const displayName = getStringField(instance, ['instanceDisplayName', 'caseTitle', 'displayName', 'name']);
  const folderKey = getStringField(instance, ['folderKey', 'folderId', 'organizationUnitId']);
  // startedTime est le vrai champ de l'API instances (RawCaseInstanceGetResponse)
  const instanceCreatedTime =
    getStringField(instance, ['startedTime', 'createdTime', 'createdAt', 'creationTime', 'startTime', 'startedAt', 'openedAt']) ||
    findValueByKeyTokens(instance, ['started', 'created', 'creation', 'opened', 'start']);

  const instanceProcessRef = getStringField(instance, ['processInstanceId', 'workflowInstanceId']);
  const candidates = [instanceId, instanceCaseRef, displayName, instanceProcessRef]
    .map(normalizeToken)
    .filter(Boolean);

  let matchedMainCase = candidates.map((candidate) => mainCaseIndex.get(candidate)).find(Boolean);
  if (!matchedMainCase) {
    matchedMainCase = mainCaseRecords.find((record) => scanObjectForTokens(record, candidates)) || null;
  }

  const secondaryCandidates = [
    findValueByKeyTokens(instance, ['caseid', 'referenceid', 'businesskey', 'casenumber', 'ocaseid']),
    findValueByKeyTokens(instance, ['instanceid', 'processinstanceid', 'workflowinstanceid']),
    findCaseIdPattern(instance),
  ]
    .map(normalizeToken)
    .filter(Boolean);

  if (!matchedMainCase && secondaryCandidates.length) {
    matchedMainCase = mainCaseRecords.find((record) => {
      const recordCandidates = [
        getCaseIdFromRecord(record),
        getStringField(record, ['oCaseID', 'oCaseId', 'OCaseID', 'OCaseId']),
        findValueByKeyTokens(record, ['caseid', 'referenceid', 'businesskey', 'casenumber']),
        findValueByKeyTokens(record, ['instanceid', 'processinstanceid', 'workflowinstanceid']),
        findCaseIdPattern(record),
      ]
        .map(normalizeToken)
        .filter(Boolean);

      return recordCandidates.some((value) => secondaryCandidates.includes(value));
    }) || null;
  }

  const createdTime =
    cleanPlaceholder(getStringField(matchedMainCase || {}, ['CreateTime', 'CreatedAt', 'CreationTime', 'UpdateTime'])) ||
    cleanPlaceholder(findValueByKeyTokens(matchedMainCase || {}, ['createtime', 'createdat', 'creationtime'])) ||
    cleanPlaceholder(instanceCreatedTime);

  // Extract caseId from MainCase record (CRD-XXXXXXXX format)
  // Try direct field access first, then deep search, then instance fields
  let caseId = getStringField(matchedMainCase || {}, ['CaseID', 'caseID', 'Case_ID', 'ReferenceID', 'referenceID', 'BusinessKey', 'businessKey', 'CaseNumber']);
  if (!caseId) {
    caseId = findCaseIdPattern(matchedMainCase || {});
  }
  if (!caseId) {
    caseId = findValueByKeyTokens(matchedMainCase || {}, ['caseid', 'referenceid', 'businesskey', 'casenumber']);
  }
  if (!caseId) {
    caseId = getCaseIdFromRecord(matchedMainCase || {});
  }
  if (!caseId) {
    caseId = findCaseIdPattern(instance) || instanceCaseRef;
  }
  if (!caseId) {
    caseId = instanceId;
  }
  
  // Extract SLA status from MainCase metadata
  const slaStatusRaw =
    cleanPlaceholder(findRecordValueByKey(matchedMainCase || {}, 'SLAStatus', ['SLA_Status', 'SLA', 'slaStatus', 'SlaState'])) ||
    cleanPlaceholder(findValueByKeyTokens(matchedMainCase || {}, ['sla', 'deadline', 'targettime'])) ||
    cleanPlaceholder(findValueByKeyTokens(instance, ['sla'])) ||
    'N/A';
  const slaStatus = normalizeSlaStatus(slaStatusRaw) || 'N/A';

  return {
    instanceId,
    instance,
    processKey: getStringField(instance, ['processKey', 'processDefinitionKey']) || uiPathConfig.targetProcessKey,
    status: getStringField(instance, ['latestRunStatus', 'status']) || 'Unknown',
    caseId,
    folderKey,
    displayName,
    createdTime,
    slaStatus,
    mainCaseRecord: matchedMainCase,
  };
};

const mapCaseDetail = (instanceContext, allDocumentRecords, documentsEntityName) => {
  const record = instanceContext.mainCaseRecord || {};
  const expectedDocumentCaseIds = new Set([
    instanceContext.caseId,
    getCaseIdFromRecord(record),
    getStringField(record, ['oCaseID', 'oCaseId', 'OCaseID', 'OCaseId']),
    getStringField(instanceContext.instance || {}, ['caseId', 'externalId', 'referenceId', 'businessKey', 'caseNumber']),
    findCaseIdPattern(record),
    findCaseIdPattern(instanceContext.instance || {}),
  ].map(normalizeToken).filter(Boolean));

  const documents = allDocumentRecords
    .filter((doc) => {
      const docOCaseId = normalizeToken(getStringField(doc, ['oCaseID', 'oCaseId', 'OCaseID', 'OCaseId', 'CaseID', 'caseId']));
      return Boolean(docOCaseId && expectedDocumentCaseIds.has(docOCaseId));
    })
    .map((doc) => {
      const recordId = getEntityRecordId(doc);
      const fieldName = getAttachmentFieldCandidates(doc)[0] || 'File';
      const fileName = getStringField(doc, ['FileName', 'fileName', 'DocumentName', 'documentName', 'Name']) || `document-${recordId}`;
      const fileType = getStringField(doc, ['FileType', 'fileType', 'DocumentType', 'documentType', 'type']) || 'Non spécifié';
      const query = new URLSearchParams({
        entityName: documentsEntityName,
        fieldName,
        fileName,
      });
      return {
        id: recordId || fileName,
        fileType,
        fileName,
        url: recordId ? `/api/documents/${encodeURIComponent(recordId)}?${query.toString()}` : '#',
      };
    });

  const extractStageTasks = (stage) => {
    const directTasks = Array.isArray(stage?.tasks) ? stage.tasks.flat() : [];
    const actionTasks = Array.isArray(stage?.actionTasks) ? stage.actionTasks.flat() : [];
    const activities = Array.isArray(stage?.activities) ? stage.activities.flat() : [];
    const combined = [...directTasks, ...actionTasks, ...activities].filter((item) => item && typeof item === 'object');
    const stageName = getStringField(stage, ['name', 'stageName', 'displayName']) || '';
    const stageId = getStringField(stage, ['id', 'stageId', 'key']) || '';
    return combined.map((task, index) => mapTaskLikeObject(task, index, { stageName, stageId }));
  };

  const mappedStages = (instanceContext.stages || []).map((s, index) => {
    const stageId = getStringField(s, ['id', 'stageId', 'key']) || `stage-${index + 1}`;
    const stageName = getStringField(s, ['name', 'stageName', 'displayName']) || `Stage ${index + 1}`;
    const mappedStageTasks = extractStageTasks(s);
    const extraTasksFromCaseScope = (instanceContext.tasks || []).filter((task) => {
      const taskStageId = normalizeField(task.stageId);
      const taskStageName = normalizeField(task.stageName);
      return (taskStageId && taskStageId === normalizeField(stageId))
        || (taskStageName && taskStageName === normalizeField(stageName));
    });

    return {
      id: stageId,
      name: stageName,
      status: getStringField(s, ['status', 'stageStatus', 'state']) || '',
      startedTime: getStringField(s, ['startedTime', 'startTime', 'startedAt', 'createdTime', 'createdAt']) || '',
      completedTime: getStringField(s, ['completedTime', 'endTime', 'completedAt', 'finishedTime', 'updatedAt']) || '',
      sla: s.sla || null,
      isCurrent: Boolean(s?.isCurrent || s?.current),
      tasks: [...mappedStageTasks, ...extraTasksFromCaseScope],
    };
  });

  const allTasks = [
    ...mappedStages.flatMap((stage) => stage.tasks || []),
    ...(instanceContext.tasks || []).map((task, index) => mapTaskLikeObject(task, index)),
  ];

  const uniqueTasks = [];
  const seenTaskKeys = new Set();
  allTasks.forEach((task) => {
    const key = `${normalizeField(task.id)}:${normalizeField(task.name)}:${normalizeField(task.stageName)}:${normalizeField(task.dueDate)}`;
    if (seenTaskKeys.has(key)) return;
    seenTaskKeys.add(key);
    uniqueTasks.push(task);
  });

  const taskLevelSla =
    uniqueTasks.find((task) => normalizeField(task.slaStatus || '').includes('overdue'))?.slaStatus
    || uniqueTasks.find((task) => normalizeField(task.slaStatus || '').includes('soon') || normalizeField(task.slaStatus || '').includes('later'))?.slaStatus
    || uniqueTasks.find((task) => String(task.slaStatus || '').trim())?.slaStatus
    || '';

  const normalizedSla = normalizeSlaStatus(
    instanceContext.slaStatus
    || taskLevelSla
    || findValueByKeyTokens(instanceContext.instance || {}, ['sla'])
    || findValueByKeyTokens(record || {}, ['sla'])
  ) || 'N/A';

  return {
    id: instanceContext.instanceId,
    caseId: instanceContext.caseId,
    folderKey: uiPathConfig.folderKey || instanceContext.folderKey || '',
    processKey: instanceContext.processKey,
    status: instanceContext.status,
    currentStage: instanceContext.currentStage || '',
    createdTime: instanceContext.createdTime || '',
    startedTime: instanceContext.createdTime || '',
    slaStatus: normalizedSla,
    stages: mappedStages,
    tasks: uniqueTasks,
    activity: (instanceContext.activity || []).map((item, index) => {
      const looksNormalized = item && typeof item === 'object' && ('title' in item) && ('time' in item);
      return looksNormalized ? item : mapActivityItem(item, index);
    }),
    client: {
      clientId: findRecordValueByKey(record, 'ClientID', ['ClientId', 'Client_ID']),
      name: findRecordValueByKey(record, 'Name', ['FullName']),
      birthDate: findRecordValueByKey(record, 'BirthDate'),
      scoring: findRecordValueByKey(record, 'Scoring', ['RiskScore']),
      debtRatio: findRecordValueByKey(record, 'DebtRatio', ['Debt_Ratio']),
      incomes: findRecordValueByKey(record, 'Incomes', ['Income']),
      expenses: findRecordValueByKey(record, 'Expenses', ['Expense']),
    },
    credit: {
      creditType: findRecordValueByKey(record, 'CreditType', ['TypeCredit', 'Type_Credit']),
      requestedAmount: findRecordValueByKey(record, 'RequestedAmount', ['AmountRequested', 'Requested_Amount']),
      duration: findRecordValueByKey(record, 'Duration', ['DurationMonths', 'Duration_Months']),
      finalDecision: findRecordValueByKey(record, 'FinalDecision', ['DecisionFinale']),
      paymentDate: findRecordValueByKey(record, 'PaymentDate', ['DisbursementDate']),
    },
    documents,
    executionHistory: instanceContext.executionHistory || null,
  };
};

const getStagesData = async (token, instanceId, folderKey) => {
  try {
    const [caseJson, executionHistory] = await Promise.all([
      uiPathJsonRequestWithHeaders(token, `pims_/api/v1/cases/${instanceId}/case-json`, {}, { 'X-UIPATH-FolderKey': folderKey }),
      uiPathJsonRequestWithHeaders(token, `pims_/api/v1/element-executions/case-instances/${instanceId}`, {}, { 'X-UIPATH-FolderKey': folderKey }),
    ]);

    const stagesArray = buildStagesFromCaseDefinition(caseJson, executionHistory);
    if (!stagesArray.length) {
      return { currentStageName: '', stages: [], executionHistory: null, caseJson: null };
    }

    const currentStageName = inferCurrentStageName(stagesArray);
    const normalizedStages = stagesArray.map((stage) => ({
      ...stage,
      isCurrent: stage.name === currentStageName,
    }));

    return { currentStageName, stages: normalizedStages, executionHistory, caseJson };
  } catch (error) {
    console.warn(`getStagesData error for ${instanceId}:`, error.message);
    return { currentStageName: '', stages: [], executionHistory: null, caseJson: null };
  }
};

const getCaseTasksData = async (token, instanceId, folderKey) => {
  try {
    const response = await uiPathJsonRequestWithHeaders(
      token,
      'orchestrator_/odata/Tasks/UiPath.Server.Configuration.OData.GetTasksAcrossFolders',
      {
        '$filter': `Tags/any(tags:tags/DisplayName eq '${instanceId}') and (IsDeleted eq false)`,
        '$expand': 'AssignedToUser,Activities',
        '$top': 100,
        '$skip': 0,
        '$count': true,
      },
      folderKey ? { 'X-UIPATH-FolderKey': folderKey } : {},
    );

    return extractItems(response)
      .filter((task) => task && typeof task === 'object')
      .map(normalizeActionTask);
  } catch (error) {
    console.warn(`getCaseTasksData error for ${instanceId}:`, error.message);
    return [];
  }
};

const getCaseActivityData = async (token, instanceId, folderKey) => {
  try {
    const executionHistory = await uiPathJsonRequestWithHeaders(
      token,
      `pims_/api/v1/element-executions/case-instances/${instanceId}`,
      {},
      { 'X-UIPATH-FolderKey': folderKey },
    );
    const actionTasks = await getCaseTasksData(token, instanceId, folderKey);
    return buildActivityFromExecutionHistory(executionHistory, actionTasks);
  } catch (error) {
    console.warn(`getCaseActivityData error for ${instanceId}:`, error.message);
    return [];
  }
};

const getCurrentStage = async (token, instanceId, folderKey) => {
  const { currentStageName } = await getStagesData(token, instanceId, folderKey);
  return currentStageName;
};

// Keep for backward compat — unused but safe to keep
const _getCurrentStageLegacy = async (token, instanceId, folderKey) => {
  try {
    const stagesUrl = buildUiPathUrl(`maestro_/api/Cases/${instanceId}/Stages`);
    const response = await fetch(stagesUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-UIPATH-FolderKey': folderKey,
      },
    });
    if (!response.ok) return '';
    const stages = await response.json();
    if (Array.isArray(stages) && stages.length > 0) {
      const currentStage = stages.find((s) => s.isCurrent || s.status === 'Active' || s.status === 'InProgress');
      return currentStage?.stageName || currentStage?.name || '';
    }
    return '';
  } catch (error) {
    return '';
  }
};

const fetchUiPathData = async (token) => {
  const [processesResponse, instancesResponse, entitiesResponse] = await Promise.all([
    uiPathJsonRequest(token, 'pims_/api/v1/processes/summary', { processType: 'CaseManagement' }),
    uiPathJsonRequest(token, 'pims_/api/v1/instances', { processType: 'CaseManagement', pageSize: 200 }),
    uiPathJsonRequest(token, 'datafabric_/api/Entity'),
  ]);

  const processes = processesResponse?.processes || [];
  const instances = instancesResponse?.instances || [];
  let entities = extractItems(entitiesResponse);
  const filteredInstances = instances.filter((instance) => (
    matchesTargetProcessKey(instance)
    && matchesTargetCaseModel(instance)
    && matchesTargetFolder(instance)
  ));

  let mainCaseEntity = resolveEntityByConfiguredName(entities, uiPathConfig.mainCaseEntityName, ['credit', 'main', 'case']);
  let documentsEntity = resolveEntityByConfiguredName(entities, uiPathConfig.caseDocumentsEntityName, ['credit', 'case', 'document']);

  if (!mainCaseEntity || !documentsEntity) {
    try {
      const entitiesUnscopedResponse = await uiPathJsonRequestWithoutFolderContext(token, 'datafabric_/api/Entity');
      const entitiesUnscoped = extractItems(entitiesUnscopedResponse);
      if (entitiesUnscoped.length) {
        entities = entitiesUnscoped;
        if (!mainCaseEntity) {
          mainCaseEntity = resolveEntityByConfiguredName(entities, uiPathConfig.mainCaseEntityName, ['credit', 'main', 'case']);
        }
        if (!documentsEntity) {
          documentsEntity = resolveEntityByConfiguredName(entities, uiPathConfig.caseDocumentsEntityName, ['credit', 'case', 'document']);
        }
      }
    } catch (_error) {
    }
  }

  console.log('DEBUG fetchUiPathData - mainCaseEntity found:', !!mainCaseEntity, mainCaseEntity?.name);
  console.log('DEBUG fetchUiPathData - documentsEntity found:', !!documentsEntity, documentsEntity?.name);

  let mainCaseRecords = [];
  let documentRecords = [];

  if (mainCaseEntity?.id) {
    mainCaseRecords = await readEntityRecordsWithFallback(token, mainCaseEntity.id, {
      limit: 500,
      start: 0,
      expansionLevel: 2,
    });
    console.log('DEBUG fetchUiPathData - mainCaseRecords count:', mainCaseRecords.length);
  }

  if (documentsEntity?.id) {
    documentRecords = await readEntityRecordsWithFallback(token, documentsEntity.id, {
      limit: 500,
      start: 0,
      expansionLevel: 2,
    });
  }

  const mainCaseIndex = buildMainCaseIndex(mainCaseRecords);
  const instanceContexts = filteredInstances.map((instance) => enrichInstanceWithMainCase(instance, mainCaseRecords, mainCaseIndex));

  console.log('DEBUG fetchUiPathData - instanceContexts[0]:', JSON.stringify(instanceContexts[0], null, 2));

  // Enrich each instance with stages data (currentStage + full stages for detail)
  const enrichedContexts = await Promise.all(
    instanceContexts.map(async (context) => {
      const [stagesData, tasks, activity] = await Promise.all([
        getStagesData(token, context.instanceId, uiPathConfig.folderKey),
        getCaseTasksData(token, context.instanceId, uiPathConfig.folderKey),
        getCaseActivityData(token, context.instanceId, uiPathConfig.folderKey),
      ]);

      const currentStageFromTasks = tasks
        .map((task) => mapTaskLikeObject(task))
        .find((task) => isActiveProgressStatus(task.taskState || task.status))?.stageName || '';

      const currentStageFromExecution = inferCurrentStageName(stagesData.stages || []);

      const derivedSla = normalizeSlaStatus(
        context.slaStatus
        || tasks.find((task) => String(task.slaStatus || '').trim())?.slaStatus
        || ''
      ) || 'N/A';

      return {
        ...context,
        currentStage: stagesData.currentStageName || currentStageFromTasks || currentStageFromExecution || context.currentStage || '',
        stages: stagesData.stages,
        tasks,
        activity,
        executionHistory: stagesData.executionHistory,
        caseJson: stagesData.caseJson,
        slaStatus: derivedSla,
      };
    })
  );

  const list = enrichedContexts.map((context) => ({
    id: context.instanceId,
    caseId: context.caseId,
    processKey: context.processKey,
    status: context.status,
    currentStage: context.currentStage || '-',
    clientName: findRecordValueByKey(context.mainCaseRecord || {}, 'Name', ['FullName', 'ClientName']) || '-',
    creditType: findRecordValueByKey(context.mainCaseRecord || {}, 'CreditType', ['TypeCredit', 'Type_Credit']),
    requestedAmount: findRecordValueByKey(context.mainCaseRecord || {}, 'RequestedAmount', ['AmountRequested', 'Requested_Amount']),
    dossierStatus:
      cleanPlaceholder(getStringField(context.mainCaseRecord || {}, ['CaseStatus', 'Status', 'DossierStatus'])) ||
      cleanPlaceholder(findValueByKeyTokens(context.mainCaseRecord || {}, ['casestatus', 'dossierstatus', 'status'])) ||
      context.status ||
      '-',
    createdTime:
      cleanPlaceholder(getStringField(context.mainCaseRecord || {}, ['CreateTime', 'CreatedAt', 'CreationTime', 'UpdateTime'])) ||
      cleanPlaceholder(findValueByKeyTokens(context.mainCaseRecord || {}, ['createtime', 'createdat', 'creationtime'])) ||
      cleanPlaceholder(context.createdTime) ||
      '',
    slaStatus: context.slaStatus || 'N/A',
  }));

  const detailById = new Map(
    enrichedContexts.map((context) => [
      context.instanceId,
      mapCaseDetail(context, documentRecords, documentsEntity?.name || uiPathConfig.caseDocumentsEntityName),
    ])
  );

  return {
    list,
    detailById,
    source: 'uipath',
    processCount: processes.length,
  };
};

const cases = [
  {
    id: 'd9470e73-341f-4593-a231-b00ebff27125',
    processKey: 'CM_Credit_Case',
    status: 'Running',
    client: {
      clientId: 'CL-0001',
      name: 'Jean Dupont',
      birthDate: '1988-04-12',
      scoring: 74,
      debtRatio: '31%',
      incomes: 4200,
      expenses: 1300
    },
    credit: {
      creditType: 'Immobilier',
      requestedAmount: 185000,
      duration: 240,
      finalDecision: 'En étude',
      paymentDate: '2026-03-20'
    },
    documents: [
      {
        id: 'doc-1',
        fileType: 'PDF',
        fileName: 'Justificatif_Revenus.pdf',
        url: 'https://example.org/docs/justificatif-revenus.pdf'
      }
    ]
  },
  {
    id: '45fd966b-f123-4b27-b18f-a02eb6a1a344',
    processKey: 'CM_Credit_Case',
    status: 'Completed',
    client: {
      clientId: 'CL-0002',
      name: 'Sophie Martin',
      birthDate: '1991-11-02',
      scoring: 81,
      debtRatio: '24%',
      incomes: 5100,
      expenses: 1500
    },
    credit: {
      creditType: 'Consommation',
      requestedAmount: 22000,
      duration: 60,
      finalDecision: 'Accepté',
      paymentDate: '2026-02-05'
    },
    documents: [
      {
        id: 'doc-2',
        fileType: 'PDF',
        fileName: 'Piece_Identite.pdf',
        url: 'https://example.org/docs/piece-identite.pdf'
      }
    ]
  },
  {
    id: 'a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6',
    processKey: 'CM_Credit_Case',
    status: 'Error',
    client: {
      clientId: 'CL-0003',
      name: 'Marc Blanc',
      birthDate: '1985-07-15',
      scoring: 45,
      debtRatio: '68%',
      incomes: 2800,
      expenses: 1900
    },
    credit: {
      creditType: 'Auto',
      requestedAmount: 35000,
      duration: 84,
      finalDecision: 'Rejeté',
      paymentDate: null
    },
    documents: []
  }
];

const getMockList = () => cases.map((item) => ({
  id: item.id,
  caseId: `CRD-${String(item.id).substring(0, 8).toUpperCase()}`,
  processKey: item.processKey,
  status: item.status,
  dossierStatus: item.status,
  currentStage: 'Mock Stage',
  clientName: item.client.name,
  creditType: item.credit.creditType,
  requestedAmount: item.credit.requestedAmount,
  createdTime: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  slaStatus: 'OK',
}));

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  const source = hasUiPathBaseConfig() ? 'uipath' : 'mock';
  res.json({ ok: true, source });
});

app.get('/api/source', (req, res) => {
  const hasBearer = Boolean(getBearerTokenFromRequest(req));
  const mode = hasUiPathBaseConfig() ? 'uipath' : 'mock';
  const authMode = hasBearer ? 'oauth-bearer-header' : hasClientCredentials() ? 'client-credentials' : 'none';

  res.json({
    mode,
    authMode,
    targetProcessKey: uiPathConfig.targetProcessKey,
    targetCaseModelId: uiPathConfig.targetCaseModelId,
    mainCaseEntityName: uiPathConfig.mainCaseEntityName,
    caseDocumentsEntityName: uiPathConfig.caseDocumentsEntityName,
    folderKey: uiPathConfig.folderKey,
  });
});

app.post('/api/loan-requests', upload.array('documents', 20), async (req, res) => {
  try {
    const payloadRaw = req.body?.payload;
    const formPayload = typeof payloadRaw === 'string' ? JSON.parse(payloadRaw) : (payloadRaw || req.body || {});
    const documents = Array.isArray(req.files) ? req.files : [];

    if (!formPayload || typeof formPayload !== 'object') {
      return res.status(400).json({ message: 'Payload formulaire invalide.' });
    }

    const parseNumeric = (value) => {
      if (value === null || value === undefined) return 0;
      if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
      const normalized = String(value)
        .replace(/\s/g, '')
        .replace(',', '.');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    };

    const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');

    const requestedAmount = parseNumeric(pickFirst(
      formPayload.requestedAmount,
      formPayload.loanAmount,
      formPayload?.loanDetails?.requestedAmount,
      formPayload?.loanDetails?.loanAmount,
    ));
    const durationMonths = parseNumeric(pickFirst(
      formPayload.durationMonths,
      formPayload?.loanDetails?.durationMonths,
      formPayload?.loanDetails?.loanDurationMonths,
    ));
    const loanPurpose = String(pickFirst(
      formPayload.loanPurpose,
      formPayload?.loanDetails?.loanPurpose,
      formPayload?.loanDetails?.purpose,
    ) || '').trim();

    if (!loanPurpose || requestedAmount <= 0) {
      return res.status(400).json({ message: 'Objet du prêt et montant demandé sont obligatoires.' });
    }

    const generatedCaseId = `WEB-${String(Date.now()).slice(-8)}`;

    if (!hasUiPathBaseConfig()) {
      return res.status(200).json({
        message: 'Données simulées: mode mock actif.',
        source: 'mock',
        caseId: generatedCaseId,
        createdDocuments: documents.length,
      });
    }

    if (!getBearerTokenFromRequest(req) && !hasClientCredentials()) {
      return res.status(401).json({
        message: 'Mode UiPath actif mais aucun token OAuth fourni. Envoie Authorization: Bearer <token> ou configure UIPATH_CLIENT_SECRET.',
      });
    }

    const token = await resolveAuthToken(req);

    // Résolution des entités avec fallback sans folder-scope (même logique que fetchUiPathData)
    let entitiesRaw = extractItems(await uiPathJsonRequest(token, 'datafabric_/api/Entity'));
    let mainCaseEntity = resolveEntityByConfiguredName(entitiesRaw, uiPathConfig.mainCaseEntityName, ['credit', 'main', 'case']);
    let documentsEntity = resolveEntityByConfiguredName(entitiesRaw, uiPathConfig.caseDocumentsEntityName, ['credit', 'case', 'document']);

    if (!mainCaseEntity || !documentsEntity) {
      try {
        entitiesRaw = extractItems(await uiPathJsonRequestWithoutFolderContext(token, 'datafabric_/api/Entity'));
        if (!mainCaseEntity) mainCaseEntity = resolveEntityByConfiguredName(entitiesRaw, uiPathConfig.mainCaseEntityName, ['credit', 'main', 'case']);
        if (!documentsEntity) documentsEntity = resolveEntityByConfiguredName(entitiesRaw, uiPathConfig.caseDocumentsEntityName, ['credit', 'case', 'document']);
      } catch (_) {}
    }

    if (!mainCaseEntity?.id) {
      return res.status(404).json({ message: `Entité principale introuvable: ${uiPathConfig.mainCaseEntityName}` });
    }
    if (!documentsEntity?.id) {
      return res.status(404).json({ message: `Entité documents introuvable: ${uiPathConfig.caseDocumentsEntityName}` });
    }

    console.log('LOAN-REQUEST entities: mainCase=', mainCaseEntity.name, '| docs=', documentsEntity.name);

    const firstName = String(pickFirst(formPayload.firstName, formPayload?.personalInfo?.firstName) || '').trim();
    const lastName = String(pickFirst(formPayload.lastName, formPayload?.personalInfo?.lastName) || '').trim();
    const clientCode = String(pickFirst(formPayload.clientCode, formPayload.clientId, formPayload.clientRef, formPayload?.personalInfo?.clientCode) || '').trim();
    const fullName = String(pickFirst(formPayload.fullName, formPayload?.personalInfo?.fullName, `${firstName} ${lastName}`) || '').trim();
    const birthDate = String(pickFirst(formPayload.birthDate, formPayload?.personalInfo?.birthDate) || '').trim();
    const creditType = String(pickFirst(formPayload.creditType, formPayload?.loanDetails?.creditType, 'Prêt personnel') || 'Prêt personnel').trim();
    const durationValue = durationMonths > 0 ? durationMonths : 48;
    const netIncome = parseNumeric(pickFirst(formPayload.netIncome, formPayload?.income?.netIncome));
    const monthlyCharges = parseNumeric(pickFirst(formPayload.monthlyCharges, formPayload?.income?.monthlyCharges));
    const otherIncome = parseNumeric(pickFirst(formPayload.otherIncome, formPayload?.income?.otherIncome));
    const debtRatio = String(pickFirst(formPayload.debtRatio, formPayload?.income?.debtRatio) || '').trim();
    const iban = String(pickFirst(formPayload.iban, formPayload?.banking?.iban) || '').trim();
    const bankName = String(pickFirst(formPayload.bankName, formPayload?.banking?.bankName) || '').trim();
    const address = String(pickFirst(formPayload.address, formPayload?.personalInfo?.address) || '').trim();
    const city = String(pickFirst(formPayload.city, formPayload?.personalInfo?.city) || '').trim();
    const phone = String(pickFirst(formPayload.phone, formPayload?.personalInfo?.phone) || '').trim();
    const email = String(pickFirst(formPayload.email, formPayload?.personalInfo?.email) || '').trim();
    const familyStatus = String(pickFirst(formPayload.familyStatus, formPayload?.personalInfo?.familyStatus) || '').trim();
    const housingStatus = String(pickFirst(formPayload.housingStatus, formPayload?.personalInfo?.housingStatus) || '').trim();
    const profession = String(pickFirst(formPayload.jobTitle, formPayload?.employment?.jobTitle) || '').trim();
    const employer = String(pickFirst(formPayload.employer, formPayload?.employment?.employer) || '').trim();
    const contractType = String(pickFirst(formPayload.contractType, formPayload?.employment?.contractType) || '').trim();
    const seniority = String(pickFirst(formPayload.seniority, formPayload?.employment?.seniority) || '').trim();
    const consent = Boolean(pickFirst(formPayload.acceptSolvabilityStudy, formPayload?.consent?.personalData));
    const createTime = new Date().toISOString();

    const sourceValues = {
      caseId: generatedCaseId,
      clientCode,
      incomingChannel: 'WEB',
      name: fullName,
      birthDate,
      creditType,
      requestedAmount,
      duration: durationValue,
      loanPurpose,
      caseStatus: 'Initiation',
      incomes: netIncome,
      expenses: monthlyCharges,
      otherIncome,
      debtRatio,
      iban,
      bankName,
      address,
      city,
      phone,
      email,
      familyStatus,
      housingStatus,
      profession,
      employer,
      contractType,
      seniority,
      consent,
      createTime,
    };

    const sampleRecord = await getEntitySampleRecord(token, mainCaseEntity.id);
    const dynamicMappedPayload = mapValuesToEntityColumns(sourceValues, sampleRecord);
    const mainCasePayload = {
      ...dynamicMappedPayload,
      IncomingChannel: 'WEB',
      incomingChannel: 'WEB',
      Incoming_Channel: 'WEB',
    };

    const createdMainCase = await insertThenUpdateCaseId(token, mainCaseEntity.id, mainCasePayload, generatedCaseId);

    const documentSampleRecord = await getEntitySampleRecord(token, documentsEntity.id);

    const uploadedDocuments = [];
    const failedDocuments = [];
    for (const file of documents) {
      try {
        const rawFileName = file.originalname || 'document.bin';
        const documentSourceValues = {
          caseId: generatedCaseId,
          fileName: rawFileName,
          fileType: file?.mimetype || '',
        };

        const mappedDocumentPayload = mapDocumentValuesToEntityColumns(documentSourceValues, documentSampleRecord);

        const documentPayload = {
          ...mappedDocumentPayload,
          OCaseID: generatedCaseId,
          FileName: rawFileName,
        };

        const createdDocument = await createEntityRecord(token, documentsEntity.id, documentPayload);
        const documentRecordId = createdDocument.recordId;

        if (!documentRecordId) {
          throw new Error(`RecordId document introuvable pour ${file.originalname || 'document.bin'}`);
        }

        await uploadEntityAttachment(
          token,
          documentsEntity.name || uiPathConfig.caseDocumentsEntityName,
          documentRecordId,
          uiPathConfig.caseDocumentsAttachmentField || 'File',
          file,
        );

        let metadataWarning = '';
        try {
          await updateDocumentFieldsByRecordId(token, documentsEntity.id, documentRecordId, documentPayload);
        } catch (updateError) {
          metadataWarning = updateError.message;
          console.warn(`WARNING document metadata update ${documentRecordId}: ${updateError.message}`);
        }

        uploadedDocuments.push({
          fileName: rawFileName,
          recordId: documentRecordId,
          metadataWarning,
        });
      } catch (error) {
        failedDocuments.push({
          fileName: file?.originalname || 'document.bin',
          error: error.message,
        });
      }
    }

    res.status(201).json({
      message: 'Demande de crédit enregistrée dans CM_Credit_MainCase.',
      source: 'uipath',
      caseId: generatedCaseId,
      mainCaseRecordId: createdMainCase.recordId || null,
      uploadedDocuments,
      failedDocuments,
    });
  } catch (error) {
    console.error('ERROR /api/loan-requests:', error.message, error.stack);
    res.status(502).json({ message: `Erreur backend création demande: ${error.message}` });
  }
});

app.post('/api/debug/uipath-data', async (req, res) => {
  try {
    if (!hasUiPathBaseConfig()) {
      return res.status(400).json({ message: 'UiPath config incomplete' });
    }

    const token = req.body?.token || getBearerTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: 'No token provided in body or header' });
    }
    
    // Fetch raw data
    const [processesResponse, instancesResponse, entitiesResponse] = await Promise.all([
      uiPathJsonRequest(token, 'pims_/api/v1/processes/summary', { processType: 'CaseManagement' }),
      uiPathJsonRequest(token, 'pims_/api/v1/instances', { processType: 'CaseManagement', pageSize: 5 }),
      uiPathJsonRequest(token, 'datafabric_/api/Entity'),
    ]);

    const instances = instancesResponse?.instances || [];
    const entities = extractItems(entitiesResponse);
    const mainCaseEntity = entities.find((item) => item.name === uiPathConfig.mainCaseEntityName);

    let mainCaseRecords = [];
    if (mainCaseEntity?.id) {
      const mainCaseResponse = await uiPathJsonRequest(token, `datafabric_/api/EntityService/entity/${mainCaseEntity.id}/read`, {
        limit: 5,
        start: 0,
        expansionLevel: 2,
      });
      mainCaseRecords = extractItems(mainCaseResponse);
    }

    // Return first instance and first MainCase record with all fields
    const firstInstance = instances[0] || {};
    const firstMainCase = mainCaseRecords[0] || {};
    const firstStagesCall = instances.length > 0 ? await getCurrentStage(token, instances[0].instanceId, uiPathConfig.folderKey) : '';

    res.json({
      message: 'Debug data - inspect structure',
      firstInstance: {
        keys: Object.keys(firstInstance),
        sample: firstInstance,
      },
      firstMainCase: {
        keys: Object.keys(firstMainCase),
        sample: firstMainCase,
      },
      firstStagesCallResult: firstStagesCall,
    });
  } catch (error) {
    res.status(502).json({ message: `Debug error: ${error.message}` });
  }
});

app.get('/api/cases', async (req, res) => {
  try {
    if (!hasUiPathBaseConfig()) {
      res.json(getMockList());
      return;
    }

    if (!getBearerTokenFromRequest(req) && !hasClientCredentials()) {
      res.status(401).json({
        message: 'Mode UiPath actif mais aucun token OAuth fourni. Envoie Authorization: Bearer <token> ou configure UIPATH_CLIENT_SECRET.',
      });
      return;
    }

    const token = await resolveAuthToken(req);
    const data = await fetchUiPathData(token);
    console.log('DEBUG /api/cases - data.list:', JSON.stringify(data.list, null, 2));
    res.json(data.list);
  } catch (error) {
    console.error('ERROR /api/cases:', error.message, error.stack);
    res.status(502).json({ message: `Erreur backend UiPath: ${error.message}` });
  }
});

app.get('/api/cases/:id', async (req, res) => {
  try {
    if (!hasUiPathBaseConfig()) {
      const mockFound = cases.find((item) => item.id === req.params.id);
      if (!mockFound) {
        res.status(404).json({ message: 'Case introuvable' });
        return;
      }
      res.json(mockFound);
      return;
    }

    if (!getBearerTokenFromRequest(req) && !hasClientCredentials()) {
      res.status(401).json({
        message: 'Mode UiPath actif mais aucun token OAuth fourni. Envoie Authorization: Bearer <token> ou configure UIPATH_CLIENT_SECRET.',
      });
      return;
    }

    const token = await resolveAuthToken(req);
    const data = await fetchUiPathData(token);
    const found = data.detailById.get(req.params.id);
    if (!found) {
      res.status(404).json({ message: 'Case introuvable' });
      return;
    }
    res.json(found);
  } catch (error) {
    res.status(502).json({ message: `Erreur backend UiPath: ${error.message}` });
  }
});

app.get('/api/documents/:recordId', async (req, res) => {
  try {
    if (!hasUiPathBaseConfig()) {
      res.status(400).json({ message: 'Téléchargement document disponible uniquement en mode UiPath réel.' });
      return;
    }

    if (!getBearerTokenFromRequest(req) && !hasClientCredentials()) {
      res.status(401).json({
        message: 'Mode UiPath actif mais aucun token OAuth fourni. Envoie Authorization: Bearer <token> ou configure UIPATH_CLIENT_SECRET.',
      });
      return;
    }

    const { recordId } = req.params;
    const entityName = String(req.query.entityName || uiPathConfig.caseDocumentsEntityName);
    const fieldName = String(req.query.fieldName || 'File');
    const fileName = String(req.query.fileName || `${recordId}.pdf`);

    const token = await resolveAuthToken(req);
    const url = buildUiPathUrl(`datafabric_/api/Attachment/${entityName}/${recordId}/${fieldName}`);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      res.status(response.status).json({ message: `Erreur document UiPath: ${text}` });
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    res.status(502).json({ message: `Erreur backend document UiPath: ${error.message}` });
  }
});

// Endpoint pour échanger le code OAuth contre un access_token
app.post('/api/oauth/token', async (req, res) => {
  console.log('POST /api/oauth/token appelé avec:', req.body);
  const { code, redirect_uri, code_verifier } = req.body;
  
  if (!code) {
    return res.status(400).json({ message: 'Code OAuth requis' });
  }

  if (!hasUiPathBaseConfig()) {
    return res.status(500).json({ message: 'Configuration UiPath incomplète' });
  }

  try {
    const tokenUrl = `${uiPathConfig.baseUrl}/identity_/connect/token`;
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri || `${req.protocol}://${req.get('host')}/oauth-callback`,
      client_id: uiPathConfig.clientId
    });

    // Ajouter code_verifier si fourni (PKCE)
    if (code_verifier) {
      params.append('code_verifier', code_verifier);
    }

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-UIPATH-TenantName': uiPathConfig.tenantName
      },
      body: params.toString()
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('UiPath token exchange error:', errorText);
      return res.status(response.status).json({ 
        message: 'Erreur lors de l\'échange du code OAuth',
        details: errorText
      });
    }

    const tokenData = await response.json();
    res.json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(502).json({ message: `Erreur serveur: ${error.message}` });
  }
});

const frontendPath = path.resolve(__dirname, '..', 'frontend');

// Serve static files from frontend directory
app.use((_req, res, next) => {
  // Skip static middleware for API routes
  if (_req.path.startsWith('/api/') || _req.path === '/api') {
    return next();
  }
  express.static(frontendPath)(_req, res, next);
});

// Catch-all: serve index.html for client-side routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Backend démarré sur http://localhost:${port}`);
  console.log(`Mode données: ${hasUiPathBaseConfig() ? 'UiPath réel' : 'Mock (config incomplète)'}`);
  console.log(`Auth backend: ${hasClientCredentials() ? 'client_credentials actif' : 'attente Bearer OAuth en header'}`);
});
