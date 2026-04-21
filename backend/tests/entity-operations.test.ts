import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  sdkShouldFail: false,
  sdkCalls: [] as Array<{ entityId: string; recordId: string; fieldName: string; file: any }>,
  rawCalls: [] as Array<{ path: string; method: string; filePart: any }>,
}));

vi.mock('../lib/uipath-sdk.ts', () => ({
  createUiPathSdkContext: () => ({
    entities: {
      uploadAttachment: async (entityId: string, recordId: string, fieldName: string, file: any) => {
        state.sdkCalls.push({ entityId, recordId, fieldName, file });
        if (state.sdkShouldFail) {
          throw new Error('sdk upload failed');
        }
        return {};
      },
    },
  }),
}));

vi.mock('../lib/uipath-client.ts', () => ({
  uiPathJsonRequest: async () => ({}),
  uiPathJsonRequestWithoutFolderContext: async () => ({}),
  uiPathRequest: async (_token: string, path: string, options: any = {}) => {
    const formData = options?.body;
    const filePart = formData && typeof formData.get === 'function' ? formData.get('file') : null;
    state.rawCalls.push({
      path,
      method: String(options?.method || 'GET'),
      filePart,
    });
    return { ok: true, status: 200, text: '', json: {} };
  },
}));

import { uploadEntityAttachment } from '../lib/entity-operations.ts';

const createMulterFile = () => ({
  buffer: Buffer.from('%PDF-1.4 mock'),
  originalname: 'proof.pdf',
  mimetype: 'application/pdf',
});

beforeEach(() => {
  state.sdkShouldFail = false;
  state.sdkCalls = [];
  state.rawCalls = [];
});

describe('uploadEntityAttachment', () => {
  it('uploads with SDK using a named File', async () => {
    await uploadEntityAttachment(
      'token-a',
      'entity-1',
      'record-1',
      'File',
      createMulterFile(),
      'CM_Credit_CaseDocuments',
    );

    expect(state.sdkCalls.length).toBe(1);
    expect(state.sdkCalls[0].file).toBeInstanceOf(File);
    expect(state.sdkCalls[0].file.name).toBe('proof.pdf');
    expect(state.rawCalls.length).toBe(0);
  });

  it('falls back to raw upload with explicit filename when SDK upload fails', async () => {
    state.sdkShouldFail = true;

    await uploadEntityAttachment(
      'token-b',
      'entity-2',
      'record-2',
      'File',
      createMulterFile(),
      'CM_Credit_CaseDocuments',
    );

    expect(state.sdkCalls.length).toBe(1);
    expect(state.rawCalls.length).toBe(1);
    expect(state.rawCalls[0].method).toBe('POST');
    expect(state.rawCalls[0].path).toContain('datafabric_/api/Attachment/CM_Credit_CaseDocuments/record-2/File');
    expect(state.rawCalls[0].filePart?.name).toBe('proof.pdf');
  });

  it('throws a clear error when fallback is needed but entity name is missing', async () => {
    state.sdkShouldFail = true;

    await expect(
      uploadEntityAttachment(
        'token-c',
        'entity-3',
        'record-3',
        'File',
        createMulterFile(),
        '',
      )
    ).rejects.toThrow('nom d\'entite manquant');

    expect(state.rawCalls.length).toBe(0);
  });

  it('uses raw upload path when File is unavailable in runtime', async () => {
    const originalFile = (globalThis as any).File;
    Object.defineProperty(globalThis, 'File', { value: undefined, configurable: true, writable: true });

    try {
      await uploadEntityAttachment(
        'token-d',
        'entity-4',
        'record-4',
        'File',
        createMulterFile(),
        'CM_Credit_CaseDocuments',
      );
    } finally {
      Object.defineProperty(globalThis, 'File', { value: originalFile, configurable: true, writable: true });
    }

    expect(state.sdkCalls.length).toBe(0);
    expect(state.rawCalls.length).toBe(1);
    expect(state.rawCalls[0].filePart?.name).toBe('proof.pdf');
  });
});
