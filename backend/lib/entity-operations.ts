import { uiPathConfig } from '../config/uipath.ts';
import { createUiPathSdkContext } from './uipath-sdk.ts';
import { uiPathJsonRequest, uiPathJsonRequestWithoutFolderContext, uiPathRequest } from './uipath-client.ts';
import {
  normalizeToken,
  normalizeField,
  getStringField,
  scanObjectForTokens,
  extractItems,
  getFirstObjectFromResponse,
  getEntityRecordId,
} from './data-mappers.ts';

export const readEntityRecordsWithFallback = async (token, entityId, readQuery) => {
  try {
    const sdk = createUiPathSdkContext(token);
    const response = await sdk.entities.getAllRecords(entityId, {
      expansionLevel: Number(readQuery?.expansionLevel || 0) || undefined,
      pageSize: Number(readQuery?.limit || 0) || undefined,
    });
    const items = Array.isArray(response?.items) ? response.items : [];
    if (items.length > 0) return items;
  } catch (_error) {
    // Fall back to raw calls for tenant-specific edge behavior.
  }

  try {
    const scopedResponse = await uiPathJsonRequest(token, `datafabric_/api/EntityService/entity/${entityId}/read`, readQuery);
    const scopedItems = extractItems(scopedResponse);
    if (scopedItems.length > 0) return scopedItems;
  } catch (_error) {
    // fall through to unscoped
  }

  const unscopedResponse = await uiPathJsonRequestWithoutFolderContext(token, `datafabric_/api/EntityService/entity/${entityId}/read`, readQuery);
  return extractItems(unscopedResponse);
};

export const createEntityRecord = async (token, entityId, payload) => {
  try {
    const sdk = createUiPathSdkContext(token);
    const inserted = await sdk.entities.insertRecordById(entityId, payload);
    const insertedId = getEntityRecordId(inserted || {}) || getStringField(inserted || {}, ['Id', 'id', 'ID']);
    return { record: inserted, recordId: insertedId };
  } catch (_error) {
    // Fall back to raw request matrix.
  }

  const candidateCalls = [
    { path: `datafabric_/api/EntityService/entity/${entityId}/insert`, body: payload },
    { path: `datafabric_/api/EntityService/entity/${entityId}/insert`, body: { item: payload } },
    { path: `datafabric_/api/EntityService/entity/${entityId}/insert`, body: { items: [payload] } },
    { path: `datafabric_/api/EntityService/entity/${entityId}/create`, body: { items: [payload] } },
    { path: `datafabric_/api/EntityService/entity/${entityId}/create`, body: payload },
    { path: `datafabric_/api/EntityService/entity/${entityId}/upsert`, body: { items: [payload] } },
    { path: `datafabric_/api/EntityService/entity/${entityId}/upsert`, body: payload },
  ];

  const errors = [];
  for (const candidate of candidateCalls) {
    const response = await uiPathRequest(token, candidate.path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate.body),
    });

    if (response.ok) {
      const createdRecord = getFirstObjectFromResponse(response.json || {});
      const createdRecordId = getEntityRecordId(createdRecord || {});
      if (createdRecordId) return { record: createdRecord, recordId: createdRecordId };
      if (createdRecord && typeof createdRecord === 'object') {
        return { record: createdRecord, recordId: getStringField(createdRecord, ['Id', 'id', 'ID']) };
      }
      return { record: createdRecord, recordId: '' };
    }

    errors.push(`${candidate.path} -> ${response.status}: ${response.text}`);
  }

  throw new Error(`Impossible de creer un enregistrement DataFabric pour l'entite ${entityId}. Details: ${errors.join(' | ')}`);
};

export const insertThenUpdateCaseId = async (token, entityId, payload, caseIdValue) => {
  const caseIdPayload = {
    CaseID: caseIdValue, caseID: caseIdValue, caseId: caseIdValue,
    oCaseID: caseIdValue, ReferenceID: caseIdValue, BusinessKey: caseIdValue,
  };
  const incomingChannelPayload = {
    IncomingChannel: 'WEB', incomingChannel: 'WEB', Incoming_Channel: 'WEB',
    Channel: 'WEB', SourceChannel: 'WEB',
  };
  const insertPayload = { ...(payload || {}), ...caseIdPayload, ...incomingChannelPayload };

  const created = await createEntityRecord(token, entityId, insertPayload);
  const insertedRecordId = String(created?.recordId || '').trim();
  if (!insertedRecordId) {
    throw new Error(`Insert record echoue (recordId introuvable) pour l'entite ${entityId}.`);
  }

  try {
    const sdk = createUiPathSdkContext(token);
    await sdk.entities.updateRecordById(entityId, insertedRecordId, insertPayload);
    return { record: created.record, recordId: insertedRecordId, updatePath: 'sdk.entities.updateRecordById', updateWarning: '' };
  } catch (updateError) {
    return {
      record: created.record,
      recordId: insertedRecordId,
      updatePath: '',
      updateWarning: `Update post-insert indisponible dans ce tenant. Details: ${updateError.message}`,
    };
  }
};

