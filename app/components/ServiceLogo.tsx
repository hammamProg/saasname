"use client";

import { useState } from 'react';

interface ServiceLogoProps {
  src?: string;
  name: string;
  size?: number;
  className?: string;
  connected?: boolean;
}

export function ServiceLogo({
  src,
  name,
  size = 48,
  className = '',
  connected,
}: ServiceLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const shellClass =
    connected === undefined
      ? 'bg-white border border-slate-200'
      : connected
        ? 'bg-emerald-50 border border-emerald-200'
        : 'bg-slate-50 border border-slate-200';

  if (!src || failed) {
    return (
      <div
        className={`rounded-xl flex items-center justify-center font-bold text-slate-600 ${shellClass} ${className}`}
        style={{ width: size, height: size, fontSize: Math.max(12, size * 0.32) }}
        aria-hidden
      >
        {initials}
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl overflow-hidden flex items-center justify-center p-1.5 ${shellClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={src}
        alt={`${name} logo`}
        className="w-full h-full object-contain"
        loading="lazy"
        onError={() => setFailed(true)}
      />
    </div>
  );
}
