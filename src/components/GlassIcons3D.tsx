import React from 'react';

interface IconProps {
  className?: string;
  hasUnread?: boolean;
}

/**
 * Replicates ref2.jpg (Row 3, Col 3):
 * Vivid inner message card with 3 lines sliding inside a translucent frosted glass envelope pocket.
 */
export const GlassEnvelopeNotificationIcon: React.FC<IconProps> = ({
  className = 'w-11 h-11',
  hasUnread = false,
}) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-75 transition-opacity group-hover:opacity-100"
        style={{
          background: 'radial-gradient(circle, rgba(110,146,242,0.55) 0%, rgba(46,93,230,0) 75%)',
        }}
      />

      {/* Back envelope flap */}
      <div
        className="absolute bottom-1 w-[82%] h-[58%] rounded-xl"
        style={{
          background: 'linear-gradient(145deg, #1A3BB0 0%, #0F2270 100%)',
          boxShadow: '0 4px 12px rgba(7,16,57,0.6)',
        }}
      />

      {/* Inner vivid card with 3 lines sticking out the top (tilts & lifts on hover) */}
      <div
        className={`absolute top-1 w-[64%] h-[68%] rounded-lg flex flex-col gap-1 px-2 pt-2 transition-transform duration-200 group-hover:-translate-y-1 ${
          hasUnread ? 'animate-bell-ring' : ''
        }`}
        style={{
          background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 55%, #1A3BB0 100%)',
          boxShadow: '0 4px 10px rgba(46,93,230,0.5), inset 0 1px 1px rgba(230,237,253,0.65)',
          border: '1px solid rgba(230,237,253,0.45)',
        }}
      >
        <span className="h-[2.5px] w-full rounded-full bg-[#E6EDFD]" />
        <span className="h-[2.5px] w-[85%] rounded-full bg-[#E6EDFD]/90" />
        <span className="h-[2.5px] w-[60%] rounded-full bg-[#AFC5F8]/85" />
      </div>

      {/* Front frosted glassmorphism envelope pocket */}
      <div
        className="absolute bottom-0.5 w-[86%] h-[54%] rounded-xl overflow-hidden"
        style={{
          background:
            'linear-gradient(160deg, rgba(230,237,253,0.36) 0%, rgba(175,197,248,0.22) 50%, rgba(110,146,242,0.28) 100%)',
          border: '1px solid rgba(230,237,253,0.5)',
          boxShadow:
            '0 6px 14px rgba(7,16,57,0.45), inset 0 2px 3px rgba(230,237,253,0.45), inset 0 -2px 4px rgba(15,34,112,0.35)',
        }}
      >
        {/* Subtle V-cut light refraction line on envelope pocket */}
        <div
          className="w-full h-2.5 opacity-60"
          style={{
            background:
              'linear-gradient(180deg, rgba(230,237,253,0.45) 0%, rgba(230,237,253,0) 100%)',
          }}
        />
      </div>
    </div>
  );
};

/**
 * Replicates ref2.jpg (Row 2, Col 1):
 * Overlapping dual chat bubbles with vivid back bubble and frosted glass front bubble with 3 dots.
 */
export const GlassChatBubbleIcon: React.FC<IconProps> = ({ className = 'w-12 h-12' }) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Back vivid Ultramarine chat bubble */}
      <div
        className="absolute left-1 top-1.5 w-[66%] h-[58%] rounded-2xl rounded-bl-sm transition-transform duration-200 group-hover:-translate-x-0.5 group-hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 65%, #1A3BB0 100%)',
          boxShadow: '0 6px 14px rgba(46,93,230,0.55)',
          border: '1px solid rgba(175,197,248,0.45)',
        }}
      />

      {/* Front frosted glass chat bubble */}
      <div
        className="absolute right-1 bottom-1.5 w-[72%] h-[62%] rounded-2xl rounded-br-sm flex items-center justify-center gap-1.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:translate-y-0.5"
        style={{
          background:
            'linear-gradient(135deg, rgba(230,237,253,0.38) 0%, rgba(175,197,248,0.22) 55%, rgba(46,93,230,0.26) 100%)',
          border: '1px solid rgba(230,237,253,0.55)',
          boxShadow:
            '0 8px 18px rgba(7,16,57,0.45), inset 0 1.5px 2px rgba(230,237,253,0.55)',
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#E6EDFD] shadow-[0_0_6px_#E6EDFD]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#E6EDFD] shadow-[0_0_6px_#E6EDFD]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#E6EDFD] shadow-[0_0_6px_#E6EDFD]" />
      </div>
    </div>
  );
};

/**
 * Replicates ref2.jpg (Row 5, Col 2):
 * Frosted glass horizontal pill overlapping a vivid Ultramarine magnifying glass ring.
 */
