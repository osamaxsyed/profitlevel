'use client';

import { useRouter } from 'next/navigation';

// Lightweight header for secondary screens: optional back chevron, title, subtitle.
export default function PageHeader({
  title,
  subtitle,
  back = '/more',
  right,
}: {
  title: string;
  subtitle?: string;
  back?: string | null;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="pt-5 pb-3">
      {back && (
        <button onClick={() => router.push(back)} className="font-semibold text-pl-muted" style={{ fontSize: 13 }}>
          ← Back
        </button>
      )}
      <div className="flex items-end justify-between mt-2">
        <div>
          <div className="font-extrabold" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>{title}</div>
          {subtitle && <div className="text-pl-muted-2 mt-[2px]" style={{ fontSize: 13 }}>{subtitle}</div>}
        </div>
        {right}
      </div>
    </div>
  );
}
