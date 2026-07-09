'use client';

import { useState } from 'react';

/**
 * Round avatar for a person. Renders the LINE profile photo when `src` is set,
 * falling back to the first two characters of `name` on a colored disc — and
 * ALSO falls back if the image fails to load (LINE avatar URLs can 403 once the
 * user changes their photo). `size` is the diameter in px.
 */
export function Avatar({ src, name, size = 38, style }) {
  const [broken, setBroken] = useState(false);
  const dim = { width: `${size}px`, height: `${size}px`, borderRadius: '9999px', flex: '0 0 auto' };
  const initials = (name || '訪').slice(0, 2);

  if (src && !broken) {
    return (
      <img
        src={src}
        alt={name || ''}
        onError={() => setBroken(true)}
        style={{ ...dim, objectFit: 'cover', background: 'var(--surface-sunken, #e5edf0)', ...style }}
      />
    );
  }
  return (
    <span
      aria-label={name || ''}
      style={{
        ...dim,
        background: '#6FCDE8',
        color: '#0B2935',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '800',
        fontSize: `${Math.round(size * 0.37)}px`,
        ...style,
      }}
    >
      {initials}
    </span>
  );
}
