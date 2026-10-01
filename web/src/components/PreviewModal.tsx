import { useEffect } from 'react';
import { previewUrl } from '../api';
import { Icon } from './Icon';

export function PreviewModal({ reportId, version, onClose }: { reportId: number; version: number; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label="Report preview" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Report preview</strong>
          <div className="actions">
            <a className="btn btn-sm" href={previewUrl(reportId)} target="_blank" rel="noreferrer">
              Open in new tab <Icon name="external" size={12} />
            </a>
            <button type="button" className="btn btn-sm" onClick={onClose} autoFocus>
              Close
            </button>
          </div>
        </div>
        <iframe key={version} title="Report preview" src={`${previewUrl(reportId)}?v=${version}`} className="modal-iframe" />
      </div>
    </div>
  );
}
