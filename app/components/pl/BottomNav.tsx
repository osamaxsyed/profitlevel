'use client';

import { useRouter } from 'next/navigation';

// Persistent bottom tab bar — the app's primary navigation.
// Level + Jobs both live on "/" (home toggles via the `tab` query / prop);
// Goals and More are their own routes.

type Tab = 'level' | 'jobs' | 'goals' | 'more';

const ACCENT = '#FF6A1A';
const INACTIVE = '#6E665A';

function Icon({ name }: { name: Tab }) {
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (name) {
    case 'level':
      return (
        <svg {...common}>
          <rect x="3" y="9" width="18" height="6" rx="3" />
          <circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'jobs':
      return (
        <svg {...common}>
          <rect x="5" y="3" width="14" height="18" rx="2" />
          <path d="M9 8h6M9 12h6M9 16h3" />
        </svg>
      );
    case 'goals':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M3 9h18M8 2v4M16 2v4" />
        </svg>
      );
    case 'more':
      return (
        <svg {...common}>
          <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
          <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

export default function BottomNav({ active, onTab }: { active: Tab; onTab?: (t: Tab) => void }) {
  const router = useRouter();

  const go = (tab: Tab) => {
    // Level/Jobs are in-page tabs on "/" when a handler is provided (home screen).
    if ((tab === 'level' || tab === 'jobs') && onTab) {
      onTab(tab);
      return;
    }
    if (tab === 'level') router.push('/');
    else if (tab === 'jobs') router.push('/?tab=jobs');
    else if (tab === 'goals') router.push('/goals');
    else router.push('/more');
  };

  const items: { tab: Tab; label: string }[] = [
    { tab: 'level', label: 'Level' },
    { tab: 'jobs', label: 'Jobs' },
    { tab: 'goals', label: 'Goals' },
    { tab: 'more', label: 'More' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50 flex items-stretch justify-around"
      style={{
        background: '#13110F',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        padding: '10px 18px max(26px, env(safe-area-inset-bottom)) 18px',
      }}
    >
      {items.map(({ tab, label }) => {
        const isActive = active === tab;
        return (
          <button
            key={tab}
            onClick={() => go(tab)}
            className="flex-1 flex flex-col items-center gap-[5px]"
            style={{ color: isActive ? ACCENT : INACTIVE }}
          >
            <Icon name={tab} />
            <span className="font-bold" style={{ fontSize: 10, letterSpacing: '0.04em' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
