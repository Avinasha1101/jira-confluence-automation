import type { ReactNode } from 'react';
import type { Rag } from '../apiTypes';
import { Icon } from './Icon';

export function Spinner({ label }: { label?: string }) {
  return (
    <span className="spinner-wrap" role="status">
      <span className="spinner" aria-hidden="true" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function RagPill({ rag, large }: { rag: Rag; large?: boolean }) {
  return <span className={`rag rag-${rag.toLowerCase()}${large ? ' rag-lg' : ''}`}>{rag}</span>;
}

export function Banner({
  kind,
  title,
  children,
}: {
  kind: 'info' | 'warn' | 'error' | 'success';
  title?: string;
  children?: ReactNode;
}) {
  const icon = kind === 'success' ? 'check' : kind === 'info' ? 'info' : 'alert';
  return (
    <div className={`banner banner-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <span className="banner-icon">
        <Icon name={icon} size={18} />
      </span>
      <div className="banner-body">
        {title && <strong>{title}</strong>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ height = 16, width = '100%' }: { height?: number; width?: string | number }) {
  return <div className="skeleton" style={{ height, width }} aria-hidden="true" />;
}

export function PageSkeleton() {
  return (
    <div className="card" aria-busy="true">
      <Skeleton height={28} width="40%" />
      <div className="gap" />
      <Skeleton />
      <div className="gap-sm" />
      <Skeleton width="85%" />
      <div className="gap-sm" />
      <Skeleton width="70%" />
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}

export function StatusPill({ status }: { status: 'draft' | 'published' }) {
  return <span className={`status status-${status}`}>{status === 'published' ? 'Published' : 'Draft'}</span>;
}
