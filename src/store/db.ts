import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { MockPage, ReportRecord, ReportSummary } from '../domain/apiTypes';

interface PageRow {
  id: string;
  title: string;
  kind: 'dated' | 'latest';
  body: string;
  version: number;
  updated_at: string;
}

export class Store {
  private readonly db: DatabaseSync;

  constructor(dataDir: string | ':memory:') {
    if (dataDir !== ':memory:') fs.mkdirSync(dataDir, { recursive: true });
    this.db = new DatabaseSync(dataDir === ':memory:' ? ':memory:' : path.join(dataDir, 'reports.db'));
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        record_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS mock_pages (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        kind TEXT NOT NULL,
        body TEXT NOT NULL,
        version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  insertReport(record: Omit<ReportRecord, 'id'>): ReportRecord {
    const res = this.db
      .prepare('INSERT INTO reports (record_json) VALUES (?)')
      .run(JSON.stringify(record));
    const saved = { ...record, id: Number(res.lastInsertRowid) };
    this.saveReport(saved);
    return saved;
  }

  saveReport(record: ReportRecord): void {
    this.db
      .prepare('UPDATE reports SET record_json = ? WHERE id = ?')
      .run(JSON.stringify(record), record.id);
  }

  getReport(id: number): ReportRecord | null {
    const row = this.db.prepare('SELECT record_json FROM reports WHERE id = ?').get(id) as
      | { record_json: string }
      | undefined;
    return row ? (JSON.parse(row.record_json) as ReportRecord) : null;
  }

  listReports(): ReportSummary[] {
    const rows = this.db.prepare('SELECT record_json FROM reports ORDER BY id DESC').all() as {
      record_json: string;
    }[];
    return rows.map((r) => {
      const rec = JSON.parse(r.record_json) as ReportRecord;
      return {
        id: rec.id,
        sprintName: rec.content.header.sprintName,
        reportDate: rec.content.header.reportDate,
        rag: rec.content.rag.final,
        status: rec.status,
        demo: rec.demo,
        publishedUrls: rec.publishes.filter((p) => p.ok && p.url).map((p) => p.url as string),
      };
    });
  }

  upsertMockPage(page: { id: string; title: string; kind: 'dated' | 'latest'; body: string }): MockPage {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT version FROM mock_pages WHERE id = ?').get(page.id) as
      | { version: number }
      | undefined;
    const version = (existing?.version ?? 0) + 1;
    this.db
      .prepare(
        `INSERT INTO mock_pages (id, title, kind, body, version, updated_at) VALUES (?,?,?,?,?,?)
         ON CONFLICT(id) DO UPDATE SET title=excluded.title, body=excluded.body, version=excluded.version, updated_at=excluded.updated_at`,
      )
      .run(page.id, page.title, page.kind, page.body, version, now);
    return { id: page.id, title: page.title, kind: page.kind, version, updatedAt: now };
  }

  listMockPages(): MockPage[] {
    const rows = this.db
      .prepare('SELECT id, title, kind, version, updated_at FROM mock_pages ORDER BY updated_at DESC')
      .all() as unknown as PageRow[];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      kind: r.kind,
      version: r.version,
      updatedAt: r.updated_at,
    }));
  }

  getMockPage(id: string): PageRow | null {
    return (this.db.prepare('SELECT * FROM mock_pages WHERE id = ?').get(id) as PageRow | undefined) ?? null;
  }

  findMockPageByTitle(title: string): PageRow | null {
    return (
      (this.db.prepare('SELECT * FROM mock_pages WHERE title = ?').get(title) as PageRow | undefined) ?? null
    );
  }

  close(): void {
    this.db.close();
  }
}
