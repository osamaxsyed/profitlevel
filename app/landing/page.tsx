'use client';

import { SignInButton } from '@clerk/nextjs';

// Redesigned landing page — matches the ProfitLevel Redesign Brief mockup.
// Static marketing content; CTAs use Clerk modal → /onboarding (preserved from prior flow).

const ACCENT = '#FF6A1A';
const CLAY = '#E0764E';

const TIERS = [
  { label: 'Full day', value: '$900', note: 'Tile sets, pan rebuilds, full installs.', top: ACCENT },
  { label: 'Half day', value: '$600', note: 'Vanity swaps, fixtures, small demo.', top: 'rgba(255,106,26,0.6)' },
  { label: 'Short job', value: '$300', note: 'Grab bars, caulk, a single repair.', top: 'rgba(255,106,26,0.38)' },
  { label: 'Site visit', value: '$175', note: 'Walk-throughs, estimates, measure-ups.', top: 'rgba(255,106,26,0.2)' },
];

function Cta({ children, className = '', style = {} }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <SignInButton mode="modal" forceRedirectUrl="/onboarding" signUpForceRedirectUrl="/onboarding">
      <button className={className} style={style}>{children}</button>
    </SignInButton>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-pl-bg text-pl-text">
      {/* Top bar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-10 py-[14px]" style={{ background: 'rgba(16,15,13,0.82)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="font-extrabold" style={{ fontSize: 18, letterSpacing: '-0.01em' }}>Profit<span style={{ color: ACCENT }}>Level</span></div>
        <div className="flex items-center gap-2">
          <SignInButton mode="modal">
            <button className="font-bold text-pl-muted" style={{ fontSize: 13 }}>Sign in</button>
          </SignInButton>
          <Cta className="font-bold rounded-lg" style={{ fontSize: 13, padding: '8px 16px', background: ACCENT, color: '#1A0E04' }}>Start free</Cta>
        </div>
      </div>

      {/* HERO */}
      <div className="mx-auto px-4 sm:px-10" style={{ maxWidth: 1120, paddingTop: 'clamp(40px,8vw,88px)', paddingBottom: 'clamp(32px,6vw,56px)' }}>
        <div className="flex items-center gap-[10px] mb-[26px]">
          <div className="rounded-full" style={{ width: 7, height: 7, background: ACCENT }} />
          <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 12, letterSpacing: '0.2em' }}>Profit tracking for one-person shops</div>
        </div>
        <h1 className="m-0 font-extrabold" style={{ fontSize: 'clamp(38px,7.4vw,76px)', lineHeight: 0.98, letterSpacing: '-0.03em', maxWidth: '14ch' }}>
          Know if the job paid before you load the truck.
        </h1>
        <p className="mt-6" style={{ maxWidth: '50ch', fontSize: 'clamp(16px,2vw,19px)', lineHeight: 1.55, color: '#B6AD9D' }}>
          ProfitLevel scores every job against its day rate, then answers the one thing that matters at the end of the week: <span style={{ color: '#F2EDE4' }}>are you on pace for your month.</span> Built for the guy doing the work — not the books.
        </p>
        <div className="flex flex-wrap gap-3 mt-[30px]">
          <Cta className="font-bold rounded-[10px]" style={{ fontSize: 15, padding: '14px 24px', background: ACCENT, color: '#1A0E04', boxShadow: '0 6px 20px rgba(255,106,26,0.28)' }}>Start tracking free</Cta>
          <a href="#math" className="inline-flex items-center font-semibold rounded-[10px]" style={{ fontSize: 15, padding: '14px 22px', background: '#1C1A16', border: '1px solid rgba(255,255,255,0.1)', color: '#E6DECF' }}>See how the math works</a>
        </div>

        {/* Hero artifacts */}
        <div className="grid gap-[18px] mt-[clamp(40px,6vw,64px)]" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(290px,1fr))' }}>
          {/* job card */}
          <div className="relative overflow-hidden bg-pl-card rounded-[14px] p-[18px]" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: ACCENT }} />
            <div className="flex items-center justify-between gap-[10px]">
              <span className="font-bold uppercase" style={{ fontSize: 11, letterSpacing: '0.1em', color: '#1A0E04', background: ACCENT, padding: '4px 9px', borderRadius: 6 }}>Full day · $900</span>
              <span className="pl-mono text-pl-muted-2" style={{ fontSize: 12 }}>Jun 20</span>
            </div>
            <div className="mt-[14px] font-bold leading-tight" style={{ fontSize: 17 }}>Master bath — set tile &amp; waterproof</div>
            <div className="text-pl-muted-2 mt-[2px]" style={{ fontSize: 13 }}>Eastgate · Tile</div>
            <div className="h-px my-[14px]" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <div className="flex items-end justify-between">
              <div>
                <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 10, letterSpacing: '0.16em' }}>Gross profit</div>
                <div className="pl-mono font-semibold mt-[3px]" style={{ fontSize: 30, letterSpacing: '-0.02em' }}>$1,155</div>
              </div>
              <div className="text-right">
                <div className="pl-mono inline-flex items-center gap-[5px] font-semibold" style={{ fontSize: 13, color: ACCENT, background: 'rgba(255,106,26,0.12)', border: '1px solid rgba(255,106,26,0.34)', padding: '5px 9px', borderRadius: 7 }}>✓ CLEARED +$255</div>
                <div className="pl-mono text-pl-muted-2 mt-[6px]" style={{ fontSize: 11 }}>beat the $900 day rate</div>
              </div>
            </div>
          </div>

          {/* this month level */}
          <div className="bg-pl-card rounded-[14px] p-[18px] flex flex-col" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex items-center justify-between">
              <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 11, letterSpacing: '0.16em' }}>This month · goal</div>
              <div className="pl-mono text-pl-muted-2" style={{ fontSize: 12 }}>Jun 2026</div>
            </div>
            <div className="flex items-baseline gap-2 mt-3">
              <div className="pl-mono font-semibold" style={{ fontSize: 34, letterSpacing: '-0.02em' }}>$5,840</div>
              <div className="pl-mono text-pl-muted-2" style={{ fontSize: 15 }}>/ $7,500</div>
            </div>
            <div className="mt-5 relative rounded-[15px] overflow-hidden" style={{ height: 30, background: '#0C0B09', border: '1px solid rgba(255,255,255,0.08)', boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.6)' }}>
              <div className="absolute left-0 top-0 bottom-0" style={{ width: '78%', background: 'linear-gradient(90deg,rgba(255,106,26,0.25),rgba(255,106,26,0.5))' }} />
              <div className="absolute" style={{ left: '73%', top: -2, bottom: -2, width: 2, background: 'rgba(242,237,228,0.55)' }} />
              <div className="absolute rounded-full" style={{ left: '78%', top: '50%', transform: 'translate(-50%,-50%)', width: 18, height: 18, background: ACCENT, boxShadow: '0 0 12px rgba(255,106,26,0.7)', border: '2px solid #1A1814' }} />
            </div>
            <div className="flex items-center gap-[7px] mt-auto pt-[18px]">
              <span style={{ color: ACCENT, fontSize: 15 }}>▲</span>
              <span className="font-bold" style={{ fontSize: 14 }}>Ahead of pace</span>
              <span className="pl-mono text-pl-text-2" style={{ fontSize: 13 }}>+$340 vs. where you should be</span>
            </div>
          </div>
        </div>
      </div>

      {/* TWO LENSES */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#13110F' }}>
        <div className="mx-auto px-4 sm:px-10" style={{ maxWidth: 1120, paddingTop: 'clamp(48px,7vw,80px)', paddingBottom: 'clamp(48px,7vw,80px)' }}>
          <div className="font-bold uppercase" style={{ fontSize: 12, letterSpacing: '0.2em', color: ACCENT }}>Two questions. Never blurred.</div>
          <h2 className="font-extrabold" style={{ margin: '14px 0 0', fontSize: 'clamp(26px,4.4vw,42px)', letterSpacing: '-0.02em', maxWidth: '20ch', lineHeight: 1.04 }}>Most apps mash these together. We keep them apart on purpose.</h2>
          <div className="grid gap-[18px] mt-9" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
            {/* lens 1 */}
            <div className="bg-pl-card rounded-[14px] p-[22px]" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-[9px]">
                <div className="pl-mono font-bold text-pl-muted-2" style={{ fontSize: 13 }}>01</div>
                <div className="font-extrabold" style={{ fontSize: 19 }}>Did I price this job right?</div>
              </div>
              <p style={{ margin: '10px 0 18px', color: '#B6AD9D', fontSize: 15, lineHeight: 1.5 }}>A per-job verdict. Stamp it the second the job closes — gross profit against the day rate you set out to hit. Black and white.</p>
              <div className="flex flex-col gap-2 pl-mono">
                <div className="flex items-center justify-between" style={{ padding: '11px 13px', background: '#13110F', borderRadius: 9, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 600, fontSize: 14 }}>Powder room retile</span>
                  <span style={{ fontSize: 12, color: ACCENT, background: 'rgba(255,106,26,0.12)', border: '1px solid rgba(255,106,26,0.32)', padding: '4px 8px', borderRadius: 6 }}>✓ +$137</span>
                </div>
                <div className="flex items-center justify-between" style={{ padding: '11px 13px', background: '#13110F', borderRadius: 9, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 600, fontSize: 14 }}>Kelford Ave — vanity</span>
                  <span style={{ fontSize: 12, color: CLAY, background: 'rgba(224,118,78,0.1)', border: '1px solid rgba(224,118,78,0.32)', padding: '4px 8px', borderRadius: 6 }}>✗ −$126</span>
                </div>
              </div>
              <div className="mt-4 font-bold uppercase text-pl-faint" style={{ fontSize: 11, letterSpacing: '0.14em' }}>Lens: the stamp · per job</div>
            </div>
            {/* lens 2 */}
            <div className="bg-pl-card rounded-[14px] p-[22px]" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-[9px]">
                <div className="pl-mono font-bold text-pl-muted-2" style={{ fontSize: 13 }}>02</div>
                <div className="font-extrabold" style={{ fontSize: 19 }}>Am I hitting my number?</div>
              </div>
              <p style={{ margin: '10px 0 18px', color: '#B6AD9D', fontSize: 15, lineHeight: 1.5 }}>A running read on the month and the year. Not a verdict — a level. Are you plumb on your goal, or do you need to book another day this week?</p>
              <div style={{ background: '#13110F', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)', padding: 16 }}>
                <div className="flex items-baseline justify-between">
                  <span className="pl-mono font-semibold" style={{ fontSize: 22 }}>$5,840</span>
                  <span className="pl-mono text-pl-muted-2" style={{ fontSize: 13 }}>/ $7,500 goal</span>
                </div>
                <div className="mt-[14px] relative rounded-[11px] overflow-hidden" style={{ height: 22, background: '#0C0B09', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="absolute left-0 top-0 bottom-0" style={{ width: '78%', background: 'linear-gradient(90deg,rgba(255,106,26,0.25),rgba(255,106,26,0.5))' }} />
                  <div className="absolute" style={{ left: '73%', top: -2, bottom: -2, width: 2, background: 'rgba(242,237,228,0.5)' }} />
                  <div className="absolute rounded-full" style={{ left: '78%', top: '50%', transform: 'translate(-50%,-50%)', width: 14, height: 14, background: ACCENT, border: '2px solid #13110F', boxShadow: '0 0 10px rgba(255,106,26,0.7)' }} />
                </div>
              </div>
              <div className="mt-4 font-bold uppercase text-pl-faint" style={{ fontSize: 11, letterSpacing: '0.14em' }}>Lens: the level · per month + year</div>
            </div>
          </div>
        </div>
      </div>

      {/* DAY RATE TIERS */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="mx-auto px-4 sm:px-10" style={{ maxWidth: 1120, paddingTop: 'clamp(48px,7vw,80px)', paddingBottom: 'clamp(48px,7vw,80px)' }}>
          <div className="font-bold uppercase" style={{ fontSize: 12, letterSpacing: '0.2em', color: ACCENT }}>Score by the day, not the hour</div>
          <h2 className="font-extrabold" style={{ margin: '14px 0 0', fontSize: 'clamp(26px,4.4vw,42px)', letterSpacing: '-0.02em', maxWidth: '22ch', lineHeight: 1.04 }}>You don&apos;t bill in six-minute increments. So you shouldn&apos;t grade jobs that way.</h2>
          <p style={{ margin: '16px 0 0', maxWidth: '54ch', color: '#B6AD9D', fontSize: 16, lineHeight: 1.55 }}>Set four day-rate tiers. A job <span style={{ color: '#F2EDE4' }}>clears</span> when its gross profit beats the tier you meant to hit. No timesheets, no fake hourly math — just the rate you&apos;d quote standing in the driveway.</p>
          <div className="grid gap-[14px] mt-[34px]" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))' }}>
            {TIERS.map((t) => (
              <div key={t.label} className="bg-pl-card rounded-[13px] p-5" style={{ border: '1px solid rgba(255,255,255,0.07)', borderTop: `3px solid ${t.top}` }}>
                <div className="font-bold uppercase text-pl-muted-2" style={{ fontSize: 12, letterSpacing: '0.12em' }}>{t.label}</div>
                <div className="pl-mono font-semibold mt-2" style={{ fontSize: 34, letterSpacing: '-0.02em' }}>{t.value}</div>
                <div className="text-pl-muted-2 mt-[6px]" style={{ fontSize: 13 }}>{t.note}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* THE MATH */}
      <div id="math" style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#13110F' }}>
        <div className="mx-auto px-4 sm:px-10" style={{ maxWidth: 1120, paddingTop: 'clamp(48px,7vw,80px)', paddingBottom: 'clamp(48px,7vw,80px)' }}>
          <div className="grid gap-9 items-center" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
            <div>
              <div className="font-bold uppercase" style={{ fontSize: 12, letterSpacing: '0.2em', color: ACCENT }}>The math is the product</div>
              <h2 className="font-extrabold" style={{ margin: '14px 0 0', fontSize: 'clamp(26px,4.4vw,42px)', letterSpacing: '-0.02em', lineHeight: 1.04 }}>Revenue, minus what it really cost, against the rate.</h2>
              <p style={{ margin: '16px 0 0', color: '#B6AD9D', fontSize: 16, lineHeight: 1.55 }}>Materials. The helper you brought for the heavy half-day. The miles to the supply house and back. We subtract the costs that quietly eat a job, then hold the result up against your tier.</p>
              <p className="pl-mono" style={{ margin: '16px 0 0', color: '#8A8073', fontSize: 14, lineHeight: 1.5 }}>Mileage figured at the current IRS standard rate.</p>
            </div>
            {/* ledger */}
            <div className="bg-pl-card rounded-[14px] overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between" style={{ padding: '16px 18px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <span className="font-bold" style={{ fontSize: 14 }}>Shower pan rebuild</span>
                <span className="font-bold uppercase" style={{ fontSize: 11, letterSpacing: '0.1em', color: '#1A0E04', background: ACCENT, padding: '4px 9px', borderRadius: 6 }}>Full day · $900</span>
              </div>
              <div className="pl-mono" style={{ padding: '6px 18px' }}>
                {[['Revenue', '$1,620', '#F2EDE4', false], ['Materials', '$410', CLAY, true], ['Labor · helper ½ day', '$220', CLAY, true], ['Mileage · 16 mi', '$11', CLAY, true]].map((r, i) => (
                  <div key={i} className="flex justify-between" style={{ padding: '11px 0', borderBottom: '1px dashed rgba(255,255,255,0.08)' }}>
                    <span style={{ color: '#B6AD9D' }}>{r[0] as string}</span>
                    <span style={{ fontWeight: 600, color: r[2] as string }}>{(r[3] as boolean) ? '−' : ''}{r[1] as string}</span>
                  </div>
                ))}
                <div className="flex justify-between items-baseline" style={{ padding: '14px 0 6px' }}>
                  <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 13, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#8A8073' }}>Gross profit</span>
                  <span style={{ fontWeight: 600, fontSize: 24 }}>$979</span>
                </div>
              </div>
              <div className="flex items-center justify-between" style={{ margin: '0 18px 18px', padding: '12px 14px', borderRadius: 9, background: 'rgba(255,106,26,0.1)', border: '1px solid rgba(255,106,26,0.3)' }}>
                <span className="font-bold" style={{ fontSize: 14, color: ACCENT }}>✓ Cleared the full-day rate</span>
                <span className="pl-mono font-semibold" style={{ fontSize: 15, color: ACCENT }}>+$79</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#0C0B09' }}>
        <div className="mx-auto px-4 sm:px-10" style={{ maxWidth: 1120, paddingTop: 'clamp(40px,6vw,64px)', paddingBottom: 'clamp(40px,6vw,64px)' }}>
          <div className="flex flex-wrap gap-6 items-center justify-between">
            <div style={{ maxWidth: '40ch' }}>
              <div className="font-extrabold" style={{ fontSize: 24, letterSpacing: '-0.01em' }}>Profit<span style={{ color: ACCENT }}>Level</span></div>
              <p style={{ margin: '12px 0 0', color: '#8A8073', fontSize: 15, lineHeight: 1.5 }}>A tool, not a platform. Made for bathroom remodelers and the trades that bill by the day. No per-seat pricing, no onboarding call.</p>
            </div>
            <Cta className="font-bold rounded-[10px]" style={{ fontSize: 15, padding: '14px 24px', background: ACCENT, color: '#1A0E04' }}>Start tracking free</Cta>
          </div>
          <div className="pl-mono" style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: '#5C544A' }}>ProfitLevel · profit tracking for the trades</div>
        </div>
      </div>
    </div>
  );
}
