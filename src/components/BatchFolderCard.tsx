import React from 'react';
import { Check, Plus, Sparkles } from 'lucide-react';
import { BatchItem } from '../data/batches';

interface BatchFolderCardProps {
  batch: BatchItem;
  index: number;
  isEnrolled: boolean;
  onOpenBatch: (id: string) => void;
  onToggleEnroll: (e: React.MouseEvent, id: string) => void;
}

const TILT_ANGLES = [-6, 5, -5, 6, -4, 5, -6, 4];

export const BatchFolderCard = React.memo(function BatchFolderCard({
  batch,
  index,
  isEnrolled,
  onOpenBatch,
  onToggleEnroll,
}: BatchFolderCardProps) {
  const id = String(batch.id);
  const tiltAngle = TILT_ANGLES[index % TILT_ANGLES.length];
  const isNewSession = batch.title.includes('26-27') || batch.title.includes('2026');
  const subtitle = isNewSession
    ? 'Session 2026–27 · Full Access'
    : batch.title.includes('2025-26')
    ? 'Session 2025–26 · Archive'
    : `Batch #${id} · Complete Lectures`;

  return (
    <div
      onClick={() => onOpenBatch(id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpenBatch(id);
        }
      }}
      className="group relative w-full aspect-[280/252] select-none transition-ui duration-200 ease-out hover:-translate-y-2 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6E92F2] rounded-[24px] animate-pop-in"
    >
      {/* Ambient Ultramarine Floor Shadow & Hover Glow */}
      <div
        className="pointer-events-none absolute -bottom-3 inset-x-5 h-10 rounded-full opacity-70 transition-ui duration-200 group-hover:opacity-100 group-hover:scale-105"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(46,93,230,0.65) 0%, rgba(15,34,112,0.45) 55%, rgba(7,16,57,0) 80%)',
        }}
      />

      {/* ============================================================
          LAYER 1: FOLDER BACK PLATE WITH CURVED TOP-LEFT TAB
          Matches static-page PlatformFolderCard exact silhouette
      ============================================================ */}
      <svg
        viewBox="0 0 280 242"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="folder-backplate absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={`batchFolderBack-${id}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6E92F2" />
            <stop offset="28%" stopColor="#2E5DE6" />
            <stop offset="72%" stopColor="#1A3BB0" />
            <stop offset="100%" stopColor="#0F2270" />
          </linearGradient>
          <linearGradient id={`batchFolderRim-${id}`} x1="0%" y1="0%" x2="100%" y2="40%">
            <stop offset="0%" stopColor="#E6EDFD" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#AFC5F8" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6E92F2" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id={`batchFolderInnerShadow-${id}`} x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#071039" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#071039" stopOpacity="0.58" />
          </linearGradient>
        </defs>

        {/* Outer Folder Back Shape with Tab */}
        <path
          d="M 0 30
             C 0 13.4 13.4 0 30 0
             L 94 0
             C 108 0 115 7 122 19
             C 128 29 135 35 149 35
             L 250 35
             C 266.6 35 280 48.4 280 65
             L 280 212
             C 280 228.6 266.6 242 250 242
             L 30 242
             C 13.4 242 0 228.6 0 212
             Z"
          fill={`url(#batchFolderBack-${id})`}
        />

        {/* Inner Depth Shading on Back Wall */}
        <path
          d="M 4 32
             C 4 16.5 16.5 4 32 4
             L 93 4
             C 106 4 112 10 119 21
             C 125 31 133 38 148 38
             L 248 38
             C 263.5 38 276 50.5 276 66
             L 276 210
             C 276 225.5 263.5 238 248 238
             L 32 238
             C 16.5 238 4 225.5 4 210
             Z"
          fill={`url(#batchFolderInnerShadow-${id})`}
        />

        {/* 3D Specular Rim Stroke along Top Tab & Back Edges */}
        <path
          d="M 1.2 30
             C 1.2 14.1 14.1 1.2 30 1.2
             L 94 1.2
             C 107.5 1.2 114.2 7.8 121 19.5
             C 127.2 29.8 134.5 36.2 149 36.2
             L 250 36.2
             C 265.9 36.2 278.8 49.1 278.8 65
             L 278.8 212
             C 278.8 227.9 265.9 240.8 250 240.8
             L 30 240.8
             C 14.1 240.8 1.2 227.9 1.2 212
             Z"
          stroke={`url(#batchFolderRim-${id})`}
          strokeWidth="2"
        />
      </svg>

      {/* Top-Left Tab Label inside the SVG Tab Area */}
      <div className="pointer-events-none absolute top-[6px] left-[16px] z-10 flex items-center gap-1">
        <Sparkles className="w-2.5 h-2.5 text-[#E6EDFD]" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-[#E6EDFD]/90">
          FREE
        </span>
      </div>

      {/* ============================================================
          LAYER 2: INSIDE THE FOLDER POCKET
          1) Clean white/ice inner document sleeve
          2) TILTED BATCH THUMBNAIL CARD peeking out the top & behind glass
      ============================================================ */}
      <div className="absolute inset-x-[7%] top-[16.5%] bottom-[8%] pointer-events-none flex items-start justify-center">
        {/* White / Alabaster Ice Inner Sheet */}
        <div
          className="w-full h-[58%] rounded-[16px] transition-transform duration-200 ease-out group-hover:-translate-y-1"
          style={{
            background:
              'linear-gradient(180deg, #E6EDFD 0%, #AFC5F8 48%, rgba(110,146,242,0.35) 100%)',
            boxShadow:
              '0 -2px 10px rgba(7,16,57,0.28), inset 0 2px 2px rgba(255,255,255,0.9)',
            border: '1px solid rgba(230,237,253,0.85)',
          }}
        />

        {/* TILTED BATCH BANNER THUMBNAIL CARD INSIDE THE FOLDER */}
        <div
          className="
            absolute -top-[10%] right-[6%] sm:right-[7%]
            w-[64%] aspect-[16/10] rounded-[18px] p-1.5
            transition-ui duration-200 ease-out
            group-hover:-translate-y-3.5 group-hover:scale-105
          "
          style={{
            transform: `rotate(${tiltAngle}deg)`,
            background:
              'linear-gradient(145deg, #071039 0%, #0F2270 65%, #1A3BB0 100%)',
            border: '2px solid rgba(230,237,253,0.82)',
            boxShadow: 'var(--folder-logo-shadow)',
          }}
        >
          <div className="relative w-full h-full rounded-[12px] overflow-hidden bg-[#071039] flex items-center justify-center">
            <img
              src={batch.thumbnail}
              alt={batch.title}
              loading={index < 4 ? 'eager' : 'lazy'}
              decoding="async"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  'https://placehold.co/600x400/0F2270/E6EDFD?text=MIND+SPARK';
              }}
              className="w-full h-full object-cover rounded-[10px]"
            />
            {/* Gloss reflection across the tilted thumbnail card */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, rgba(230,237,253,0.32) 0%, rgba(230,237,253,0) 52%)',
              }}
            />
          </div>
        </div>
      </div>

      {/* ============================================================
          LAYER 3: FROSTED GLASSMORPHISM FRONT FOLDER POCKET
      ============================================================ */}
      <div
        className="
          folder-pocket absolute inset-x-0 bottom-0 h-[70%] rounded-[22px]
          overflow-hidden flex flex-col justify-between
          p-3.5 sm:p-4
          transition-ui duration-200
        "
        style={{
          background: 'var(--folder-pocket-background)',
          backdropFilter: 'var(--glass-folder-filter)',
          WebkitBackdropFilter: 'var(--glass-folder-filter)',
          borderTop: '1.5px solid rgba(230,237,253,0.68)',
          borderLeft: '1px solid rgba(230,237,253,0.42)',
          borderRight: '1px solid rgba(175,197,248,0.32)',
          borderBottom: '1.5px solid rgba(15,34,112,0.75)',
          boxShadow:
            '0 -6px 20px rgba(7,16,57,0.32), inset 0 2px 3px rgba(230,237,253,0.48), inset 0 -6px 14px rgba(15,34,112,0.55)',
        }}
      >
        {/* 3D Raised Inner Cushion Bevel */}
        <div
          className="pointer-events-none absolute inset-[9px] sm:inset-[11px] rounded-[16px]"
          style={{
            background:
              'linear-gradient(165deg, rgba(230,237,253,0.16) 0%, rgba(110,146,242,0.06) 55%, rgba(15,34,112,0.22) 100%)',
            boxShadow:
              '0 8px 16px rgba(7,16,57,0.28), inset 0 1.5px 2px rgba(230,237,253,0.38), inset 0 -2px 4px rgba(15,34,112,0.32)',
            border: '1px solid rgba(230,237,253,0.22)',
          }}
        />

        {/* Animated diagonal glass sheen on hover */}
        <div
          className="desktop-sheen pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out"
          style={{
            background:
              'linear-gradient(105deg, transparent 20%, rgba(230,237,253,0.26) 50%, transparent 80%)',
          }}
        />

        {/* Top Row: Batch Title & Subtitle (left) + Enroll Circular Button (right) */}
        <div className="relative z-10 flex items-start justify-between gap-2 px-1.5 pt-0.5">
          <div className="text-left min-w-0 flex-1">
            <h3 className="font-display font-bold text-[13.5px] sm:text-[15px] leading-snug tracking-tight text-[#E6EDFD] line-clamp-2 group-hover:text-white transition-colors">
              {batch.title}
            </h3>
            <p className="text-[10.5px] sm:text-[11.5px] font-medium text-[#E6EDFD]/80 truncate mt-1">
              {subtitle}
            </p>
          </div>

          {/* Interactive Enroll / Wishlist Circular Badge */}
          <button
            type="button"
            title={isEnrolled ? 'Remove from Enrolled' : 'Enroll in Batch'}
            aria-label={isEnrolled ? 'Remove from Enrolled' : 'Enroll in Batch'}
            onClick={(e) => onToggleEnroll(e, id)}
            className="shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-ui duration-200 hover:scale-110 active:scale-95 cursor-pointer"
            style={{
              border: isEnrolled
                ? '1.5px solid #E6EDFD'
                : '1.25px solid rgba(230,237,253,0.75)',
              background: isEnrolled
                ? 'linear-gradient(135deg, #2E5DE6 0%, #6E92F2 100%)'
                : 'rgba(230,237,253,0.14)',
              boxShadow: isEnrolled
                ? '0 0 12px rgba(110,146,242,0.85)'
                : '0 2px 8px rgba(7,16,57,0.25)',
            }}
          >
            {isEnrolled ? (
              <Check className="w-3.5 h-3.5 text-[#E6EDFD]" strokeWidth={2.8} />
            ) : (
              <Plus className="w-3.5 h-3.5 text-[#E6EDFD]" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Bottom Row: Enrollment Status + Open Pill */}
        <div className="relative z-10 flex items-center justify-between px-1.5 pb-0.5 gap-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold tracking-wide text-[#E6EDFD]/90 truncate">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isEnrolled ? 'bg-[#E6EDFD] shadow-[0_0_8px_#E6EDFD]' : 'bg-[#AFC5F8]/80'
              }`}
            />
            <span className="truncate">{isEnrolled ? 'Enrolled · Saved' : 'Lectures & PDFs'}</span>
          </span>

          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-[#E6EDFD] opacity-95 group-hover:opacity-100 transition-opacity shrink-0"
            style={{
              background: 'rgba(7,16,57,0.45)',
              border: '1px solid rgba(230,237,253,0.35)',
            }}
          >
            <span>Open</span>
            <svg
              viewBox="0 0 12 12"
              className="w-2.5 h-2.5 transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path
                d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
});
