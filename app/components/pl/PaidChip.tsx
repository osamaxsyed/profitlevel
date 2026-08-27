'use client';

import { PAID_TOKENS, type PaidStatus } from './subTypes';

// Small semantic chip: paid / partial / unpaid. Same visual grammar as the
// tier chip and the cleared/under stamp on JobStampCard.
export default function PaidChip({ status, size = 'sm' }: { status: PaidStatus; size?: 'sm' | 'md' }) {
  const tok = PAID_TOKENS[status] ?? PAID_TOKENS.unpaid;
  return (
    <span
      className="font-bold uppercase whitespace-nowrap"
      style={{
        fontSize: size === 'md' ? 11 : 10,
        letterSpacing: '0.08em',
        color: tok.color,
        background: tok.bg,
        border: `1px solid ${tok.bd}`,
        padding: size === 'md' ? '4px 10px' : '3px 8px',
        borderRadius: 6,
      }}
    >
      {tok.label}
    </span>
  );
}
