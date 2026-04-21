import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  hasUiPathBaseConfig: true,
  hasClientCredentials: true,
  folderId: 321,
  sdkDownloadShouldFail: false,
  sdkTokens: [] as string[],
  assignedUsers: [] as Array<{ taskId: number; userNameOrEmail: string }>,
  completedTasks: [] as Array<{ taskId: number; type: string; folderId: number; action: string }>,
  getTaskById: ((token: string, id: number) => ({
    id,
    title: `Task-${id}-${token}`,
    status: 'Pending',
    type: 'AppTask',
    folderId: 321,
    taskAssigneeName: '',
    formLayout: { schema: true },
    data: {},
  })) as (token: string, id: number) => any,
  caseList: [
    { id: 'case-1', caseId: 'CASE-1', status: 'Running', currentStage: 'Review', clientName: 'Alice' },
  ],
  caseDetail: { id: 'case-1', caseId: 'CASE-1', status: 'Running', tasks: [] },
}));

vi.mock('../config/uipath.ts', () => ({
  uiPathConfig: {
    baseUrl: 'https://api.uipath.com',
    orgName: 'org',
    tenantName: 'tenant',
    folderKey: 'folder-key',
    folderId: state.folderId,
    clientId: 'cid',
    clientSecret: 'secret',
    scope: 'OR.Tasks OR.DataService PIMS',
    targetProcessKey: 'CM_Credit_MainProcess',
    targetCaseModelId: '',
    mainCaseEntityName: 'CM_Credit_MainCase',
    caseDocumentsEntityName: 'CM_Credit_CaseDocuments',
    caseDocumentsAttachmentField: 'File',
  },
  hasUiPathBaseConfig: () => state.hasUiPathBaseConfig,
  hasClientCredentials: () => state.hasClientCredentials,
}));

vi.mock('../lib/uipath-client.ts', () => ({
  getBearerTokenFromRequest: (req: any) => {
    const auth = String(req?.headers?.authorization || '');
    if (!auth.toLowerCase().startsWith('bearer ')) return '';
    return auth.slice(7).trim();
  },
  resolveAuthToken: async (req: any) => {
    const auth = String(req?.headers?.authorization || '');
    if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
    return 'client-credentials-token';
  },
  buildUiPathUrl: (p: string) => `https://api.uipath.com/org/tenant/${p}`,
  uiPathJsonRequest: async (_token: string, path: string) => {
    if (path === 'datafabric_/api/Entity') {
      return {
        items: [
          { id: 'main-entity', name: 'CM_Credit_MainCase', displayName: 'Main' },
          { id: 'doc-entity', name: 'CM_Credit_CaseDocuments', displayName: 'Docs' },
        ],
      };
    }
    return {};
  },
  uiPathJsonRequestWithoutFolderContext: async () => ({ items: [] }),
  uiPathJsonRequestWithHeaders: async () => ({ formLayout: { fallback: true }, data: { ok: true } }),
}));

vi.mock('../lib/uipath-sdk.ts', () => ({
  createUiPathSdkContext: (token: string) => {
    state.sdkTokens.push(token);
    return {
      token,
      tasks: {
        getById: async (id: number) => state.getTaskById(token, id),
        assign: async (payload: any) => {
          state.assignedUsers.push(payload);
          return { success: true, data: [payload] };
        },
        complete: async (payload: any, folderId: number) => {
          state.completedTasks.push({
            taskId: payload.taskId,
            type: payload.type,
            folderId,
            action: payload.action,
          });
          return { success: true, data: payload };
        },
      },
      entities: {
        downloadAttachment: async () => {
          if (state.sdkDownloadShouldFail) {
            throw new Error('download failed');
          }
          return new Blob([Buffer.from('pdf-content')], { type: 'application/pdf' });
        },
      },
      cases: {},
      caseInstances: {},
      sdk: {},
    };
  },
  resolveFolderIdFromTask: (task: any) => Number(task?.folderId || task?.FolderId || state.folderId || 0) || undefined,
}));

vi.mock('../lib/fetch-uipath-data.ts', () => ({
  fetchUiPathCaseList: async () => ({ list: state.caseList }),
  fetchUiPathCaseDetail: async (_token: string, id: string) => (id === 'case-1' ? state.caseDetail : null),
}));

