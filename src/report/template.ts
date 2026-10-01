import { EpicGroup, ReportContent } from '../domain/apiTypes';

export type Section = 'completed' | 'inProgress' | 'next';

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

function pointsOf(group: EpicGroup): number {
  return group.items.reduce((acc, i) => acc + (i.points ?? 0), 0);
}

export function templateBlurb(section: Section, group: EpicGroup): string {
  const n = group.items.length;
  const pts = pointsOf(group);
  const ptsText = pts > 0 ? ` (${pts} story points)` : '';
  switch (section) {
    case 'completed':
      return `${plural(n, 'item')} completed${ptsText}.`;
    case 'inProgress': {
      const blocked = group.items.filter((i) => i.status.toLowerCase().includes('block')).length;
      return `${plural(n, 'item')} in progress${ptsText}${blocked ? `, ${blocked} blocked` : ''}.`;
    }
    case 'next':
      return `${plural(n, 'item')} planned next${ptsText}.`;
  }
}

export function templateSummary(content: ReportContent): string {
  const { metrics, blockers, header } = content;
  const rag = content.rag.final;
  const first = `${header.project}, ${header.sprintName}: overall status is ${rag}, with ${metrics.velocity.donePoints} of ${metrics.velocity.committedPoints} story points complete (${metrics.velocity.percent}%) and ${metrics.progress.timeElapsedPercent}% of the sprint elapsed.`;

  const completedCount = content.completed.reduce((acc, g) => acc + g.items.length, 0);
  const second =
    completedCount > 0
      ? `Highlight: ${plural(completedCount, 'item')} completed this week${
          content.completed[0] ? `, led by ${content.completed[0].epic}` : ''
        }.`
      : 'No items were completed in the past week.';

  const third = blockers.length
    ? `Key risk: ${plural(blockers.length, 'issue')} blocked, the longest for ${blockers[0].daysBlocked} day(s) (${blockers[0].key}).`
    : content.risks.length
      ? `Key risk: ${content.risks[0]}.`
      : 'No blockers or significant risks to report.';

  return `${first} ${second} ${third}`;
}

export function applyTemplateDraft(content: ReportContent): void {
  content.summary = templateSummary(content);
  for (const section of ['completed', 'inProgress', 'next'] as const) {
    for (const group of content[section]) group.blurb = templateBlurb(section, group);
  }
}
