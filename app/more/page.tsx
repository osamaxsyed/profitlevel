'use client';

import { useRouter } from 'next/navigation';
import { UserButton } from '@clerk/nextjs';
import BottomNav from '../components/pl/BottomNav';

// The "More" hub: secondary destinations that aren't daily-driver tabs.
const ITEMS: { label: string; sub: string; href: string; icon: string }[] = [
  { label: 'Financials', sub: 'Revenue, costs, profit & tax', href: '/financials', icon: '📊' },
  { label: 'Overhead', sub: 'Recurring business expenses', href: '/overhead', icon: '🏢' },
  { label: 'Settings', sub: 'Day-rate targets & mileage rates', href: '/settings', icon: '⚙️' },
];

export default function More() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-pl-bg max-w-md mx-auto px-[18px]" style={{ paddingBottom: 96 }}>
      <div className="flex items-center justify-between pt-6 pb-4">
        <div>
          <div className="font-extrabold" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>More</div>
          <div className="text-pl-muted-2 mt-[2px]" style={{ fontSize: 13 }}>Reports & settings</div>
        </div>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>

      <div className="flex flex-col gap-2">
        {ITEMS.map((it) => (
          <button
            key={it.href}
            onClick={() => router.push(it.href)}
            className="flex items-center gap-3 bg-pl-card rounded-[13px] p-4 text-left"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
          >
            <span style={{ fontSize: 22 }}>{it.icon}</span>
            <span className="flex-1">
              <span className="block font-bold" style={{ fontSize: 16 }}>{it.label}</span>
              <span className="block text-pl-muted-2" style={{ fontSize: 12 }}>{it.sub}</span>
            </span>
            <span className="text-pl-faint" style={{ fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>

      <BottomNav active="more" />
    </div>
  );
}
