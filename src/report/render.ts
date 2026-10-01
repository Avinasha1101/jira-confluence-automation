import { EpicGroup, Rag, ReportContent } from '../domain/apiTypes';

export type RenderMode = 'preview' | 'confluence';

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const RAG_COLOURS: Record<Rag, { confluence: string; css: string }> = {
  Red: { confluence: 'Red', css: '#c62828' },
  Amber: { confluence: 'Yellow', css: '#b26a00' },
  Green: { confluence: 'Green', css: '#2e7d32' },
};

function ragBadge(rag: Rag, mode: RenderMode): string {
  if (mode === 'confluence') {
    return `<ac:structured-macro ac:name="status"><ac:parameter ac:name="colour">${RAG_COLOURS[rag].confluence}</ac:parameter><ac:parameter ac:name="title">${rag.toUpperCase()}</ac:parameter></ac:structured-macro>`;
  }
  return `<span class="rag" style="background:${RAG_COLOURS[rag].css}">${rag.toUpperCase()}</span>`;
}

function epicSection(title: string, groups: EpicGroup[], empty: string): string {
  if (!groups.length) return `<h2>${title}</h2><p><em>${empty}</em></p>`;
  const body = groups
    .map((g) => {
      const rows = g.items
        .map(
          (i) =>
            `<tr><td>${esc(i.key)}</td><td>${esc(i.title)}</td><td>${esc(i.status)}</td><td>${i.points ?? '-'}</td></tr>`,
        )
        .join('');
      return `<h3>${esc(g.epic)}</h3>${g.blurb ? `<p>${esc(g.blurb)}</p>` : ''}<table><tbody><tr><th>Key</th><th>Title</th><th>Status</th><th>Points</th></tr>${rows}</tbody></table>`;
    })
    .join('');
  return `<h2>${title}</h2>${body}`;
}

export function renderBody(content: ReportContent, mode: RenderMode): string {
  const { header, metrics: m } = content;
  const rag = content.rag;
  const overridden = rag.final !== rag.computed;

  const blockers = content.blockers.length
    ? `<table><tbody><tr><th>Key</th><th>Title</th><th>Days blocked</th></tr>${content.blockers
        .map(
          (b) =>
            `<tr><td>${esc(b.key)}</td><td>${esc(b.title)}</td><td>${b.daysBlocked}</td></tr>`,
        )
        .join('')}</tbody></table>`
    : '<p>No current blockers.</p>';

  const allRisks = [...content.risks, ...content.manualRisks];
  const risks = allRisks.length
    ? `<ul>${allRisks.map((r) => `<li>${esc(r)}</li>`).join('')}</ul>`
    : '<p>No additional risks reported.</p>';

  const priorities = Object.entries(m.bugs.openByPriority)
    .map(([p, n]) => `${esc(p)}: ${n}`)
    .join(', ');

  const metricsTable = `<table><tbody>
<tr><th>Velocity</th><td>${m.velocity.donePoints} of ${m.velocity.committedPoints} points done (${m.velocity.percent}%)${
    m.velocity.unestimatedCount ? `; ${m.velocity.unestimatedCount} issue(s) unestimated` : ''
  }</td></tr>
<tr><th>Sprint progress</th><td>${m.progress.scopeDonePercent}% of scope done, ${m.progress.timeElapsedPercent}% of time elapsed</td></tr>
<tr><th>Issues by status</th><td>To Do ${m.statusCounts.todo}, In Progress ${m.statusCounts.inProgress}, Blocked ${m.statusCounts.blocked}, Done ${m.statusCounts.done}</td></tr>
<tr><th>Open bugs</th><td>${m.bugs.openTotal}${priorities ? ` (${priorities})` : ''}</td></tr>
<tr><th>Bug aging</th><td>0-7 days: ${m.bugs.aging['0-7']}, 8-14: ${m.bugs.aging['8-14']}, 15-30: ${m.bugs.aging['15-30']}, 30+: ${m.bugs.aging['30+']}</td></tr>
<tr><th>Cycle time</th><td>${
    m.cycleTime.sampleSize
      ? `mean ${m.cycleTime.meanDays} days, median ${m.cycleTime.medianDays} days (${m.cycleTime.sampleSize} issues)`
      : 'not enough completed issues'
  }</td></tr>
</tbody></table>`;

  return `<h1>${esc(header.project)} - Weekly Status</h1>
<p><strong>${esc(header.sprintName)}</strong> | ${header.sprintStart.slice(0, 10)} to ${header.sprintEnd.slice(0, 10)} | Report date ${header.reportDate}</p>
<p>Overall status: ${ragBadge(rag.final, mode)}${overridden ? ` (computed ${rag.computed}; overridden: ${esc(rag.overrideReason ?? '')})` : ''}</p>
<h2>Executive summary</h2><p>${esc(content.summary)}</p>
${epicSection('Completed this week', content.completed, 'Nothing completed in the past 7 days.')}
${epicSection('In progress', content.inProgress, 'Nothing in progress.')}
${epicSection('Planned next', content.next, 'Nothing planned.')}
<h2>Blockers and risks</h2>${blockers}${risks}
<h2>Metrics</h2>${metricsTable}
<p><em>Generated ${content.footer.generatedAt}. ${content.footer.excludedCount} internal-only issue(s) excluded; ${content.footer.redactionCount} sensitive value(s) redacted.</em></p>`;
}

export function renderConfluence(content: ReportContent): string {
  return renderBody(content, 'confluence');
}

export function renderPreviewHtml(content: ReportContent): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(content.header.project)} status</title>
<style>
body{font-family:Segoe UI,Arial,sans-serif;color:#172b4d;max-width:900px;margin:24px auto;padding:0 16px;line-height:1.5}
h1{font-size:26px;margin-bottom:4px}h2{font-size:19px;border-bottom:1px solid #dfe1e6;padding-bottom:4px;margin-top:28px}h3{font-size:15px;margin-bottom:4px}
table{border-collapse:collapse;width:100%;margin:8px 0}th,td{border:1px solid #dfe1e6;padding:6px 10px;text-align:left;font-size:14px}th{background:#f4f5f7}
.rag{color:#fff;padding:2px 12px;border-radius:12px;font-weight:600;font-size:13px}
</style></head><body>${renderBody(content, 'preview')}</body></html>`;
}