vi.mock('../lib/entity-operations.ts', () => ({
  createEntityRecord: async () => ({ record: {}, recordId: 'doc-record-1' }),
  deleteEntityRecordById: async () => undefined,
  getEntitySampleRecord: async () => ({ OCaseID: '', FileName: '', FileType: '' }),
  mapDocumentValuesToEntityColumns: (v: any) => ({ OCaseID: v.caseId, FileName: v.fileName, FileType: v.fileType }),
  updateDocumentFieldsByRecordId: async () => undefined,
  uploadEntityAttachment: async () => undefined,
  insertThenUpdateCaseId: async () => ({ record: {}, recordId: 'main-record-1', updateWarning: '' }),
  mapValuesToEntityColumns: (v: any) => ({ Name: v.name, RequestedAmount: v.requestedAmount }),
}));

vi.mock('../lib/case-processors.ts', () => ({
  resolveEntityByConfiguredName: (entities: any[], configuredName: string) =>
    entities.find((item) => String(item?.name || '').toLowerCase() === String(configuredName || '').toLowerCase()) || null,
  getCurrentStage: async () => 'Review',
}));

let app: any;
const originalFetch = globalThis.fetch;

beforeAll(async () => {
  const { createApp } = await import('../app.ts');
  app = createApp().app;
});

beforeEach(() => {
  state.hasUiPathBaseConfig = true;
  state.hasClientCredentials = true;
  state.folderId = 321;
  state.sdkDownloadShouldFail = false;
  state.sdkTokens = [];
  state.assignedUsers = [];
  state.completedTasks = [];
  globalThis.fetch = originalFetch;
  state.caseList = [{ id: 'case-1', caseId: 'CASE-1', status: 'Running', currentStage: 'Review', clientName: 'Alice' }];
  state.caseDetail = { id: 'case-1', caseId: 'CASE-1', status: 'Running', tasks: [] };
  state.getTaskById = (token: string, id: number) => ({
    id,
    title: `Task-${id}-${token}`,
    status: 'Pending',
    type: 'AppTask',
    folderId: 321,
    taskAssigneeName: '',
    formLayout: { schema: true },
    data: {},
  });
});

describe('System routes', () => {
  it('returns health source based on mode', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, source: 'uipath' });
  });

  it('returns source payload with auth mode and folderId', async () => {
    const res = await request(app).get('/api/source').set('Authorization', 'Bearer tok');
    expect(res.status).toBe(200);
    expect(res.body.mode).toBe('uipath');
    expect(res.body.authMode).toBe('oauth-bearer-header');
    expect(res.body.folderId).toBe(321);
  });
});

describe('Cases routes', () => {
  it('returns case list with stable API contract', async () => {
    const res = await request(app).get('/api/cases').set('Authorization', 'Bearer token-a');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].id).toBe('case-1');
  });

  it('returns case detail by id', async () => {
    const res = await request(app).get('/api/cases/case-1').set('Authorization', 'Bearer token-a');
    expect(res.status).toBe(200);
    expect(res.body.caseId).toBe('CASE-1');
  });

  it('returns 404 when case detail does not exist', async () => {
    const res = await request(app).get('/api/cases/unknown-case').set('Authorization', 'Bearer token-a');
    expect(res.status).toBe(404);
  });

  it('returns mock cases when UiPath mode is disabled', async () => {
    state.hasUiPathBaseConfig = false;
    const res = await request(app).get('/api/cases');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('caseId');
  });
});

