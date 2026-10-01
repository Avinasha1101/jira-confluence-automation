import type {
  ApiError,
  DemoScenario,
  GenerateRequest,
  LlmPayloadResponse,
  MockPage,
  PublishResponse,
  RegenerateRequest,
  ReportRecord,
  ReportSummary,
  Settings,
  SettingsResponse,
  TestConnectionResult,
  UpdateReportRequest,
} from './apiTypes';

export interface Health {
  ok: boolean;
  mode: 'demo' | 'live';
}

export class ApiRequestError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.details = details;
  }
}

async function raise(res: Response): Promise<never> {
  let message = `Request failed (${res.status})`;
  let details: unknown;
  try {
    const body = (await res.json()) as Partial<ApiError>;
    if (body.error) message = body.error;
    details = body.details;
  } catch {
    if (res.status === 502 || res.status === 504 || res.status === 500) {
      message = 'The server is not reachable. Check that the backend is running on port 3001.';
    }
  }
  throw new ApiRequestError(message, res.status, details);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    });
  } catch {
    throw new ApiRequestError('Network error: could not reach the server.', 0);
  }
  if (!res.ok) return raise(res);
  return (await res.json()) as T;
}

const send = (method: string, body?: unknown): RequestInit => ({
  method,
  body: body === undefined ? undefined : JSON.stringify(body),
});

export const api = {
  health: () => request<Health>('/api/health'),
  getSettings: () => request<SettingsResponse>('/api/settings'),
  saveSettings: (s: Settings) => request<SettingsResponse>('/api/settings', send('PUT', s)),
  testConnection: (target: 'jira' | 'confluence' | 'llm') =>
    request<TestConnectionResult>('/api/settings/test', send('POST', { target })),
  scenarios: () => request<DemoScenario[]>('/api/demo/scenarios'),
  generate: (body: GenerateRequest) => request<ReportRecord>('/api/reports/generate', send('POST', body)),
  listReports: () => request<ReportSummary[]>('/api/reports'),
  getReport: (id: number) => request<ReportRecord>(`/api/reports/${id}`),
  updateReport: (id: number, body: UpdateReportRequest) =>
    request<ReportRecord>(`/api/reports/${id}`, send('PUT', body)),
  regenerate: (id: number, body: RegenerateRequest) =>
    request<ReportRecord>(`/api/reports/${id}/regenerate`, send('POST', body)),
  llmPayload: (id: number) => request<LlmPayloadResponse>(`/api/reports/${id}/llm-payload`),
  publish: (id: number) => request<PublishResponse>(`/api/reports/${id}/publish`, send('POST', {})),
  mockPages: () => request<MockPage[]>('/api/mock-confluence/pages'),
};

export const previewUrl = (id: number): string => `/api/reports/${id}/preview`;
export const mockPageUrl = (id: string): string => `/api/mock-confluence/pages/${encodeURIComponent(id)}`;
