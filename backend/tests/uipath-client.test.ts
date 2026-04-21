import { describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  baseUrl: 'https://api.uipath.com',
  orgName: 'org',
  tenantName: 'tenant',
  folderKey: 'folder-key',
  hasClientCredentials: true,
}));

vi.mock('../config/uipath.ts', () => ({
  uiPathConfig: {
    get baseUrl() { return state.baseUrl; },
    get orgName() { return state.orgName; },
    get tenantName() { return state.tenantName; },
    get folderKey() { return state.folderKey; },
    clientId: 'cid',
    clientSecret: 'csecret',
    scope: 'OR.Tasks',
    folderId: 0,
    targetProcessKey: '',
    targetCaseModelId: '',
    mainCaseEntityName: '',
    caseDocumentsEntityName: '',
    caseDocumentsAttachmentField: 'File',
  },
  hasClientCredentials: () => state.hasClientCredentials,
}));

import {
  buildUiPathUrl,
  getBearerTokenFromRequest,
  parseUiPathJsonResponse,
  resolveAuthToken,
  withDataFabricFolderContext,
} from '../lib/uipath-client.ts';

describe('uipath-client unit tests', () => {
  it('extracts bearer token from request headers', () => {
    const req = { headers: { authorization: 'Bearer abc.def.ghi' } } as any;
    expect(getBearerTokenFromRequest(req)).toBe('abc.def.ghi');
  });

  it('builds UiPath URL with query params and normalized path', () => {
    const url = buildUiPathUrl('/pims_/api/v1/instances', { pageSize: 25, empty: '' });
    expect(url).toBe('https://api.uipath.com/org/tenant/pims_/api/v1/instances?pageSize=25');
  });

  it('adds folderKey for DataFabric endpoints only when missing', () => {
    expect(withDataFabricFolderContext('datafabric_/api/Entity', { limit: 10 }))
      .toEqual({ limit: 10, folderKey: 'folder-key' });

    expect(withDataFabricFolderContext('datafabric_/api/Entity', { folderKey: 'custom' }))
      .toEqual({ folderKey: 'custom' });

    expect(withDataFabricFolderContext('pims_/api/v1/instances', { pageSize: 10 }))
      .toEqual({ pageSize: 10 });
  });

  it('parses valid json responses', async () => {
    const response = new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });

    const parsed = await parseUiPathJsonResponse(response, 'pims_/api/v1/instances');
    expect(parsed).toEqual({ ok: true });
  });

  it('throws a readable error for html/non-json responses', async () => {
    const response = new Response('<html>forbidden</html>', {
      status: 200,
      headers: { 'content-type': 'text/html' },
    });

    await expect(parseUiPathJsonResponse(response, 'pims_/api/v1/instances'))
      .rejects
      .toThrow('Reponse HTML');
  });

  it('prefers bearer token in resolveAuthToken', async () => {
    const req = { headers: { authorization: 'Bearer route-token' } } as any;
    await expect(resolveAuthToken(req)).resolves.toBe('route-token');
  });
});