export const updateDocumentFieldsByRecordId = async (token, entityId, recordId, payload) => {
  try {
    const sdk = createUiPathSdkContext(token);
    await sdk.entities.updateRecordById(entityId, recordId, payload || {});
    return;
  } catch (_error) {
    // Fall back to legacy request matrix.
  }

  const candidates = [
    { path: `datafabric_/api/EntityService/entity/${entityId}/upsertRecordsById`, body: { items: [{ Id: recordId, ...(payload || {}) }] }, method: 'POST' },
    { path: `datafabric_/api/EntityService/entity/${entityId}/upsertRecordsById`, body: { items: [{ id: recordId, ...(payload || {}) }] }, method: 'POST' },
    { path: `datafabric_/api/EntityService/entity/${entityId}/upsert`, body: { items: [{ Id: recordId, ...(payload || {}) }] }, method: 'POST' },
    { path: `datafabric_/api/EntityService/entity/${entityId}/upsert`, body: { Id: recordId, ...(payload || {}) }, method: 'POST' },
    { path: `datafabric_/api/EntityService/entity/${entityId}/record/${recordId}`, body: payload || {}, method: 'PATCH' },
  ];

  const errors = [];
  for (const candidate of candidates) {
    const response = await uiPathRequest(token, candidate.path, {
      method: candidate.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(candidate.body),
    });
    if (response.ok) return;
    errors.push(`${candidate.path} -> ${response.status}: ${response.text}`);
  }

  throw new Error(`Impossible de mettre a jour les champs document pour ${recordId}. Details: ${errors.join(' | ')}`);
};

export const uploadEntityAttachment = async (token, entityId, recordId, fieldName, file, entityName = '') => {
  const fileName = String(file?.originalname || 'document.bin').trim() || 'document.bin';
  const mimeType = String(file?.mimetype || 'application/octet-stream').trim() || 'application/octet-stream';
  const fileBytes = file?.buffer instanceof Uint8Array ? file.buffer : new Uint8Array(file?.buffer || []);
  const blob = new Blob([fileBytes], { type: mimeType });
  const canUseNamedFile = typeof File !== 'undefined';

  if (canUseNamedFile) {
    try {
      const sdk = createUiPathSdkContext(token);
      const namedFile = new File([fileBytes], fileName, { type: mimeType });
      await sdk.entities.uploadAttachment(entityId, recordId, fieldName, namedFile);
      return;
    } catch (_error) {
      // Fall back to raw endpoint variation.
    }
  }

  if (!entityName) {
    throw new Error(`Impossible d'uploader la piece jointe: nom d'entite manquant pour le fallback raw.`);
  }

  const originalFileConstructor = (globalThis as any).File;
  const shouldInstallFilePolyfill = typeof File === 'undefined';
  if (shouldInstallFilePolyfill) {
    (globalThis as any).File = class FilePolyfill extends Blob {
      name: string;
      lastModified: number;

      constructor(fileBits: BlobPart[], fileNameValue: string, options: FilePropertyBag = {}) {
        super(fileBits, options);
        this.name = String(fileNameValue || 'document.bin');
        this.lastModified = Number(options.lastModified || Date.now());
      }
    };
  }

  const formData = new FormData();
  try {
    formData.append('file', blob, fileName);
  } finally {
    if (shouldInstallFilePolyfill) {
      (globalThis as any).File = originalFileConstructor;
    }
  }

  const errors = [];
  for (const method of ['POST', 'PUT']) {
    const response = await uiPathRequest(token, `datafabric_/api/Attachment/${entityName}/${recordId}/${fieldName}`, { method, body: formData });
    if (response.ok) return;
    errors.push(`${method} -> ${response.status}: ${response.text}`);
  }

  throw new Error(`Impossible d'uploader la piece jointe sur ${entityName}/${recordId}/${fieldName}. ${errors.join(' | ')}`);
};

