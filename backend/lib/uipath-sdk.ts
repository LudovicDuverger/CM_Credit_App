import { UiPath } from '@uipath/uipath-typescript/core';
import { Cases, CaseInstances } from '@uipath/uipath-typescript/cases';
import { Entities } from '@uipath/uipath-typescript/entities';
import { Tasks } from '@uipath/uipath-typescript/tasks';
import { uiPathConfig } from '../config/uipath.ts';

export interface UiPathSdkContext {
  token: string;
  sdk: UiPath;
  tasks: Tasks;
  entities: Entities;
  cases: Cases;
  caseInstances: CaseInstances;
}

export const createUiPathSdkContext = (token: string): UiPathSdkContext => {
  const sdk = new UiPath({
    baseUrl: uiPathConfig.baseUrl,
    orgName: uiPathConfig.orgName,
    tenantName: uiPathConfig.tenantName,
    secret: token,
  });

  return {
    token,
    sdk,
    tasks: new Tasks(sdk),
    entities: new Entities(sdk),
    cases: new Cases(sdk),
    caseInstances: new CaseInstances(sdk),
  };
};

export const resolveFolderIdFromTask = (task: Record<string, unknown> | null | undefined): number | undefined => {
  const candidates = [
    task?.folderId,
    task?.FolderId,
    task?.organizationUnitId,
    task?.OrganizationUnitId,
    uiPathConfig.folderId,
  ];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return undefined;
};

