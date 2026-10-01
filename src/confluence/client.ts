import { Settings } from '../domain/apiTypes';
import { Store } from '../store/db';
import { basicAuth, requestJson, RequestOptions } from '../util/http';

export interface PageRef {
  id: string;
  url: string;
}

export interface ConfluenceTarget {
  findChildByTitle(title: string): Promise<PageRef | null>;
  createChild(title: string, body: string): Promise<PageRef>;
  updateLatest(title: string, body: string): Promise<PageRef>;
  updatePage(id: string, title: string, body: string): Promise<PageRef>;
}

export class MockConfluence implements ConfluenceTarget {
  constructor(private readonly store: Store) {}

  private ref(id: string): PageRef {
    return { id, url: `/mock-confluence/${id}` };
  }

  async findChildByTitle(title: string): Promise<PageRef | null> {
    const page = this.store.findMockPageByTitle(title);
    return page && page.kind === 'dated' ? this.ref(page.id) : null;
  }

  async createChild(title: string, body: string): Promise<PageRef> {
    const id = `page-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    this.store.upsertMockPage({ id, title, kind: 'dated', body });
    return this.ref(id);
  }

  async updatePage(id: string, title: string, body: string): Promise<PageRef> {
    const existing = this.store.getMockPage(id);
    this.store.upsertMockPage({ id, title, kind: existing?.kind ?? 'dated', body });
    return this.ref(id);
  }

  async updateLatest(title: string, body: string): Promise<PageRef> {
    this.store.upsertMockPage({ id: 'latest', title, kind: 'latest', body });
    return this.ref('latest');
  }
}

interface ContentResponse {
  id: string;
  version?: { number: number };
  _links?: { webui?: string; base?: string };
}

export class HttpConfluenceClient implements ConfluenceTarget {
  private readonly base: string;
  private readonly auth: string;
  private readonly cfg: Settings['confluence'];

  constructor(
    settings: Settings,
    token: string,
    jiraEmail: string,
    private readonly opts: RequestOptions = {},
  ) {
    this.cfg = settings.confluence;
    this.base = this.cfg.baseUrl.replace(/\/+$/, '');
    this.auth = basicAuth(jiraEmail, token);
  }

  private call<T>(path: string, init: RequestInit = {}): Promise<T> {
    return requestJson<T>(
      'Confluence',
      `${this.base}${path}`,
      {
        ...init,
        headers: {
          Authorization: this.auth,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
      this.opts,
    );
  }

  private toRef(res: ContentResponse): PageRef {
    const link = res._links?.webui ?? `/pages/viewpage.action?pageId=${res.id}`;
    return { id: res.id, url: `${this.base}${link.startsWith('/wiki') ? '' : '/wiki'}${link}` };
  }

  async testConnection(): Promise<string> {
    const space = await this.call<{ name: string }>(
      `/wiki/rest/api/space/${encodeURIComponent(this.cfg.spaceKey)}`,
    );
    return `Connected to Confluence space "${space.name}".`;
  }

  async findChildByTitle(title: string): Promise<PageRef | null> {
    const res = await this.call<{ results: ContentResponse[] }>(
      `/wiki/rest/api/content/${this.cfg.parentPageId}/child/page?limit=100&expand=version`,
    );
    const titled = await this.call<{ results: (ContentResponse & { title: string })[] }>(
      `/wiki/rest/api/content?spaceKey=${encodeURIComponent(this.cfg.spaceKey)}&title=${encodeURIComponent(title)}`,
    );
    const match = titled.results.find((r) => res.results.some((c) => c.id === r.id));
    return match ? this.toRef(match) : null;
  }

  async createChild(title: string, body: string): Promise<PageRef> {
    const res = await this.call<ContentResponse>('/wiki/rest/api/content', {
      method: 'POST',
      body: JSON.stringify({
        type: 'page',
        title,
        space: { key: this.cfg.spaceKey },
        ancestors: [{ id: this.cfg.parentPageId }],
        body: { storage: { value: body, representation: 'storage' } },
      }),
    });
    return this.toRef(res);
  }

  async updatePage(id: string, title: string, body: string): Promise<PageRef> {
    const current = await this.call<ContentResponse>(`/wiki/rest/api/content/${id}?expand=version`);
    const res = await this.call<ContentResponse>(`/wiki/rest/api/content/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        id,
        type: 'page',
        title,
        version: { number: (current.version?.number ?? 0) + 1 },
        body: { storage: { value: body, representation: 'storage' } },
      }),
    });
    return this.toRef(res);
  }

  updateLatest(title: string, body: string): Promise<PageRef> {
    return this.updatePage(this.cfg.latestPageId, title, body);
  }
}
