import { useState } from 'react';
import { Heart, X, CheckCircle2, Palette, ChevronDown, ChevronUp } from 'lucide-react';
import { GlassChatBubbleIcon } from './GlassIcons3D';
import type { NotificationItem } from '../types/notifications';

export const CUSTOM_COLOURS = [
  { name: 'Purple', value: '#a855f7' },
  { name: 'Violet', value: '#7542df' },
  { name: 'Pink', value: '#ed49bb' },
  { name: 'Orange', value: '#ed7b18' },
  { name: 'Turquoise', value: '#06b5ab' },
  { name: 'Magenta', value: '#ce36c8' },
] as const;

export type PaletteChoice = 'blue' | 'red' | 'green' | 'custom';
export type CardStyleChoice = 'folder' | 'card';

interface NotificationsDrawerProps {
  isVisible: boolean;
  isLoading: boolean;
  messages: NotificationItem[];
  errorMsg: string;
  isLiking: boolean;
  onClose: () => void;
  onRefresh: () => void;
  onToggleLike: (item: NotificationItem) => Promise<void>;
  palette: PaletteChoice;
  onChoosePalette: (choice: PaletteChoice) => void;
  customColour: string;
  onChangeCustomColour: (colour: string) => void;
  cardStyle: CardStyleChoice;
  onChooseCardStyle: (style: CardStyleChoice) => void;
}

const formatTime = (ts: number) => {
  if (!ts) return 'Just now';
  try {
    return new Date(ts).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Just now';
  }
};

