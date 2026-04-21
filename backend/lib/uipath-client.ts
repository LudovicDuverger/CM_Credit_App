import type { Request } from 'express';
import { hasClientCredentials, uiPathConfig } from '../config/uipath.ts';

type TokenCache = {
  accessToken: string | null;
  expiresAt: number;
};

type UiPathRequestOptions = {
  method?: string;
  query?: Record<string, unknown>;
  headers?: Record<string, string>;
  body?: BodyInit | null;
};

type UiPathRequestResponse = {
  ok: boolean;
  status: number;
  text: string;
  json: any;
};

let tokenCache: TokenCache = {
  accessToken: null,
  expiresAt: 0,
};

export const getBearerTokenFromRequest = (req: Request): string => {
  const header = String(req.headers.authorization || '');
  if (!header.toLowerCase().startsWith('bearer ')) return '';
  return header.slice(7).trim();
};

export const getAccessTokenByClientCredentials = async (): Promise<string> => {
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
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token UiPath refuse (${response.status}): ${text}`);
  }

  const data = await response.json();
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: now + (Number(data.expires_in || 3600) * 1000),
  };

  return tokenCache.accessToken || '';
};

export const resolveAuthToken = async (req: Request): Promise<string> => {
  const bearerToken = getBearerTokenFromRequest(req);
  if (bearerToken) return bearerToken;
  return getAccessTokenByClientCredentials();
};

export const buildUiPathUrl = (requestPath: string, query: Record<string, unknown> = {}): string => {
  const normalizedPath = requestPath.startsWith('/') ? requestPath.slice(1) : requestPath;
  const url = new URL(`${uiPathConfig.baseUrl}/${uiPathConfig.orgName}/${uiPathConfig.tenantName}/${normalizedPath}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
};

export const withDataFabricFolderContext = (
  requestPath: string,
  query: Record<string, unknown> = {},
): Record<string, unknown> => {
  const normalizedPath = requestPath.startsWith('/') ? requestPath.slice(1) : requestPath;
  if (!normalizedPath.startsWith('datafabric_/api/')) return query;
  if (!uiPathConfig.folderKey) return query;
  if (query.folderKey !== undefined && query.folderKey !== null && query.folderKey !== '') return query;
  return { ...query, folderKey: uiPathConfig.folderKey };
};

export const parseUiPathJsonResponse = async (
  response: Response,
  requestPath: string,
  contextLabel = '',
): Promise<any> => {
  const statusLabel = contextLabel ? ` (${contextLabel})` : '';
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`UiPath API erreur (${response.status}) sur ${requestPath}${statusLabel}: ${bodyText}`);
  }

  if (!bodyText) return {};

  const seemsHtml = bodyText.trim().startsWith('<!DOCTYPE') || bodyText.trim().startsWith('<html');
  try {
    return JSON.parse(bodyText);
  } catch {
    const preview = bodyText.slice(0, 300);
    const hint = seemsHtml
      ? 'Reponse HTML recue (token/scope invalide ou endpoint non-JSON).'
      : 'Reponse non JSON recue.';
    throw new Error(
      `UiPath API reponse invalide sur ${requestPath}${statusLabel}: ${hint} content-type=${contentType || 'unknown'} body=${preview}`,
    );
  }
};

export const uiPathJsonRequest = async (
  token: string,
  requestPath: string,
  query: Record<string, unknown> = {},
): Promise<any> => {
  const response = await fetch(buildUiPathUrl(requestPath, withDataFabricFolderContext(requestPath, query)), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return parseUiPathJsonResponse(response, requestPath);
};

export const uiPathJsonRequestWithoutFolderContext = async (
  token: string,
  requestPath: string,
  query: Record<string, unknown> = {},
): Promise<any> => {
  const response = await fetch(buildUiPathUrl(requestPath, query), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  return parseUiPathJsonResponse(response, requestPath, 'no-folder');
};

export const buildUiPathHeaders = (
  token: string,
  extraHeaders: Record<string, string> = {},
): Record<string, string> => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
  ...extraHeaders,
});

export const toTimestamp = (value: string): number => {
  if (!value) return 0;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

export const uiPathJsonRequestWithHeaders = async (
  token: string,
  requestPath: string,
  query: Record<string, unknown> = {},
  extraHeaders: Record<string, string> = {},
): Promise<any> => {
  const response = await fetch(buildUiPathUrl(requestPath, query), {
    headers: buildUiPathHeaders(token, extraHeaders),
  });
  return parseUiPathJsonResponse(response, requestPath);
};

export const uiPathRequest = async (
  token: string,
  requestPath: string,
  options: UiPathRequestOptions = {},
): Promise<UiPathRequestResponse> => {
  const { method = 'GET', query = {}, headers = {}, body } = options;

  const response = await fetch(buildUiPathUrl(requestPath, withDataFabricFolderContext(requestPath, query)), {
    method,
    headers: { Authorization: `Bearer ${token}`, ...headers },
    body,
  });

  const text = await response.text();
  const contentType = response.headers.get('content-type') || '';
  let json: any = null;
  if (contentType.includes('application/json') && text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { ok: response.ok, status: response.status, text, json };
};