describe('Tasks routes', () => {
  it('returns 400 for invalid task id', async () => {
    const res = await request(app).get('/api/tasks/not-a-number').set('Authorization', 'Bearer token-a');
    expect(res.status).toBe(400);
  });

  it('blocks unauthenticated access when no client credentials', async () => {
    state.hasClientCredentials = false;
    const res = await request(app).get('/api/tasks/11');
    expect(res.status).toBe(401);
  });

  it('allows client-credentials flow without bearer token', async () => {
    const res = await request(app).get('/api/tasks/11');
    expect(res.status).toBe(200);
    expect(res.body.Title).toContain('client-credentials-token');
  });

  it('assigns task to current user', async () => {
    const res = await request(app).post('/api/tasks/22/assign-self').set('Authorization', 'Bearer abc.def.ghi');
    expect(res.status).toBe(204);
  });

  it('completes task through SDK with folderId resolution', async () => {
    const res = await request(app)
      .post('/api/tasks/33/complete')
      .set('Authorization', 'Bearer token-c')
      .send({ action: 'submit', data: { approved: true } });

    expect(res.status).toBe(200);
    expect(state.completedTasks.length).toBe(1);
    expect(state.completedTasks[0].folderId).toBe(321);
  });

  it('falls back for task form endpoint when sdk task has no form payload', async () => {
    state.getTaskById = (_token: string, id: number) => ({
      id,
      title: `Task-${id}`,
      status: 'Pending',
      type: 'FormTask',
      folderId: 321,
      taskAssigneeName: '',
      formLayout: null,
      data: null,
    });

    const res = await request(app).get('/api/tasks/44/form').set('Authorization', 'Bearer token-form');
    expect(res.status).toBe(200);
    expect(res.body.formLayout).toEqual({ fallback: true });
  });

  it('rejects completion when action is missing', async () => {
    const res = await request(app)
      .post('/api/tasks/12/complete')
      .set('Authorization', 'Bearer token-c')
      .send({ data: { ok: true } });

    expect(res.status).toBe(400);
  });

  it('rejects completion when data is not an object', async () => {
    const res = await request(app)
      .post('/api/tasks/12/complete')
      .set('Authorization', 'Bearer token-c')
      .send({ action: 'submit', data: 'bad-value' });

    expect(res.status).toBe(400);
  });

  it('returns 502 when folderId cannot be resolved', async () => {
    state.folderId = 0;
    state.getTaskById = (_token: string, id: number) => ({
      id,
      title: `Task-${id}`,
      status: 'Pending',
      type: 'AppTask',
      taskAssigneeName: '',
    });

    const res = await request(app)
      .post('/api/tasks/33/complete')
      .set('Authorization', 'Bearer token-c')
      .send({ action: 'submit', data: { approved: true } });

    expect(res.status).toBe(502);
    expect(state.completedTasks.length).toBe(0);
  });

  it('keeps per-request token isolation under concurrency', async () => {
    const [a, b] = await Promise.all([
      request(app).get('/api/tasks/1').set('Authorization', 'Bearer token-A'),
      request(app).get('/api/tasks/2').set('Authorization', 'Bearer token-B'),
    ]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    expect(a.body.Title).toContain('token-A');
    expect(b.body.Title).toContain('token-B');
    expect(state.sdkTokens).toEqual(expect.arrayContaining(['token-A', 'token-B']));
  });
});

describe('Documents and loan routes', () => {
  it('returns 400 on upload when no file is provided', async () => {
    const res = await request(app)
      .post('/api/cases/CASE-1/documents')
      .set('Authorization', 'Bearer token-doc');

    expect(res.status).toBe(400);
  });

  it('uploads a document and returns existing response shape', async () => {
    const res = await request(app)
      .post('/api/cases/CASE-1/documents')
      .set('Authorization', 'Bearer token-doc')
      .attach('document', Buffer.from('file-content'), 'proof.pdf');

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('doc-record-1');
    expect(res.body.fileName).toBe('proof.pdf');
  });

  it('deletes a document record', async () => {
    const res = await request(app)
      .delete('/api/documents/doc-record-1')
      .set('Authorization', 'Bearer token-doc');

    expect(res.status).toBe(204);
  });

  it('falls back to raw download endpoint when sdk download fails', async () => {
    state.sdkDownloadShouldFail = true;
    const fetchMock = vi.fn(async () => (
      new Response(Buffer.from('raw-pdf-content'), {
        status: 200,
        headers: { 'content-type': 'application/pdf' },
      })
    ));
    globalThis.fetch = fetchMock as any;

    const res = await request(app)
      .get('/api/documents/doc-record-1?fileName=test.pdf')
      .set('Authorization', 'Bearer token-doc');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('creates a loan request with multipart payload', async () => {
    const payload = {
      loanPurpose: 'Car',
      requestedAmount: 12000,
      durationMonths: 36,
      firstName: 'John',
      lastName: 'Doe',
    };

    const res = await request(app)
      .post('/api/loan-requests')
      .set('Authorization', 'Bearer token-loan')
      .field('payload', JSON.stringify(payload))
      .attach('documents', Buffer.from('doc-a'), 'a.pdf');

    expect(res.status).toBe(201);
    expect(res.body.caseId).toMatch(/^WEB-/);
    expect(Array.isArray(res.body.uploadedDocuments)).toBe(true);
  });
});
