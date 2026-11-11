import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  FolderOpen,
  History,
  LayoutGrid,
  Loader2,
  Menu,
  Sparkles,
  X,
} from 'lucide-react';
import { BatchItem, INITIAL_BATCHES_DATA } from './data/batches';
import { fetchBatchesList } from './services/studybeeApi';
import { BatchContentView } from './components/BatchContentView';
import { VideoPlayerView, ActiveVideoParams } from './components/VideoPlayerView';
import { PdfViewerModal } from './components/PdfViewerModal';
import { VerificationGate, hasActiveVerification } from './components/VerificationGate';
import { NotificationsCenter } from './components/NotificationsCenter';
import {
  CUSTOM_COLOURS,
  PaletteChoice,
  CardStyleChoice,
} from './components/NotificationsDrawer';
import { BatchFolderCard } from './components/BatchFolderCard';
import { BatchGlassCard } from './components/BatchGlassCard';
import {
  GlassChatBubbleIcon,
  GlassFolderIcon,
  GlassSearchIcon,
} from './components/GlassIcons3D';

const VERIFICATION_ENABLED = false;
const ITEMS_PER_PAGE = 12;

function colourHue(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    delta = max - min;
  if (delta === 0) return 220;
  const h =
    max === r
      ? ((g - b) / delta) % 6
      : max === g
      ? (b - r) / delta + 2
      : (r - g) / delta + 4;
  return (h * 60 + 360) % 360;
}

