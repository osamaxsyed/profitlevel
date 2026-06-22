'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LevelTube from '../components/pl/LevelTube';
import { fmtMoney, PL_ACCENT, PL_CLAY } from '@/lib/dayRate';

// Public, read-only product demo with sample data (no auth, no DB).
// Mirrors the real app's Level / Jobs / Goals screens for prospects.

const TIERS: Record<string, { label: string; target: number }> = {
  full: { label: 'Full day', target: 900 },
  half: { label: 'Half day', target: 600 },
  short: { label: 'Short job', target: 300 },
  visit: { label: 'Site visit', target: 175 },
};

const JOBS = [
  { id: 'a', name: 'Master bath — set tile & waterproof', sub: 'Eastgate · Tile', date: 'Jun 20', tier: 'full', gross: 1155 },
  { id: 'b', name: 'Kelford Ave — vanity & faucet', sub: 'Kelford Ave · Fixtures', date: 'Jun 18', tier: 'half', gross: 474 },
  { id: 'c', name: 'Powder room retile', sub: 'Linwood · Tile', date: 'Jun 16', tier: 'short', gross: 437 },
  { id: 'd', name: 'Walk-through & quote', sub: 'Maple Crest · Estimate', date: 'Jun 15', tier: 'visit', gross: 175 },
  { id: 'e', name: 'Shower pan rebuild', sub: 'Box Hill · Wet area', date: 'Jun 12', tier: 'full', gross: 979 },
];

const GOALS = [
  { m: 'Jan', goal: 6000, actual: 5820 }, { m: 'Feb', goal: 6000, actual: 6340 },
  { m: 'Mar', goal: 6500, actual: 6210 }, { m: 'Apr', goal: 7000, actual: 7450 },
  { m: 'May', goal: 7000, actual: 6980 }, { m: 'Jun', goal: 7500, actual: 5840, current: true },
  { m: 'Jul', goal: 8500 }, { m: 'Aug', goal: 8500 }, { m: 'Sep', goal: 8000 },
  { m: 'Oct', goal: 8000 }, { m: 'Nov', goal: 7000 }, { m: 'Dec', goal: 6000 },
] as { m: string; goal: number; actual?: number; current?: boolean }[];

function Stamp({ job }: { job: typeof JOBS[number] }) {
  const t = TIERS[job.tier];
  const delta = job.gross - t.target;
  const cleared = delta >= 0;
  const color = cleared ? PL_ACCENT : PL_CLAY;
  return (
    <div className="relative overflow-hidden rounded-[13px] bg-pl-card p-[14px]" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: color }} />
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold uppercase text-pl-muted" style={{ fontSize: 10, letterSpacing: '0.08em', background: '#13110F', border: '1px solid rgba(255,255,255,0.07)', padding: '3px 8px', borderRadius: 6 }}>{t.label} · {fmtMoney(t.target)}</span>
        <span className="pl-mono text-pl-muted-2" style={{ fontSize: 12 }}>{job.date}</span>
      </div>
      <div className="font-bold mt-[11px] leading-tight" style={{ fontSize: 15 }}>{job.name}</div>
      <div className="text-pl-muted-2 mt-[1px]" style={{ fontSize: 12 }}>{job.sub}</div>
      <div className="h-px my-[12px]" style={{ background: 'rgba(255,255,255,0.07)' }} />
      <div className="flex items-end justify-between">
        <div>
          <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 9, letterSpacing: '0.14em' }}>Gross profit</div>
          <div className="pl-mono font-semibold mt-[2px]" style={{ fontSize: 22 }}>{fmtMoney(job.gross)}</div>
        </div>
        <span className="pl-mono font-semibold whitespace-nowrap" style={{ fontSize: 12, color, background: cleared ? 'rgba(255,106,26,0.12)' : 'rgba(224,118,78,0.1)', border: `1px solid ${cleared ? 'rgba(255,106,26,0.32)' : 'rgba(224,118,78,0.32)'}`, padding: '5px 9px', borderRadius: 7 }}>
          {cleared ? '✓ +' : '✗ −'}{fmtMoney(Math.abs(delta))}
        </span>
      </div>
    </div>
  );
}