export default function NotificationsDrawer({
  isVisible,
  isLoading,
  messages,
  errorMsg,
  isLiking,
  onClose,
  onRefresh,
  onToggleLike,
  palette,
  onChoosePalette,
  customColour,
  onChangeCustomColour,
  cardStyle,
  onChooseCardStyle,
}: NotificationsDrawerProps) {
  const visible = isVisible;
  const [showThemePanel, setShowThemePanel] = useState(true);

  return (
    <div
      id="inbox-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="updates-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className={`drawer-overlay fixed inset-0 z-[60] flex justify-end p-0 sm:p-4 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        background: 'rgba(7, 16, 57, 0.68)',
        backdropFilter: 'var(--glass-overlay-filter)',
        WebkitBackdropFilter: 'var(--glass-overlay-filter)',
      }}
    >
      <div
        id="inbox-content"
        className={`drawer-panel relative w-full sm:w-[430px] h-full sm:rounded-[28px] overflow-hidden flex flex-col ${
          visible ? 'translate-x-0 scale-100' : 'translate-x-full sm:scale-95'
        }`}
        style={{
          background:
            'linear-gradient(165deg, rgba(15,34,112,0.88) 0%, rgba(7,16,57,0.95) 60%, rgba(7,16,57,0.98) 100%)',
          border: '1.5px solid rgba(175,197,248,0.35)',
          boxShadow:
            '-20px 0 60px rgba(7,16,57,0.9), 0 0 40px rgba(46,93,230,0.28), inset 0 1.5px 2px rgba(230,237,253,0.35)',
        }}
      >
        {/* Ambient decorative Ultramarine orb inside drawer */}
        <div
          className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(46,93,230,0.38) 0%, transparent 72%)' }}
        />
        <div
          className="pointer-events-none absolute bottom-10 -left-20 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(110,146,242,0.22) 0%, transparent 72%)' }}
        />

        {/* Drawer Header with Dual-Layer Frosted Glass */}
        <div
          className="relative z-10 p-5 flex items-center justify-between"
          style={{
            background:
              'linear-gradient(180deg, rgba(175,197,248,0.16) 0%, rgba(26,59,176,0.12) 100%)',
            borderBottom: '1px solid rgba(175,197,248,0.22)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <GlassChatBubbleIcon className="w-12 h-12" />
            <div>
              <div className="flex items-center gap-2">
                <h2 id="updates-title" className="text-[#E6EDFD] font-display font-bold text-lg tracking-tight">
                  Updates & Style
                </h2>
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-[#E6EDFD]"
                  style={{
                    background: 'rgba(46,93,230,0.45)',
                    border: '1px solid rgba(175,197,248,0.4)',
                  }}
                >
                  Live
                </span>
              </div>
              <p className="text-[11px] text-[#AFC5F8] mt-0.5">
                Announcements & Colour Customisation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowThemePanel((v) => !v)}
              aria-label="Toggle colour customisation"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#E6EDFD] hover:bg-[#E6EDFD]/15 transition-colors cursor-pointer"
              style={{
                background: 'rgba(46,93,230,0.35)',
                border: '1px solid rgba(230,237,253,0.35)',
              }}
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Theme</span>
              {showThemePanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Inbox"
              className="p-2 rounded-full text-[#AFC5F8] hover:text-[#E6EDFD] hover:bg-[#E6EDFD]/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages & Customisation Container */}
        <div
          id="messages-container"
          className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar"
        >
          {/* Integrated Colour Palette & Layout Customisation Card inside Notification Drawer */}
          {showThemePanel && (
            <div
              className="relative rounded-[22px] p-4 overflow-hidden animate-pop-in"
              style={{
                background: 'var(--notification-card-background)',
                backdropFilter: 'var(--glass-soft-filter)',
                WebkitBackdropFilter: 'var(--glass-soft-filter)',
                borderTop: '1.5px solid rgba(230,237,253,0.58)',
                borderLeft: '1px solid rgba(230,237,253,0.35)',
                borderRight: '1px solid rgba(175,197,248,0.25)',
                borderBottom: '1.5px solid rgba(7,16,57,0.8)',
                boxShadow: '0 14px 30px -8px rgba(7,16,57,0.7), inset 0 1.5px 2px rgba(230,237,253,0.35)',
              }}
            >
              <div className="palette-switch mb-3.5">
                <p className="text-xs font-bold text-[#E6EDFD] mb-2 flex items-center justify-between">
                  <span>Colour Palette</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#AFC5F8]">
                    Gradient Glass
                  </span>
                </p>
                <div
                  role="group"
                  aria-label="Choose colour palette"
                  className="grid grid-cols-4 gap-1 p-1 rounded-2xl border border-white/30 bg-black/30"
                >
                  {(['blue', 'red', 'green', 'custom'] as const).map((colour) => (
                    <button
                      key={colour}
                      type="button"
                      aria-pressed={palette === colour}
                      onClick={() => onChoosePalette(colour)}
                      className={`flex justify-center items-center gap-1.5 px-2 py-2 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                        palette === colour ? 'bg-white text-black shadow-sm' : 'text-white hover:bg-white/10'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="w-3 h-3 rounded-full shrink-0 border border-white/40"
                        style={{
                          backgroundColor:
                            colour === 'blue'
                              ? '#2E5DE6'
                              : colour === 'red'
                              ? '#d00018'
                              : colour === 'green'
                              ? '#98BF0A'
                              : customColour,
                        }}
                      />
                      <span className="truncate">
                        {colour === 'blue'
                          ? 'Blue'
                          : colour === 'red'
                          ? 'Red'
                          : colour === 'green'
                          ? 'Green'
                          : 'Custom'}
                      </span>
                    </button>
                  ))}
                </div>

                {palette === 'custom' && (
                  <div className="mt-3 rounded-xl border border-white/25 bg-black/25 px-3 py-2.5">
                    <p className="mb-2 text-[11px] font-semibold text-white">Choose custom shade</p>
                    <div role="group" aria-label="Choose custom colour" className="grid grid-cols-6 gap-1.5">
                      {CUSTOM_COLOURS.map((colour) => (
                        <button
                          key={colour.value}
                          type="button"
                          aria-pressed={customColour === colour.value}
                          onClick={() => onChangeCustomColour(colour.value)}
                          className={`flex flex-col items-center gap-1 rounded-lg p-1.5 text-[9px] font-semibold text-white cursor-pointer ${
                            customColour === colour.value ? 'bg-white/20' : 'hover:bg-white/10'
                          }`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-6 w-6 rounded-full border-2 ${
                              customColour === colour.value ? 'border-white scale-110' : 'border-white/30'
                            }`}
                            style={{ backgroundColor: colour.value }}
                          />
                          <span className="truncate max-w-full">{colour.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-[#AFC5F8] mb-2">Batch Display Style</p>
                <div
                  role="group"
                  aria-label="Choose batch display style"
                  className="flex gap-1 p-1 rounded-full border border-[#AFC5F8]/30 bg-[#0F2270]/70"
                >
                  {(['folder', 'card'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={cardStyle === style}
                      onClick={() => onChooseCardStyle(style)}
                      className={`flex-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        cardStyle === style
                          ? 'bg-[#6E92F2] text-[#071039]'
                          : 'text-[#E6EDFD] hover:bg-white/10'
                      }`}
                    >
                      {style === 'folder' ? '3D Folders' : 'Glass Cards'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {errorMsg && (
            <div
              role="alert"
              className="rounded-2xl p-3.5 text-sm text-[#E6EDFD] flex items-center justify-between"
              style={{
                background: 'rgba(46,93,230,0.25)',
                border: '1px solid rgba(175,197,248,0.4)',
              }}
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={onRefresh}
                className="underline font-semibold ml-2 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {isLoading && messages.length === 0 ? (
            <div id="loading-indicator" className="flex flex-col gap-4">
              <div className="w-full h-36 rounded-3xl bg-[#1A3BB0]/30 border border-[#6E92F2]/25 animate-pulse" />
              <div className="w-full h-28 rounded-3xl bg-[#1A3BB0]/20 border border-[#6E92F2]/20 animate-pulse" />
            </div>
          ) : (
            messages.map((msg, index) => {
              const isLiked = msg.liked;
              return (
                <div
                  key={msg.id}
                  className="group relative pt-3 transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {/* BACK LAYER OF THE DUAL-GLASS CARD */}
                  <div
                    className="pointer-events-none absolute top-0 left-3 right-6 h-10 rounded-t-2xl transition-transform duration-200 group-hover:-translate-y-0.5"
                    style={{
                      transform: index % 2 === 0 ? 'rotate(-1.2deg)' : 'rotate(1.2deg)',
                      background:
                        'linear-gradient(90deg, #2E5DE6 0%, #6E92F2 55%, #1A3BB0 100%)',
                      boxShadow: '0 4px 16px rgba(46,93,230,0.45)',
                      border: '1px solid rgba(230,237,253,0.45)',
                    }}
                  />

                  {/* FRONT LAYER: FROSTED GLASSMORPHISM POCKET CARD */}
                  <div
                    className="relative z-10 rounded-[22px] p-4 sm:p-5 overflow-hidden"
                    style={{
                      background: 'var(--notification-card-background)',
                      backdropFilter: 'var(--glass-soft-filter)',
                      WebkitBackdropFilter: 'var(--glass-soft-filter)',
                      borderTop: '1.5px solid rgba(230,237,253,0.55)',
                      borderLeft: '1px solid rgba(230,237,253,0.35)',
                      borderRight: '1px solid rgba(175,197,248,0.25)',
                      borderBottom: '1.5px solid rgba(7,16,57,0.8)',
                      boxShadow:
                        '0 14px 30px -8px rgba(7,16,57,0.7), inset 0 1.5px 2px rgba(230,237,253,0.35)',
                    }}
                  >
                    {/* Admin Identity Row */}
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-display font-bold text-xs text-[#E6EDFD]"
                        style={{
                          background: 'linear-gradient(135deg, #2E5DE6 0%, #1A3BB0 100%)',
                          border: '1px solid rgba(230,237,253,0.5)',
                          boxShadow: '0 4px 10px rgba(46,93,230,0.45)',
                        }}
                      >
                        MS
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#AFC5F8] font-bold text-xs tracking-wider uppercase">
                            Mr Sad · Admin
                          </span>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#6E92F2] shrink-0" />
                        </div>
                        <time className="block mt-0.5 text-[10px] sm:text-[11px] font-medium text-[#AFC5F8]">
                          {formatTime(msg.createdAt)}
                        </time>
                      </div>
                    </div>

                    {msg.title && (
                      <h3 className="text-[#E6EDFD] font-display font-bold text-[15px] mb-1.5 leading-snug">
                        {msg.title}
                      </h3>
                    )}

                    <p className="text-[#E6EDFD]/85 text-[13.5px] leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>

                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Image attached to notification"
                        loading="lazy"
                        decoding="async"
                        className="notification-image mt-3 max-h-72 w-full rounded-2xl border border-[#AFC5F8]/25 object-cover"
                      />
                    )}

                    {/* Like Button Footer */}
                    <div className="mt-4 pt-3 border-t border-[#AFC5F8]/18 flex items-center justify-end">
                      <button
                        type="button"
                        disabled={isLiking}
                        aria-pressed={isLiked}
                        onClick={() => onToggleLike(msg)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-ui duration-150 cursor-pointer active:scale-95 disabled:opacity-60"
                        style={{
                          background: isLiked
                            ? 'linear-gradient(135deg, #2E5DE6 0%, #6E92F2 100%)'
                            : 'rgba(7, 16, 57, 0.45)',
                          border: isLiked
                            ? '1px solid rgba(230,237,253,0.75)'
                            : '1px solid rgba(175,197,248,0.28)',
                          color: '#E6EDFD',
                          boxShadow: isLiked ? '0 4px 14px rgba(46,93,230,0.55)' : 'none',
                        }}
                      >
                        <Heart
                          className={`w-3.5 h-3.5 transition-transform ${
                            isLiked ? 'fill-[#E6EDFD] text-[#E6EDFD] scale-110' : 'text-[#AFC5F8]'
                          }`}
                        />
                        <span>{msg.likes}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
