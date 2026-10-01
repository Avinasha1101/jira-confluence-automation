import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import type { ReportSummary } from '../apiTypes';
import { errMsg, fmtDate } from '../format';
import { Banner, EmptyState, PageSkeleton, RagPill, StatusPill } from '../components/ui';
import { Icon } from '../components/Icon';
import { useHealth } from '../health';

function pageIdFromUrl(url: string): string {
  const parts = url.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? url;
}

export default function HistoryPage() {
  const health = useHealth();
  const [rows, setRows] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listReports()
      .then(setRows)
      .catch((e: unknown) => setError(errMsg(e)));
  }, []);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Report history</h1>
        <p className="lede">Every generated report, newest first.</p>
      </div>
      {error && <Banner kind="error">{error}</Banner>}
      {!rows && !error && <PageSkeleton />}
      {rows && rows.length === 0 && (
        <div className="card">
          <EmptyState title="No reports yet">
            <Link to="/">Generate your first report</Link>
          </EmptyState>
        </div>
      )}
      {rows && rows.length > 0 && (
        <div className="card flush">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">Report date</th>
                <th scope="col">Sprint</th>
                <th scope="col">RAG</th>
                <th scope="col">Status</th>
                <th scope="col">Source</th>
                <th scope="col">Published pages</th>
                <th scope="col">
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtDate(r.reportDate)}</td>
                  <td>
                    <Link to={`/reports/${r.id}`} className="strong">
                      {r.sprintName}
                    </Link>
                  </td>
                  <td>
                    <RagPill rag={r.rag} />
                  </td>
                  <td>
                    <StatusPill status={r.status} />
                  </td>
                  <td>{r.demo ? <span className="chip chip-demo">Demo</span> : <span className="chip">Live</span>}</td>
                  <td>
                    {r.publishedUrls.length === 0 && <span className="muted">-</span>}
                    {r.publishedUrls.map((u, i) =>
                      r.demo || health?.mode === 'demo' ? (
                        <Link key={u} to={`/mock-confluence/${pageIdFromUrl(u)}`} className="inline-link">
                          Page {i + 1}
                        </Link>
                      ) : (
                        <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-link">
                          Page {i + 1} <Icon name="external" size={12} />
                        </a>
                      ),
                    )}
                  </td>
                  <td className="right">
                    <Link to={`/reports/${r.id}`} className="btn btn-sm">
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
