import React from 'react';
import { ArrowRight, Check, Plus, Sparkles } from 'lucide-react';
import { BatchItem } from '../data/batches';

interface BatchGlassCardProps {
  batch: BatchItem;
  index: number;
  isEnrolled: boolean;
  onOpenBatch: (id: string) => void;
  onToggleEnroll: (e: React.MouseEvent, id: string) => void;
}

export const BatchGlassCard = React.memo(function BatchGlassCard({
  batch,
  index,
  isEnrolled,
  onOpenBatch,
  onToggleEnroll,
}: BatchGlassCardProps) {
  const id = String(batch.id);
  const isNewSession = batch.title.includes('26-27') || batch.title.includes('2026');

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
      className="group relative pt-2.5 select-none transition-ui duration-200 ease-out hover:-translate-y-2 cursor-pointer text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6E92F2] rounded-[24px] animate-pop-in flex flex-col"
    >
      {/* Tilted Vivid Ultramarine Back Plate peeking behind the Frosted Glass Front */}
      <div
        className="pointer-events-none absolute top-0 left-4 right-5 h-10 rounded-t-2xl transition-transform duration-200 group-hover:-translate-y-0.5"
        style={{
          transform: index % 2 === 0 ? 'rotate(-1.3deg)' : 'rotate(1.3deg)',
          background: 'linear-gradient(90deg, #2E5DE6 0%, #6E92F2 50%, #1A3BB0 100%)',
          border: '1px solid rgba(230,237,253,0.48)',
          boxShadow: '0 8px 20px rgba(46,93,230,0.45)',
        }}
      />

      {/* Front Frosted Glass Card Shell */}
      <div
        className="relative z-10 rounded-[22px] overflow-hidden flex flex-col flex-1 p-3"
        style={{
          background:
            'linear-gradient(155deg, rgba(175,197,248,0.28) 0%, rgba(110,146,242,0.20) 45%, rgba(15,34,112,0.82) 100%)',
          backdropFilter: 'var(--glass-folder-filter)',
          WebkitBackdropFilter: 'var(--glass-folder-filter)',
          borderTop: '1.5px solid rgba(230,237,253,0.65)',
          borderLeft: '1px solid rgba(230,237,253,0.4)',
          borderRight: '1px solid rgba(175,197,248,0.28)',
          borderBottom: '1.5px solid rgba(7,16,57,0.88)',
          boxShadow:
            '0 18px 36px -10px rgba(7,16,57,0.85), 0 0 24px rgba(46,93,230,0.28), inset 0 1.5px 2px rgba(230,237,253,0.45)',
        }}
      >
        {/* Animated diagonal sheen on hover */}
        <div
          className="desktop-sheen pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out z-20"
          style={{
            background:
              'linear-gradient(105deg, transparent 20%, rgba(230,237,253,0.22) 50%, transparent 80%)',
          }}
        />

        {/* Thumbnail Frame */}
        <div
          className="relative w-full aspect-[16/9] rounded-[16px] overflow-hidden bg-[#071039] mb-3"
          style={{
            border: '1.5px solid rgba(230,237,253,0.45)',
            boxShadow: '0 8px 20px -4px rgba(7,16,57,0.7)',
          }}
        >
          <img
            src={batch.thumbnail}
            alt={batch.title}
            loading={index < 4 ? 'eager' : 'lazy'}
            decoding="async"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src =
                'https://placehold.co/600x400/0F2270/E6EDFD?text=MIND+SPARK';
            }}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Session Tag Pill */}
          <div className="absolute top-2 left-2 z-10">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#E6EDFD]"
              style={{
                background: 'rgba(7, 16, 57, 0.78)',
                border: '1px solid rgba(230,237,253,0.4)',
                backdropFilter: 'blur(6px)',
              }}
            >
              {isNewSession ? '2026–27' : 'Batch'}
            </span>
          </div>

          {/* Free Frosted Pill */}
          <div className="absolute top-2 right-2 z-10">
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#E6EDFD]"
              style={{
                background: 'linear-gradient(135deg, #2E5DE6 0%, #6E92F2 100%)',
                border: '1px solid rgba(230,237,253,0.65)',
                boxShadow: '0 4px 12px rgba(46,93,230,0.6)',
              }}
            >
              <Sparkles className="w-2.5 h-2.5" />
              FREE
            </span>
          </div>
        </div>

        {/* Batch Title & Actions */}
        <div className="flex-1 flex flex-col justify-between px-1 pt-0.5">
          <h3 className="font-display font-bold text-sm sm:text-[15px] leading-snug text-[#E6EDFD] line-clamp-2 group-hover:text-white transition-colors mb-3">
            {batch.title}
          </h3>

          <div className="pt-2.5 border-t border-[#AFC5F8]/20 flex items-center justify-between gap-2 mt-auto">
            <button
              type="button"
              onClick={(e) => onToggleEnroll(e, id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-ui cursor-pointer active:scale-95"
              style={{
                background: isEnrolled
                  ? 'linear-gradient(135deg, rgba(110,146,242,0.42) 0%, rgba(46,93,230,0.65) 100%)'
                  : 'rgba(7, 16, 57, 0.45)',
                border: isEnrolled
                  ? '1px solid rgba(230,237,253,0.7)'
                  : '1px solid rgba(175,197,248,0.3)',
                color: '#E6EDFD',
              }}
            >
              {isEnrolled ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#E6EDFD]" strokeWidth={2.6} />
                  <span>Enrolled</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5 text-[#AFC5F8]" strokeWidth={2.4} />
                  <span>Enroll</span>
                </>
              )}
            </button>

            <span
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#E6EDFD] transition-ui group-hover:translate-x-0.5"
              style={{
                background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
                border: '1px solid rgba(230,237,253,0.55)',
                boxShadow: '0 6px 16px rgba(46,93,230,0.5)',
              }}
            >
              <span>Explore</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