export function App() {
  // ============================================================
  // 1. STATIC-PAGE COLOUR PALETTE & DISPLAY STYLE STATE
  // ============================================================
  const [palette, setPalette] = useState<PaletteChoice>(() => {
    try {
      const saved = localStorage.getItem('mindspark-palette');
      return saved === 'red' || saved === 'green' || saved === 'custom' ? saved : 'blue';
    } catch {
      return 'blue';
    }
  });

  const [customColour, setCustomColour] = useState(() => {
    try {
      const saved = localStorage.getItem('mindspark-custom-colour');
      return CUSTOM_COLOURS.some((colour) => colour.value === saved?.toLowerCase())
        ? saved!.toLowerCase()
        : '#a855f7';
    } catch {
      return '#a855f7';
    }
  });

  const changeCustomColour = (colour: string) => {
    setCustomColour(colour);
    try {
      localStorage.setItem('mindspark-custom-colour', colour);
    } catch {
      // ignore storage errors
    }
  };

  const choosePalette = (choice: PaletteChoice) => {
    setPalette(choice);
    try {
      localStorage.setItem('mindspark-palette', choice);
    } catch {
      // ignore storage errors
    }
  };

  const [cardStyle, setCardStyle] = useState<CardStyleChoice>(() => {
    try {
      return localStorage.getItem('mindspark-platform-style') === 'card' ? 'card' : 'folder';
    } catch {
      return 'folder';
    }
  });

  const chooseCardStyle = (style: CardStyleChoice) => {
    setCardStyle(style);
    try {
      localStorage.setItem('mindspark-platform-style', style);
    } catch {
      // ignore storage errors
    }
  };

  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const customizeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCustomizeOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!customizeRef.current?.contains(event.target as Node)) {
        setIsCustomizeOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsCustomizeOpen(false);
        customizeRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isCustomizeOpen]);

  const hueShift = colourHue(customColour) - 220;
  const customStyle = {
    '--custom-colour': customColour,
    '--custom-hue-shift': `${hueShift}deg`,
    '--custom-hue-reverse': `${-hueShift}deg`,
  } as CSSProperties;

  // ============================================================
  // 2. LECTURE-SITE BATCH & COURSE STATE
  // ============================================================
  const [allBatches, setAllBatches] = useState<BatchItem[]>(INITIAL_BATCHES_DATA.new);
  const [oldBatches, setOldBatches] = useState<BatchItem[]>(() =>
    INITIAL_BATCHES_DATA.new.filter((b) => b.title.includes('2025-26') || Number(b.id) < 100)
  );
  const [loadingBatches, setLoadingBatches] = useState(false);

  const [currentTab, setCurrentTab] = useState<'new' | 'wishlist' | 'old'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('studybee_wishlist') || '[]');
      return Array.isArray(saved) ? saved.map(String) : [];
    } catch {
      return [];
    }
  });

  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id') || null;
  });

  const [activeVideo, setActiveVideo] = useState<ActiveVideoParams | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const cId = params.get('courseId');
    const contId = params.get('contentId');
    if (cId && contId) {
      return {
        courseId: cId,
        contentId: contId,
        vdcId: params.get('vdc_id') || undefined,
        ytUrl: params.get('yt_url') || undefined,
      };
    }
    return null;
  });

  const [activePdf, setActivePdf] = useState<{
    courseId: string;
    contentId: string;
    title: string;
    directUrl?: string;
  } | null>(null);
  const [verified, setVerified] = useState(() => hasActiveVerification());

  useEffect(() => {
    let mounted = true;
    fetchBatchesList().then(({ all, oldOnly }) => {
      if (!mounted) return;
      if (all.length > 0) {
        setAllBatches(all);
        setOldBatches(oldOnly);
      }
      setLoadingBatches(false);
    });

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      const cId = params.get('courseId');
      const contId = params.get('contentId');
      if (cId && contId) {
        setActiveVideo({
          courseId: cId,
          contentId: contId,
          vdcId: params.get('vdc_id') || undefined,
          ytUrl: params.get('yt_url') || undefined,
        });
      } else {
        setActiveVideo(null);
        setSelectedBatchId(id || null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      mounted = false;
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    window.setTimeout(() => {
      setToast((prev) => (prev?.msg === msg ? null : prev));
    }, 3000);
  };

  const toggleEnroll = (e: React.MouseEvent, batchId: string) => {
    e.stopPropagation();
    const id = String(batchId);
    setWishlist((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem('studybee_wishlist', JSON.stringify(next));
      if (!exists) {
        showToast('Enrolled in batch! Saved to My Enrolled.', 'success');
      } else {
        showToast('Removed from My Enrolled.', 'success');
      }
      return next;
    });
  };

  const handleOpenBatch = (batchId: string) => {
    if (VERIFICATION_ENABLED && !hasActiveVerification()) {
      setVerified(false);
      setSelectedBatchId(String(batchId));
      return;
    }
    const id = String(batchId);
    setSelectedBatchId(id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('id', id);
      window.history.pushState({ batchId: id }, '', url.toString());
    } catch {
      // ignore history error in sandboxed iframes
    }
  };

  const handleBackToHome = () => {
    setSelectedBatchId(null);
    setActiveVideo(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('id');
      url.searchParams.delete('courseId');
      url.searchParams.delete('contentId');
      url.searchParams.delete('vdc_id');
      url.searchParams.delete('yt_url');
      window.history.pushState({}, '', url.toString());
    } catch {
      // ignore
    }
  };

  const switchTab = (tabName: 'new' | 'wishlist' | 'old') => {
    setCurrentTab(tabName);
    setSearchQuery('');
    setDisplayedCount(ITEMS_PER_PAGE);
  };

  const filteredBatches = useMemo(() => {
    let baseList: BatchItem[] = [];
    if (currentTab === 'wishlist') {
      const uniqueBatches = Array.from(
        new Map(allBatches.map((item) => [String(item.id), item])).values()
      );
      baseList = uniqueBatches.filter((batch) => wishlist.includes(String(batch.id)));
    } else if (currentTab === 'old') {
      baseList = oldBatches;
    } else {
      baseList = allBatches;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return baseList;
    return baseList.filter(
      (batch) => batch.title.toLowerCase().includes(q) || String(batch.id).includes(q)
    );
  }, [allBatches, oldBatches, currentTab, wishlist, searchQuery]);

  const visibleBatches = useMemo(
    () => filteredBatches.slice(0, displayedCount),
    [filteredBatches, displayedCount]
  );

  const handleLoadMore = () => {
    if (loadingMore) return;
    setLoadingMore(true);
    window.setTimeout(() => {
      setDisplayedCount((prev) => prev + ITEMS_PER_PAGE);
      setLoadingMore(false);
    }, 220);
  };

  const mindSparkLetters = 'MIND SPARK'.split('');

  // Render PDF Modal on top if active
  const pdfModalElement = activePdf ? (
    <PdfViewerModal
      courseId={activePdf.courseId}
      contentId={activePdf.contentId}
      title={activePdf.title}
      directUrl={activePdf.directUrl}
      onClose={() => setActivePdf(null)}
    />
  ) : null;

  // Render Fullscreen Video Player if active
  if (activeVideo) {
    return (
      <>
        <VideoPlayerView
          params={activeVideo}
          onBack={() => setActiveVideo(null)}
          onOpenPdf={(cId, contId, title, directUrl) =>
            setActivePdf({ courseId: cId, contentId: contId, title, directUrl })
          }
        />
        {pdfModalElement}
      </>
    );
  }

  return (
    <div
      className={`site-shell ${
        palette === 'red'
          ? 'theme-red'
          : palette === 'green'
          ? 'theme-green'
          : palette === 'custom'
          ? 'theme-custom'
          : ''
      } min-h-[100dvh] relative flex flex-col items-center pb-14 overflow-x-hidden`}
      style={customStyle}
    >
      {/* Hidden SEO Content */}
      <div className="seo-hidden-text">
        <h1>MIND SPARK - The Ultimate Free Education &amp; Lecture Platform</h1>
        <p>
          Welcome to MIND SPARK, where education must be free for everyone. MIND SPARK brings
          together premium batches, live classes, lecture videos, PDF notes and mock assessments in
          one 3D glassmorphic workspace.
        </p>
      </div>

      {/* Soft ambient glows matching clone-studybeepro-static-page */}
      <div
        aria-hidden="true"
        className="ambient-glow fixed top-[-12%] left-1/2 -translate-x-1/2 w-[420px] sm:w-[760px] h-[340px] sm:h-[460px] rounded-full blur-[130px] pointer-events-none z-0"
        style={{ background: 'rgba(46,93,230,0.35)' }}
      />
      <div
        aria-hidden="true"
        className="ambient-glow fixed top-[38%] left-1/2 -translate-x-1/2 w-[340px] sm:w-[900px] h-[420px] sm:h-[620px] rounded-full blur-[160px] pointer-events-none z-0"
        style={{ background: 'rgba(26,59,176,0.28)' }}
      />
      <div
        aria-hidden="true"
        className="ambient-glow fixed bottom-[-15%] left-1/4 w-[320px] sm:w-[520px] h-[320px] rounded-full blur-[140px] pointer-events-none z-0"
        style={{ background: 'rgba(110,146,242,0.16)' }}
      />

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-display font-bold text-xs sm:text-sm text-[#E6EDFD] toast-enter"
          style={{
            background:
              'linear-gradient(145deg, rgba(175,197,248,0.32) 0%, rgba(46,93,230,0.68) 55%, rgba(15,34,112,0.92) 100%)',
            backdropFilter: 'var(--glass-filter)',
            WebkitBackdropFilter: 'var(--glass-filter)',
            border: '1.5px solid rgba(230,237,253,0.65)',
            boxShadow: '0 14px 34px rgba(7,16,57,0.85), 0 0 24px rgba(46,93,230,0.45)',
          }}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#E6EDFD] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#AFC5F8] shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ============================================================
          TOP-LEFT 3D GLASSMORPHIC "YOUR STYLE" COLOUR CUSTOMISER
          Replicates clone-studybeepro-static-page exact customiser
      ============================================================ */}
      <div ref={customizeRef} className="fixed top-4 left-4 sm:top-6 sm:left-7 z-40">
        <button
          type="button"
          aria-label="Customise appearance"
          aria-expanded={isCustomizeOpen}
          aria-controls="customize-panel"
          onClick={() => setIsCustomizeOpen((open) => !open)}
          className="group relative flex items-center gap-2.5 p-1.5 sm:pr-4 rounded-2xl transition-ui duration-200 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          style={{
            background:
              'linear-gradient(145deg, rgba(175,197,248,0.28) 0%, rgba(46,93,230,0.32) 55%, rgba(15,34,112,0.75) 100%)',
            backdropFilter: 'var(--glass-filter)',
            WebkitBackdropFilter: 'var(--glass-filter)',
            border: '1px solid rgba(230,237,253,0.45)',
            boxShadow:
              '0 14px 32px -6px rgba(7,16,57,0.8), 0 0 20px rgba(46,93,230,0.35), inset 0 1.5px 2px rgba(230,237,253,0.5)',
          }}
        >
          <span
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl text-[#E6EDFD]"
            style={{
              background:
                'linear-gradient(145deg, rgba(175,197,248,.4), rgba(46,93,230,.35) 55%, rgba(15,34,112,.7))',
              border: '1px solid rgba(230,237,253,.4)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,.35), 0 5px 12px rgba(7,16,57,.4)',
            }}
          >
            <Menu aria-hidden="true" className="w-6 h-6" strokeWidth={2.3} />
          </span>
          <span className="hidden sm:flex flex-col items-start text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#AFC5F8] leading-none">
              Your
            </span>
            <span className="text-[13px] font-display font-bold text-[#E6EDFD] leading-tight mt-0.5">
              Style
            </span>
          </span>
        </button>

        {isCustomizeOpen && (
          <section
            id="customize-panel"
            aria-label="Customise appearance"
            className="absolute top-full left-0 mt-3 w-[min(300px,calc(100vw-2rem))] rounded-[22px] p-5 text-[#E6EDFD] max-h-[calc(100dvh-90px)] overflow-y-auto animate-pop-in"
            style={{
              background: 'linear-gradient(155deg, rgba(26,59,176,.96), rgba(7,16,57,.98))',
              border: '1px solid rgba(175,197,248,.4)',
              boxShadow:
                '0 18px 45px rgba(7,16,57,.8), inset 0 1px 2px rgba(230,237,253,.3)',
              backdropFilter: 'var(--glass-filter)',
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-5">
              <h2 className="font-display font-bold text-base">Customise</h2>
              <button
                type="button"
                onClick={() => setIsCustomizeOpen(false)}
                aria-label="Close customisation"
                className="p-1 rounded-lg hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="palette-switch mb-5">
              <p className="text-xs font-semibold text-white/80 mb-2">Colour palette</p>
              <div
                role="group"
                aria-label="Choose colour palette"
                className="grid grid-cols-2 gap-1 p-1 rounded-2xl border border-white/30 bg-black/30"
              >
                {(['blue', 'red', 'green', 'custom'] as const).map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    aria-pressed={palette === colour}
                    onClick={() => choosePalette(colour)}
                    className={`flex flex-1 justify-center items-center gap-1.5 px-2 py-2 rounded-full text-xs font-bold cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                      palette === colour
                        ? 'bg-white text-black'
                        : 'text-white hover:bg-white/10'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className="w-3 h-3 rounded-full"
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
                    {colour === 'blue'
                      ? 'Blue'
                      : colour === 'red'
                      ? 'Red'
                      : colour === 'green'
                      ? 'Green'
                      : 'Custom'}
                  </button>
                ))}
              </div>

              {palette === 'custom' && (
                <div className="mt-3 rounded-xl border border-white/25 bg-black/25 px-3 py-3">
                  <p className="mb-2 text-xs font-semibold text-white">Choose a colour</p>
                  <div
                    role="group"
                    aria-label="Choose custom colour"
                    className="grid grid-cols-3 gap-2"
                  >
                    {CUSTOM_COLOURS.map((colour) => (
                      <button
                        key={colour.value}
                        type="button"
                        aria-pressed={customColour === colour.value}
                        onClick={() => changeCustomColour(colour.value)}
                        className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[10px] font-semibold text-white cursor-pointer focus-visible:outline-2 focus-visible:outline-white ${
                          customColour === colour.value ? 'bg-white/20' : 'hover:bg-white/10'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-7 w-7 rounded-full border-2 ${
                            customColour === colour.value ? 'border-white' : 'border-white/30'
                          }`}
                          style={{ backgroundColor: colour.value }}
                        />
                        {colour.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold text-[#AFC5F8] mb-2">Batch display style</p>
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
                    onClick={() => chooseCardStyle(style)}
                    className={`flex-1 px-3 py-2 rounded-full text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#AFC5F8] ${
                      cardStyle === style
                        ? 'bg-[#6E92F2] text-[#071039]'
                        : 'text-[#E6EDFD] hover:bg-white/10'
                    }`}
                  >
                    {style === 'folder' ? 'Folders' : 'Cards'}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ============================================================
          TOP-RIGHT 3D GLASSMORPHIC NOTIFICATIONS & INBOX
          Also contains integrated colour customisation inside the drawer!
      ============================================================ */}
      <NotificationsCenter
        palette={palette}
        onChoosePalette={choosePalette}
        customColour={customColour}
        onChangeCustomColour={changeCustomColour}
        cardStyle={cardStyle}
        onChooseCardStyle={chooseCardStyle}
      />

      {/* ============================================================
          VIEW ROUTER: BATCH CONTENT VIEW vs MAIN BATCH HOMEPAGE
      ============================================================ */}
      {selectedBatchId ? (
        (() => {
          const batchObj = allBatches.find((b) => String(b.id) === String(selectedBatchId));
          if (VERIFICATION_ENABLED && !verified) {
            return (
              <VerificationGate
                batchTitle={batchObj?.title || 'this batch'}
                onVerified={() => setVerified(true)}
              />
            );
          }
          return (
            <BatchContentView
              courseId={selectedBatchId}
              batchFallback={batchObj}
              isEnrolled={wishlist.includes(String(selectedBatchId))}
              onToggleEnroll={toggleEnroll}
              onBackToHome={handleBackToHome}
              onSelectBatch={(newId) => handleOpenBatch(newId)}
              onPlayVideo={(videoParams) => setActiveVideo(videoParams)}
              onOpenPdf={(cId, contId, title, directUrl) =>
                setActivePdf({ courseId: cId, contentId: contId, title, directUrl })
              }
            />
          );
        })()
      ) : (
        <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-18 sm:pt-22 xl:pt-10 pb-8 flex flex-col items-center justify-center relative z-10 flex-1">
          {/* ============================================================
              HERO HEADER: STATIC "MIND SPARK" NAME + FREE PILL
          ============================================================ */}
          <header className="text-center mb-7 w-full flex-shrink-0 relative flex flex-col items-center">
            <h1 className="font-display font-extrabold leading-[1.08] flex flex-col items-center justify-center animate-pop-in select-none">
              <span className="text-xs sm:text-sm font-bold uppercase tracking-[0.32em] text-[#AFC5F8] mb-1.5 flex items-center gap-2">
                <span className="h-[1px] w-6 bg-gradient-to-r from-transparent to-[#6E92F2]" />
                <span>Welcome to</span>
                <span className="h-[1px] w-6 bg-gradient-to-l from-transparent to-[#6E92F2]" />
              </span>

              <span className="text-[clamp(1.6rem,7.5vw,4.6rem)] tracking-tight inline-flex flex-nowrap items-center justify-center gap-x-[2px]">
                {mindSparkLetters.map((char, idx) =>
                  char === ' ' ? (
                    <span key={idx} className="w-3 sm:w-4" />
                  ) : (
                    <span key={idx} className="inline-block mindspark-gradient-text">
                      {char}
                    </span>
                  )
                )}
              </span>
            </h1>

            {/* Subtitle with Frosted Glass "Free" Pill */}
            <p className="text-[#AFC5F8] font-display text-sm sm:text-base mt-3.5 font-medium tracking-wide animate-pop-in flex items-center justify-center flex-wrap gap-1.5">
              <span>Education Must Be</span>
              <span
                className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full font-bold text-[#E6EDFD]"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(110,146,242,0.38) 0%, rgba(46,93,230,0.55) 100%)',
                  border: '1px solid rgba(230,237,253,0.5)',
                  boxShadow:
                    '0 4px 16px rgba(46,93,230,0.45), inset 0 1px 1px rgba(230,237,253,0.45)',
                  backdropFilter: 'var(--glass-filter)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E6EDFD]" />
                <span>Free</span>
              </span>
              <span>For Everyone</span>
            </p>
          </header>

          {/* ============================================================
              TELEGRAM COMMUNITY CARD WITH DUAL-LAYER FRONT GLASSMORPHISM
              Replicates clone-studybeepro-static-page exact card
          ============================================================ */}
          <div className="w-full max-w-md sm:max-w-lg mx-auto mb-8 animate-pop-in relative pt-2.5">
            {/* Tilted Vivid Ultramarine Back Plate peeking behind the Frosted Glass Front */}
            <div
              className="pointer-events-none absolute top-0 inset-x-6 h-10 rounded-t-2xl"
              style={{
                transform: 'rotate(-1.3deg)',
                background: 'linear-gradient(90deg, #2E5DE6 0%, #6E92F2 50%, #1A3BB0 100%)',
                border: '1px solid rgba(230,237,253,0.45)',
                boxShadow: '0 8px 24px rgba(46,93,230,0.45)',
              }}
            />

            <a
              href="https://t.me/zarsstudy"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block rounded-[24px] p-4 sm:p-5 overflow-hidden transition-ui duration-200 hover:-translate-y-1"
              style={{
                background: 'var(--community-background)',
                backdropFilter: 'var(--glass-filter)',
                WebkitBackdropFilter: 'var(--glass-filter)',
                borderTop: '1.5px solid rgba(230,237,253,0.62)',
                borderLeft: '1px solid rgba(230,237,253,0.38)',
                borderRight: '1px solid rgba(175,197,248,0.28)',
                borderBottom: '1.5px solid rgba(7,16,57,0.85)',
                boxShadow:
                  '0 18px 40px -10px rgba(7,16,57,0.85), 0 0 28px rgba(46,93,230,0.28), inset 0 1.5px 2px rgba(230,237,253,0.45)',
              }}
            >
              {/* Shimmer Sweep */}
              <div
                className="desktop-sheen pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-in-out"
                style={{
                  background:
                    'linear-gradient(90deg, transparent, rgba(230,237,253,0.22), transparent)',
                }}
              />

              <div className="flex items-center justify-between gap-4 relative z-10">
                <div className="flex items-center gap-3.5 sm:gap-4">
                  <GlassChatBubbleIcon className="w-12 h-12 sm:w-13 sm:h-13 shrink-0" />
                  <div className="text-left">
                    <h2 className="text-[#E6EDFD] font-display font-bold text-[15px] sm:text-[17px] tracking-tight group-hover:text-white transition-colors">
                      Join Our Telegram
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="relative flex h-2 w-2">
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#E6EDFD]" />
                      </span>
                      <span className="text-xs font-medium text-[#AFC5F8]">
                        Daily Batch Updates, Notes &amp; Live Alerts
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-[#E6EDFD] transition-ui duration-200 group-hover:scale-110 group-hover:translate-x-0.5 shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
                    border: '1px solid rgba(230,237,253,0.55)',
                    boxShadow: '0 6px 16px rgba(46,93,230,0.55)',
                  }}
                >
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </a>
          </div>

          {/* ============================================================
              3D GLASSMORPHIC BATCH TABS + VIEW SWITCHER + SEARCH BAR
          ============================================================ */}
          <div className="w-full mb-7 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3.5 animate-pop-in">
            {/* Left: Category Filter Dock (New Batches / My Enrolled / Archive) */}
            <div
              className="flex items-center gap-1.5 p-1.5 rounded-2xl overflow-x-auto no-scrollbar"
              style={{
                background:
                  'linear-gradient(145deg, rgba(175,197,248,0.18) 0%, rgba(15,34,112,0.62) 100%)',
                backdropFilter: 'var(--glass-filter)',
                border: '1px solid rgba(175,197,248,0.34)',
              }}
            >
              {[
                {
                  id: 'new' as const,
                  label: 'New Batches',
                  count: allBatches.length,
                  icon: <Sparkles className="w-3.5 h-3.5" />,
                },
                {
                  id: 'wishlist' as const,
                  label: 'My Enrolled',
                  count: wishlist.length,
                  icon: <Bookmark className="w-3.5 h-3.5" />,
                },
                {
                  id: 'old' as const,
                  label: '2025–26 Archive',
                  count: oldBatches.length,
                  icon: <History className="w-3.5 h-3.5" />,
                },
              ].map((tab) => {
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => switchTab(tab.id)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-display font-bold whitespace-nowrap transition-ui cursor-pointer"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)'
                        : 'transparent',
                      border: isActive
                        ? '1px solid rgba(230,237,253,0.65)'
                        : '1px solid transparent',
                      boxShadow: isActive ? '0 6px 16px rgba(46,93,230,0.5)' : 'none',
                      color: isActive ? '#E6EDFD' : '#AFC5F8',
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                      style={{
                        background: isActive ? 'rgba(7,16,57,0.45)' : 'rgba(175,197,248,0.15)',
                        color: '#E6EDFD',
                      }}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right: Quick Folder/Card Style Toggle + Glass Search Input */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              {/* Quick Folders vs Cards Toggle */}
              <div
                role="group"
                aria-label="Toggle Folders or Cards view"
                className="flex items-center gap-1 p-1 rounded-2xl shrink-0"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(175,197,248,0.18) 0%, rgba(15,34,112,0.58) 100%)',
                  backdropFilter: 'var(--glass-filter)',
                  border: '1px solid rgba(175,197,248,0.32)',
                }}
              >
                <button
                  type="button"
                  onClick={() => chooseCardStyle('folder')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    cardStyle === 'folder'
                      ? 'bg-[#6E92F2] text-[#071039]'
                      : 'text-[#E6EDFD] hover:bg-white/10'
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Folders</span>
                </button>
                <button
                  type="button"
                  onClick={() => chooseCardStyle('card')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    cardStyle === 'card'
                      ? 'bg-[#6E92F2] text-[#071039]'
                      : 'text-[#E6EDFD] hover:bg-white/10'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Cards</span>
                </button>
              </div>

              {/* Glassmorphic Search Input with GlassSearchIcon */}
              <div
                className="relative flex items-center gap-2 px-3 py-1.5 rounded-2xl sm:w-68"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(175,197,248,0.18) 0%, rgba(15,34,112,0.58) 100%)',
                  backdropFilter: 'var(--glass-filter)',
                  border: '1px solid rgba(175,197,248,0.32)',
                }}
              >
                <GlassSearchIcon className="w-8 h-8 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setDisplayedCount(ITEMS_PER_PAGE);
                  }}
                  placeholder="Search batches, classes..."
                  aria-label="Search MIND SPARK batches"
                  className="w-full bg-transparent text-xs sm:text-[13px] text-[#E6EDFD] placeholder-[#AFC5F8]/65 focus:outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setDisplayedCount(ITEMS_PER_PAGE);
                    }}
                    aria-label="Clear batch search"
                    className="text-[#AFC5F8] hover:text-[#E6EDFD] p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ============================================================
              BATCHES 3D FOLDER / GLASS CARD GRID
          ============================================================ */}
          {loadingBatches ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-9 h-9 text-[#6E92F2] animate-spin" />
              <span className="text-xs font-bold uppercase tracking-widest text-[#AFC5F8]">
                Loading batches...
              </span>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div
              className="w-full max-w-md mx-auto my-8 p-7 rounded-3xl text-center animate-pop-in"
              style={{
                background: 'rgba(15, 34, 112, 0.5)',
                border: '1px solid rgba(175, 197, 248, 0.3)',
                backdropFilter: 'var(--glass-filter)',
              }}
            >
              <GlassFolderIcon className="w-14 h-14 mx-auto mb-3" />
              <h3 className="text-base font-display font-bold text-[#E6EDFD]">No Batches Found</h3>
              <p className="text-xs text-[#AFC5F8] mt-1">
                {currentTab === 'wishlist'
                  ? 'You have not enrolled in any batches yet. Click the + button on any batch folder to save it here!'
                  : `No batches matched "${searchQuery}".`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  if (currentTab === 'wishlist') switchTab('new');
                }}
                className="mt-4 px-5 py-2 rounded-full text-xs font-bold text-[#E6EDFD] bg-[#2E5DE6] hover:bg-[#1A3BB0] transition-colors cursor-pointer"
              >
                Show All Batches
              </button>
            </div>
          ) : (
            <>
              <div
                className={
                  cardStyle === 'folder'
                    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 w-full z-10'
                    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6 w-full z-10'
                }
              >
                {visibleBatches.map((batch, index) => {
                  const id = String(batch.id);
                  const isEnrolled = wishlist.includes(id);

                  return cardStyle === 'folder' ? (
                    <BatchFolderCard
                      key={`${currentTab}-${id}`}
                      batch={batch}
                      index={index}
                      isEnrolled={isEnrolled}
                      onOpenBatch={handleOpenBatch}
                      onToggleEnroll={toggleEnroll}
                    />
                  ) : (
                    <BatchGlassCard
                      key={`${currentTab}-${id}`}
                      batch={batch}
                      index={index}
                      isEnrolled={isEnrolled}
                      onOpenBatch={handleOpenBatch}
                      onToggleEnroll={toggleEnroll}
                    />
                  );
                })}
              </div>

              {/* Load More Batches Button */}
              {displayedCount < filteredBatches.length && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="group inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl font-display font-bold text-xs sm:text-sm text-[#E6EDFD] transition-ui hover:-translate-y-0.5 cursor-pointer disabled:opacity-60"
                    style={{
                      background:
                        'linear-gradient(145deg, rgba(175,197,248,0.28) 0%, rgba(46,93,230,0.45) 55%, rgba(15,34,112,0.82) 100%)',
                      backdropFilter: 'var(--glass-filter)',
                      border: '1.5px solid rgba(230,237,253,0.52)',
                      boxShadow:
                        '0 14px 32px -6px rgba(7,16,57,0.8), 0 0 22px rgba(46,93,230,0.35), inset 0 1.5px 2px rgba(230,237,253,0.45)',
                    }}
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Loading More...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          Load More Batches ({filteredBatches.length - displayedCount} remaining)
                        </span>
                        <ChevronDown className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      )}

      {pdfModalElement}

      {/* ============================================================
          FOOTER
      ============================================================ */}
      <footer className="w-full py-5 text-center mt-4 relative z-10 flex-shrink-0 flex flex-col items-center gap-3 animate-pop-in">
        <p className="text-[#AFC5F8]/70 text-[11px] font-semibold tracking-[0.22em] uppercase">
          © 2026 MIND SPARK · FREE EDUCATION ECOSYSTEM
        </p>
      </footer>
    </div>
  );
}

export default App;