export const deleteEntityRecordById = async (token, entityId, recordId) => {
  try {
    const sdk = createUiPathSdkContext(token);
    const response = await sdk.entities.deleteRecordsById(entityId, [recordId]);
    if (!Array.isArray(response?.failureRecords) || response.failureRecords.length === 0) {
      return;
    }
  } catch (_error) {
    // Fall back to raw endpoint matrix.
  }

  const candidates = [
    { path: `datafabric_/api/EntityService/entity/${entityId}/record/${recordId}`, method: 'DELETE' },
    { path: `datafabric_/api/EntityService/entity/${entityId}/delete`, method: 'POST', body: [recordId] },
    { path: `datafabric_/api/EntityService/entity/${entityId}/deleteRecordsById`, method: 'POST', body: { ids: [recordId] } },
    { path: `datafabric_/api/EntityService/entity/${entityId}/deleteRecordsById`, method: 'POST', body: { items: [{ Id: recordId }] } },
    { path: `datafabric_/api/EntityService/entity/${entityId}/deleteRecordsById`, method: 'POST', body: { items: [{ id: recordId }] } },
    { path: `datafabric_/api/EntityService/entity/${entityId}/delete`, method: 'POST', body: { ids: [recordId] } },
    { path: `datafabric_/api/EntityService/entity/${entityId}/delete`, method: 'POST', body: { items: [recordId] } },
  ];

  const errors = [];
  for (const candidate of candidates) {
    const response = await uiPathRequest(token, candidate.path, {
      method: candidate.method,
      headers: candidate.body ? { 'Content-Type': 'application/json' } : {},
      body: candidate.body ? JSON.stringify(candidate.body) : undefined,
    });
    if (response.ok) return;
    errors.push(`${candidate.path} -> ${response.status}: ${response.text}`);
  }

  throw new Error(`Impossible de supprimer l'enregistrement ${recordId} de l'entite ${entityId}. Details: ${errors.join(' | ')}`);
};

export const getEntitySampleRecord = async (token, entityId) => {
  try {
    const sdk = createUiPathSdkContext(token);
    const response = await sdk.entities.getAllRecords(entityId, { pageSize: 1, expansionLevel: 2 });
    return response?.items?.[0] && typeof response.items[0] === 'object' ? response.items[0] : {};
  } catch (_error) {
    // Fall back to raw endpoint.
  }

  const response = await uiPathJsonRequest(token, `datafabric_/api/EntityService/entity/${entityId}/read`, {
    limit: 1, start: 0, expansionLevel: 2,
  });
  const items = extractItems(response);
  return items[0] && typeof items[0] === 'object' ? items[0] : {};
};

export const mapValuesToEntityColumns = (sourceValues, sampleRecord) => {
  const sampleKeys = Object.keys(sampleRecord || {}).filter((key) => !['id', 'Id', 'ID', '_id'].includes(key));
  const normalizedKeyMap = new Map(sampleKeys.map((key) => [normalizeField(key), key]));
  const forcedEntityKeys = { incomingChannel: 'IncomingChannel' };

  const resolveEntityKey = (aliases = [], allowFuzzy = true) => {
    const normalizedAliases = aliases.map(normalizeField).filter(Boolean);
    for (const alias of normalizedAliases) {
      if (normalizedKeyMap.has(alias)) return normalizedKeyMap.get(alias);
    }
    if (!allowFuzzy) return '';
    for (const alias of normalizedAliases) {
      const fuzzyMatch = sampleKeys.find((key) => normalizeField(key).includes(alias));
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

export const mapDocumentValuesToEntityColumns = (sourceValues, sampleRecord) => {
  const sampleKeys = Object.keys(sampleRecord || {}).filter((key) => !['id', 'Id', 'ID', '_id'].includes(key));
  const normalizedKeyMap = new Map(sampleKeys.map((key) => [normalizeField(key), key]));
  const fallbackKeys = { caseId: 'OCaseID', fileName: 'FileName', fileType: 'FileType' };

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
    { valueKey: 'caseId', aliases: ['OCaseID', 'OCaseId', 'oCaseID', 'oCaseId', 'CaseID'] },
    { valueKey: 'fileName', aliases: ['FileName', 'Filename', 'filename', 'Name'] },
    { valueKey: 'fileType', aliases: ['FileType', 'fileType'] },
  ];

  for (const def of fieldDefs) {
    const value = sourceValues[def.valueKey];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '' && def.valueKey !== 'fileType') continue;
    const entityKey = resolveEntityKey(def.aliases) || fallbackKeys[def.valueKey];
    mapped[entityKey] = value;
  }

  return mapped;
};

export const matchesTargetCaseModel = (instance) => {
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

export const matchesTargetProcessKey = (instance) => {
  const targetProcessKey = normalizeToken(uiPathConfig.targetProcessKey);
  if (!targetProcessKey) return true;
  const candidates = [
    getStringField(instance, ['processKey', 'processDefinitionKey', 'caseType', 'packageKey']),
    getStringField(instance?.caseAppConfig || {}, ['key', 'Key']),
  ].map(normalizeToken).filter(Boolean);
  if (candidates.includes(targetProcessKey)) return true;
  return scanObjectForTokens(instance, [targetProcessKey]);
};

export const matchesTargetFolder = (instance) => {
  const targetFolderKey = normalizeToken(uiPathConfig.folderKey);
  if (!targetFolderKey) return true;
  const candidates = [
    getStringField(instance, ['folderKey', 'folderId', 'organizationUnitId']),
    getStringField(instance?.folder || {}, ['key', 'id']),
  ].map(normalizeToken).filter(Boolean);
  if (candidates.includes(targetFolderKey)) return true;
  return scanObjectForTokens(instance, [targetFolderKey]);
};