export const GlassSearchIcon: React.FC<IconProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Vivid magnifying glass on the right */}
      <div
        className="absolute right-1 top-1.5 w-5 h-5 rounded-full border-[3px] border-[#2E5DE6] shadow-[0_0_12px_rgba(46,93,230,0.65)]"
        style={{ background: 'rgba(46,93,230,0.18)' }}
      >
        <span
          className="absolute -bottom-2 -right-1.5 w-2.5 h-[3.5px] rounded-full bg-[#2E5DE6] rotate-45"
        />
      </div>

      {/* Frosted glass pill overlapping the left side */}
      <div
        className="absolute left-0.5 bottom-2 w-6 h-3.5 rounded-md flex items-center justify-center gap-0.5 px-1"
        style={{
          background:
            'linear-gradient(135deg, rgba(230,237,253,0.45) 0%, rgba(175,197,248,0.22) 100%)',
          border: '1px solid rgba(230,237,253,0.55)',
          boxShadow: '0 4px 10px rgba(7,16,57,0.4)',
        }}
      >
        <span className="w-1 h-1 rounded-full bg-[#E6EDFD]" />
        <span className="w-1 h-1 rounded-full bg-[#E6EDFD]/85" />
        <span className="w-1 h-1 rounded-full bg-[#E6EDFD]/70" />
      </div>
    </div>
  );
};

/**
 * Replicates ref2.jpg (Row 4, Col 2):
 * Overlapping vivid back play triangle and frosted glass front play triangle.
 */
export const GlassPlayIcon: React.FC<IconProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Back vivid triangle */}
      <svg
        viewBox="0 0 36 36"
        className="absolute left-0.5 w-7 h-7"
      >
        <defs>
          <linearGradient id="playBackGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6E92F2" />
            <stop offset="100%" stopColor="#1A3BB0" />
          </linearGradient>
        </defs>
        <path
          d="M8 6 C8 4 10 3 12 4.2 L28 14.2 C30 15.4 30 18.6 28 19.8 L12 29.8 C10 31 8 30 8 28 Z"
          fill="url(#playBackGrad)"
        />
      </svg>

      {/* Front frosted glass triangle */}
      <div
        className="relative translate-x-1.5 w-6 h-6 rounded-lg flex items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, rgba(230,237,253,0.44) 0%, rgba(175,197,248,0.22) 100%)',
          border: '1px solid rgba(230,237,253,0.55)',
          boxShadow: '0 6px 14px rgba(7,16,57,0.4), inset 0 1px 2px rgba(230,237,253,0.55)',
          clipPath: 'polygon(18% 10%, 92% 50%, 18% 90%)',
        }}
      />
    </div>
  );
};

/**
 * Replicates ref2.jpg (Row 1, Col 3):
 * Vivid back document sheet overlapped by frosted glass front document with lines.
 */
export const GlassDocsIcon: React.FC<IconProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Back vivid sheet */}
      <div
        className="absolute right-1 top-1 w-6 h-7 rounded-lg"
        style={{
          background: 'linear-gradient(145deg, #6E92F2 0%, #2E5DE6 100%)',
          boxShadow: '0 4px 12px rgba(46,93,230,0.55)',
        }}
      />
      {/* Front frosted glass sheet */}
      <div
        className="absolute left-1 bottom-1 w-6 h-7 rounded-lg flex flex-col justify-center gap-1 px-1.5"
        style={{
          background:
            'linear-gradient(145deg, rgba(230,237,253,0.42) 0%, rgba(175,197,248,0.22) 100%)',
          border: '1px solid rgba(230,237,253,0.55)',
          boxShadow: '0 6px 14px rgba(7,16,57,0.4), inset 0 1px 1px rgba(230,237,253,0.55)',
        }}
      >
        <span className="h-[2px] w-full rounded-full bg-[#E6EDFD]" />
        <span className="h-[2px] w-full rounded-full bg-[#E6EDFD]/90" />
        <span className="h-[2px] w-full rounded-full bg-[#E6EDFD]/80" />
        <span className="h-[2px] w-[60%] rounded-full bg-[#AFC5F8]" />
      </div>
    </div>
  );
};

/**
 * Replicates ref2.jpg (Row 5, Col 3):
 * Shield with frosted glass circular checkmark badge overlapping the side.
 */
export const GlassShieldIcon: React.FC<IconProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Vivid shield */}
      <svg
        viewBox="0 0 36 36"
        className="w-7 h-7 translate-x-1"
      >
        <defs>
          <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6E92F2" />
            <stop offset="100%" stopColor="#1A3BB0" />
          </linearGradient>
        </defs>
        <path
          d="M18 3 L30 8 V17 C30 25.5 24.8 31.2 18 33.5 C11.2 31.2 6 25.5 6 17 V8 Z"
          fill="url(#shieldGrad)"
        />
      </svg>
      {/* Frosted glass checkmark badge */}
      <div
        className="absolute left-0.5 bottom-1.5 w-5 h-5 rounded-full flex items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, rgba(230,237,253,0.48) 0%, rgba(175,197,248,0.25) 100%)',
          border: '1px solid rgba(230,237,253,0.65)',
          boxShadow: '0 4px 10px rgba(7,16,57,0.45)',
        }}
      >
        <svg viewBox="0 0 16 16" className="w-3 h-3 text-[#E6EDFD]">
          <path
            d="M3.5 8.5 L6.5 11.5 L12.5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

