export type IconName = 'check' | 'alert' | 'info' | 'x' | 'external' | 'shield' | 'save' | 'refresh' | 'eye' | 'plus' | 'chevron';

const PATHS: Record<IconName, string> = {
  check: 'M4 10.5l4 4 8-9',
  alert: 'M10 3l8 14H2L10 3zM10 8v4M10 14.5v.5',
  info: 'M10 9v5M10 6v.5M10 2a8 8 0 100 16 8 8 0 000-16z',
  x: 'M5 5l10 10M15 5L5 15',
  external: 'M8 4H4v12h12v-4M11 3h6v6M17 3l-8 8',
  shield: 'M10 2l7 3v5c0 4-3 7-7 8-4-1-7-4-7-8V5l7-3zM7 10l2 2 4-4',
  save: 'M4 3h10l3 3v11H4V3zM7 3v4h6V3M7 17v-5h6v5',
  refresh: 'M16 10a6 6 0 11-2-4.5M16 3v4h-4',
  eye: 'M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z',
  plus: 'M10 4v12M4 10h12',
  chevron: 'M6 8l4 4 4-4',
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