export default function Demo() {
  const router = useRouter();
  const [screen, setScreen] = useState<'level' | 'jobs' | 'goals'>('level');

  const monthEarned = 5840, monthGoal = 7500;
  const annual = GOALS.reduce((s, g) => s + g.goal, 0);
  const ytd = GOALS.filter((g) => g.actual != null).reduce((s, g) => s + (g.actual || 0), 0);

  const navItem = (s: typeof screen, label: string) => (
    <button onClick={() => setScreen(s)} className="flex-1 flex flex-col items-center gap-[5px]" style={{ color: screen === s ? PL_ACCENT : '#6E665A' }}>
      <span className="font-bold" style={{ fontSize: 10, letterSpacing: '0.04em' }}>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-pl-bg flex flex-col items-center px-4" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="w-full max-w-md flex items-center justify-between mb-6">
        <button onClick={() => router.push('/landing')} className="font-semibold text-pl-muted" style={{ fontSize: 13 }}>← Back</button>
        <div className="font-extrabold" style={{ fontSize: 16 }}>Profit<span style={{ color: PL_ACCENT }}>Level</span> <span className="text-pl-faint font-normal" style={{ fontSize: 12 }}>· live demo</span></div>
        <div style={{ width: 40 }} />
      </div>

      {/* Phone frame */}
      <div style={{ width: 392, maxWidth: '100%', borderRadius: 46, background: '#050505', padding: 11, boxShadow: '0 40px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}>
        <div style={{ borderRadius: 36, overflow: 'hidden', background: '#0E0D0B', height: 760, display: 'flex', flexDirection: 'column' }}>
          <div className="pl-scroll" style={{ flex: 1, overflowY: 'auto', padding: '24px 18px' }}>
            {screen === 'level' && (
              <>
                <div className="font-extrabold" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>June 2026</div>
                <div className="text-pl-muted-2 mb-4" style={{ fontSize: 13 }}>5 jobs · 3 cleared their tier</div>
                <div className="bg-pl-card rounded-2xl p-5" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center justify-between">
                    <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>This month · goal</div>
                    <div className="pl-mono" style={{ fontSize: 12, color: PL_ACCENT }}>on pace ✓</div>
                  </div>
                  <div className="flex items-baseline gap-[9px] mt-[14px]">
                    <div className="pl-mono font-semibold" style={{ fontSize: 40, letterSpacing: '-0.03em' }}>{fmtMoney(monthEarned)}</div>
                    <div className="pl-mono text-pl-muted-2" style={{ fontSize: 16 }}>/ {fmtMoney(monthGoal)}</div>
                  </div>
                  <div className="mt-[22px]"><LevelTube pct={(monthEarned / monthGoal) * 100} paceTick={73} size="lg" showPaceLabel /></div>
                  <div className="flex items-center gap-2 mt-[18px]">
                    <span style={{ color: PL_ACCENT, fontSize: 15 }}>▲</span>
                    <span className="font-bold" style={{ fontSize: 14 }}>Ahead of pace</span>
                    <span className="pl-mono text-pl-text-2" style={{ fontSize: 13 }}>+$340 vs. day 22</span>
                  </div>
                </div>
                <div className="font-bold uppercase text-pl-muted-2 mt-6 mb-3" style={{ fontSize: 11, letterSpacing: '0.16em' }}>Recent jobs</div>
                <div className="flex flex-col gap-[10px]">{JOBS.slice(0, 3).map((j) => <Stamp key={j.id} job={j} />)}</div>
              </>
            )}
            {screen === 'jobs' && (
              <>
                <div className="font-extrabold" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>Jobs</div>
                <div className="text-pl-muted-2 mb-4" style={{ fontSize: 13 }}>3 of 5 cleared their tier</div>
                <div className="flex flex-col gap-[10px]">{JOBS.map((j) => <Stamp key={j.id} job={j} />)}</div>
              </>
            )}
            {screen === 'goals' && (
              <>
                <div className="font-extrabold" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>Monthly goals</div>
                <div className="text-pl-muted-2 mb-4" style={{ fontSize: 13 }}>Set each month. The year is the sum.</div>
                <div className="bg-pl-card rounded-[14px] p-[18px] mb-3" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 10, letterSpacing: '0.16em' }}>2026 annual target</div>
                  <div className="flex items-baseline gap-[9px] mt-2">
                    <span className="pl-mono font-semibold" style={{ fontSize: 34, letterSpacing: '-0.02em' }}>{fmtMoney(annual)}</span>
                    <span className="text-pl-muted-2" style={{ fontSize: 13 }}>= sum of 12 months</span>
                  </div>
                  <div className="mt-[6px] font-semibold" style={{ fontSize: 12, color: PL_ACCENT }}>{fmtMoney(ytd)} earned so far · ahead of pace</div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {GOALS.map((g) => {
                    const future = g.actual == null;
                    const met = !future && (g.actual || 0) >= g.goal;
                    const pct = future ? 0 : Math.min(100, Math.round(((g.actual || 0) / g.goal) * 100));
                    const barColor = future ? 'rgba(255,255,255,0.12)' : (met ? PL_ACCENT : PL_CLAY);
                    return (
                      <div key={g.m} className="rounded-[11px] p-[11px]" style={{ background: g.current ? 'rgba(255,106,26,0.08)' : (future ? '#15130F' : '#1A1814'), border: `1px solid ${g.current ? PL_ACCENT : 'rgba(255,255,255,0.07)'}` }}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold uppercase" style={{ fontSize: 12, color: g.current ? PL_ACCENT : (future ? '#6E665A' : '#F2EDE4') }}>{g.m}</span>
                          <span className="pl-mono" style={{ fontSize: 10, color: met ? PL_ACCENT : '#6E665A' }}>{g.current ? 'now' : (future ? '' : (met ? '✓' : '✗'))}</span>
                        </div>
                        <div className="pl-mono font-semibold mt-[7px]" style={{ fontSize: 15, color: future ? '#6E665A' : '#F2EDE4' }}>{future ? '—' : fmtMoney(g.actual || 0)}</div>
                        <div className="pl-mono text-pl-faint" style={{ fontSize: 10 }}>goal ${Math.round(g.goal / 1000)}k</div>
                        <div className="mt-[9px] h-[5px] rounded-[3px] overflow-hidden" style={{ background: '#0C0B09' }}>
                          <div className="h-full rounded-[3px]" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
          {/* Demo nav */}
          <div className="flex items-stretch justify-around" style={{ background: '#13110F', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '12px 18px 16px' }}>
            {navItem('level', 'Level')}
            {navItem('jobs', 'Jobs')}
            {navItem('goals', 'Goals')}
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mt-6 text-center">
        <button onClick={() => router.push('/landing')} className="font-bold rounded-[10px]" style={{ fontSize: 15, padding: '14px 24px', background: PL_ACCENT, color: '#1A0E04' }}>Start tracking your own jobs</button>
        <div className="text-pl-faint mt-3 pl-mono" style={{ fontSize: 12 }}>Demo · sample data</div>
      </div>
    </div>
  );
}
