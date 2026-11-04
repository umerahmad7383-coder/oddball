/* The oddball mark: an "o" whose dot has wandered off-centre. */
import React from 'react';
export function Mark({ className = '' }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true">
      <circle cx="50" cy="50" r="38" fill="none" stroke="var(--ink)" strokeWidth="16" />
      <circle className="mark-dot" cx="64" cy="38" r="11" fill="var(--accent)" />
    </svg>
  );
}