/**
 * Replicates ref2.jpg (Row 6, Col 1):
 * Star medallion with vivid back ribbon and frosted glass circular front.
 */
export const GlassMedalIcon: React.FC<IconProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Back ribbon tails */}
      <div
        className="absolute bottom-0.5 w-4 h-4 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #2E5DE6 0%, #6E92F2 100%)',
          clipPath: 'polygon(0 0, 100% 0, 100% 100%, 50% 72%, 0 100%)',
        }}
      />
      {/* Frosted glass circular medallion */}
      <div
        className="relative -translate-y-1 w-6 h-6 rounded-full flex items-center justify-center"
        style={{
          background:
            'linear-gradient(135deg, rgba(230,237,253,0.46) 0%, rgba(110,146,242,0.28) 100%)',
          border: '1px solid rgba(230,237,253,0.6)',
          boxShadow: '0 4px 12px rgba(46,93,230,0.45), inset 0 1px 2px rgba(230,237,253,0.55)',
        }}
      >
        <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 text-[#E6EDFD] fill-current">
          <path d="M10 2.5 L12.2 7.1 L17.2 7.8 L13.6 11.3 L14.5 16.3 L10 13.9 L5.5 16.3 L6.4 11.3 L2.8 7.8 L7.8 7.1 Z" />
        </svg>
      </div>
    </div>
  );
};

/**
 * Replicates ref2.jpg (Row 6, Col 3):
 * Stream camera body with frosted glass equalizer pill on the left.
 */
export const GlassStreamIcon: React.FC<IconProps> = ({ className = 'w-11 h-11' }) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Vivid camera body + lens on right */}
      <div
        className="absolute right-2.5 w-4 h-5 rounded-md"
        style={{
          background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
          boxShadow: '0 4px 12px rgba(46,93,230,0.55)',
        }}
      />
      <div
        className="absolute right-0.5 w-2.5 h-3.5 rounded-sm"
        style={{
          background: 'linear-gradient(135deg, #AFC5F8 0%, #6E92F2 100%)',
          clipPath: 'polygon(0 30%, 100% 0, 100% 100%, 0 70%)',
        }}
      />
      {/* Front frosted glass pill on left */}
      <div
        className="absolute left-1 w-5 h-7 rounded-lg flex flex-col justify-center gap-1 px-1"
        style={{
          background:
            'linear-gradient(145deg, rgba(230,237,253,0.45) 0%, rgba(175,197,248,0.22) 100%)',
          border: '1px solid rgba(230,237,253,0.58)',
          boxShadow: '0 6px 14px rgba(7,16,57,0.45)',
        }}
      >
        <span className="h-[2.5px] w-full rounded-full bg-[#E6EDFD]" />
        <span className="h-[2.5px] w-full rounded-full bg-[#E6EDFD]/90" />
        <span className="h-[2.5px] w-full rounded-full bg-[#E6EDFD]/85" />
        <span className="h-[2.5px] w-full rounded-full bg-[#AFC5F8]" />
      </div>
    </div>
  );
};

/**
 * 3D Dual-Layer Folder Glass Icon for Subject Folders & View Toggles
 */
export const GlassFolderIcon: React.FC<IconProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <div className={`relative select-none flex items-center justify-center ${className}`}>
      {/* Vivid folder back with tab */}
      <div
        className="absolute top-1.5 inset-x-1 bottom-2 rounded-lg"
        style={{
          background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 65%, #1A3BB0 100%)',
          boxShadow: '0 4px 12px rgba(46,93,230,0.5)',
          clipPath: 'polygon(0 18%, 38% 18%, 48% 0, 100% 0, 100% 100%, 0 100%)',
        }}
      />
      {/* Inner white document slip */}
      <div
        className="absolute top-2.5 inset-x-2.5 h-3 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #E6EDFD 0%, #AFC5F8 100%)',
        }}
      />
      {/* Frosted glass front pocket */}
      <div
        className="absolute bottom-1 inset-x-1 h-[54%] rounded-lg"
        style={{
          background:
            'linear-gradient(145deg, rgba(230,237,253,0.46) 0%, rgba(110,146,242,0.3) 100%)',
          border: '1px solid rgba(230,237,253,0.62)',
          boxShadow: '0 4px 10px rgba(7,16,57,0.45), inset 0 1px 2px rgba(230,237,253,0.5)',
        }}
      />
    </div>
  );
};
