'use client';

// The signature "level tube" progress bar from the redesign: a dark inset track
// with an accent fill, a pace tick (where you *should* be by now), and a glowing
// bubble at the current fill level. Used on the dashboard month-goal and year strip.

interface LevelTubeProps {
  /** 0-100 — how full (earned / goal). */
  pct: number;
  /** 0-100 — where the pace marker sits (optional). */
  paceTick?: number;
  /** Tube height; defaults to the large dashboard size. */
  size?: 'lg' | 'sm';
  /** Show the floating "pace" label above the tick. */
  showPaceLabel?: boolean;
}

export default function LevelTube({ pct, paceTick, size = 'lg', showPaceLabel = false }: LevelTubeProps) {
  const clamped = Math.max(0, Math.min(100, pct));
  const large = size === 'lg';
  return (
    <div
      className="relative rounded-full bg-pl-inset overflow-hidden"
      style={{
        height: large ? 34 : 14,
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 2px 7px rgba(0,0,0,0.6)',
        marginTop: showPaceLabel ? 18 : 0,
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{
          width: `${clamped}%`,
          background: 'linear-gradient(90deg, rgba(255,106,26,0.25), rgba(255,106,26,0.55))',
        }}
      />
      {paceTick != null && (
        <>
          <div
            className="absolute"
            style={{
              left: `${Math.max(0, Math.min(100, paceTick))}%`,
              top: -2,
              bottom: -2,
              width: 2,
              background: 'rgba(242,237,228,0.55)',
            }}
          />
          {showPaceLabel && (
            <div
              className="pl-mono absolute"
              style={{
                left: `${Math.max(0, Math.min(100, paceTick))}%`,
                top: -15,
                transform: 'translateX(-50%)',
                fontSize: 9,
                color: '#9A9183',
                whiteSpace: 'nowrap',
              }}
            >
              pace
            </div>
          )}
        </>
      )}
      {large && (
        <div
          className="absolute rounded-full"
          style={{
            left: `${clamped}%`,
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: 20,
            height: 20,
            background: '#FF6A1A',
            boxShadow: '0 0 13px rgba(255,106,26,0.75)',
            border: '2px solid #1A1814',
          }}
        />
      )}
    </div>
  );
}
