import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, mockPageUrl } from '../api';
import type { MockPage } from '../apiTypes';
import { errMsg, fmtDateTime } from '../format';
import { Banner, EmptyState, PageSkeleton } from '../components/ui';
import { Icon } from '../components/Icon';

export default function MockConfluencePage() {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const [pages, setPages] = useState<MockPage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .mockPages()
      .then(setPages)
      .catch((e: unknown) => setError(errMsg(e)));
  }, [pageId]);

  const selected = pages?.find((p) => p.id === pageId);

  return (
    <div className="stack">
      <div className="page-head">
        <h1>Mock Confluence</h1>
        <p className="lede">
          A stand-in for the Confluence space used in demo mode. This is what stakeholders see after a report is published.
        </p>
      </div>
      {error && <Banner kind="error">{error}</Banner>}
      {!pages && !error && <PageSkeleton />}
      {pages && pages.length === 0 && (
        <div className="card">
          <EmptyState title="Nothing published yet">
            <Link to="/">Generate and publish a report</Link> to see pages here.
          </EmptyState>
        </div>
      )}
      {pages && pages.length > 0 && (
        <div className="confluence">
          <aside className="confluence-nav card flush" aria-label="Pages">
            <div className="confluence-space">
              <span className="space-icon">WS</span>
              <div>
                <strong>Weekly Status</strong>
                <div className="muted small">Demo space</div>
              </div>
            </div>
            <ul className="page-list">
              {pages.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className={`page-item${p.id === pageId ? ' active' : ''}`}
                    onClick={() => navigate(`/mock-confluence/${p.id}`)}
                    aria-current={p.id === pageId ? 'page' : undefined}
                  >
                    <span className="page-title">{p.title}</span>
                    <span className="page-meta">
                      <span className={`chip ${p.kind === 'latest' ? 'chip-accent' : ''}`}>
                        {p.kind === 'latest' ? 'Latest' : 'Dated'}
                      </span>
                      <span>v{p.version}</span>
                      <span>{fmtDateTime(p.updatedAt)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className="confluence-view" aria-label="Page viewer">
            {!pageId && (
              <div className="card">
                <EmptyState title="Select a page">Choose a page from the list to view it as published.</EmptyState>
              </div>
            )}
            {pageId && (
              <div className="frame">
                <div className="frame-bar">
                  <div>
                    <div className="breadcrumb">Weekly Status / {selected?.kind === 'latest' ? 'Latest' : 'Reports'}</div>
                    <strong>{selected?.title ?? `Page ${pageId}`}</strong>
                  </div>
                  <a className="btn btn-sm" href={mockPageUrl(pageId)} target="_blank" rel="noreferrer">
                    Open in new tab <Icon name="external" size={12} />
                  </a>
                </div>
                <iframe key={`${pageId}-${selected?.version ?? 0}`} title="Published page" src={mockPageUrl(pageId)} className="frame-iframe" />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
