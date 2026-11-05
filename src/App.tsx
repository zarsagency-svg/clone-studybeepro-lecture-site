import React, { useEffect, useState, useMemo } from 'react';
import {
  LayoutGrid,
  Bookmark,
  Sparkles,
  History,
  ExternalLink,
  Search,
  X,
  Loader2,
  ChevronDown,
  FolderOpen,
  Check,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { BatchItem, INITIAL_BATCHES_DATA } from './data/batches';
import { fetchBatchesList } from './services/studybeeApi';
import { BatchContentView } from './components/BatchContentView';
import { VideoPlayerView, ActiveVideoParams } from './components/VideoPlayerView';
import { PdfViewerModal } from './components/PdfViewerModal';

const ITEMS_PER_PAGE = 12;

export function App() {
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

  // Navigation State: Home vs Batch Content vs Video Player vs PDF Modal
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

  useEffect(() => {
    // Keep 24h verification key active so player never redirects to ad-shortener
    localStorage.setItem('smex_key_expiry', String(Date.now() + 48 * 60 * 60 * 1000));

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
        showToast('Enrolled in batch!', 'success');
      }
      return next;
    });
  };

  const handleOpenBatch = (batchId: string) => {
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
      (batch) =>
        batch.title.toLowerCase().includes(q) || String(batch.id).includes(q)
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
    }, 250);
  };

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

  // Render Video Player if active
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

  // Render Batch Course Content View if a batch is selected
  if (selectedBatchId) {
    const batchObj = allBatches.find((b) => String(b.id) === String(selectedBatchId));
    return (
      <>
        <BatchContentView
          courseId={selectedBatchId}
          batchFallback={batchObj}
          onBackToHome={handleBackToHome}
          onSelectBatch={(newId) => handleOpenBatch(newId)}
          onPlayVideo={(videoParams) => setActiveVideo(videoParams)}
          onOpenPdf={(cId, contId, title, directUrl) =>
            setActivePdf({ courseId: cId, contentId: contId, title, directUrl })
          }
        />
        {pdfModalElement}
      </>
    );
  }

  // Render Main Homepage (index.html clone)
  return (
    <div className="min-h-screen relative flex flex-col font-sans pb-12 bg-[#0a0a0a] text-[#e5e5e5]">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-2.5 px-4 py-2.5 rounded-lg font-medium text-sm border toast-enter shadow-[0_10px_30px_rgba(0,0,0,0.5)] ${
            toast.type === 'success'
              ? 'bg-green-950/90 border-green-800 text-green-400'
              : 'bg-red-950/90 border-red-800 text-red-400'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Navbar */}
      <nav className="w-full z-40 nav-glass h-[70px] sticky top-0">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div
            onClick={() => switchTab('new')}
            className="flex items-center gap-3 cursor-pointer btn-click-effect"
          >
            <div className="w-9 h-9 bg-black border border-white/10 rounded-lg flex items-center justify-center relative z-10 overflow-hidden">
              <img
                src="https://i.ibb.co/yF4mhNPB/f493d534-fbf8-4b31-b741-83b343f8a9e1.jpg"
                alt="Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <h1 className="text-xl font-black tracking-wider text-white font-syne">
              STUDY<span className="text-themeYellow">BEE</span>
            </h1>
          </div>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => switchTab('new')}
              className={`${
                currentTab === 'new' ? 'text-white' : 'text-stone-400'
              } hover:text-themeYellow font-bold text-sm transition-colors flex items-center gap-2 btn-click-effect`}
            >
              <LayoutGrid className="w-4 h-4" /> Batches
            </button>
            <button
              onClick={() => switchTab('wishlist')}
              className={`${
                currentTab === 'wishlist' ? 'text-white' : 'text-stone-400'
              } hover:text-white font-bold text-sm transition-colors flex items-center gap-2 btn-click-effect`}
            >
              <Bookmark className="w-4 h-4" /> My Enrollments
            </button>
          </div>

          <div className="md:hidden flex items-center gap-3">
            <button
              onClick={() => switchTab('wishlist')}
              className="text-stone-300 p-2 border border-white/10 rounded-lg hover:text-themeYellow hover:border-themeYellow transition-colors btn-click-effect relative bg-white/5"
            >
              <Bookmark className="w-5 h-5" />
              {wishlist.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-themeGreen rounded-full" />
              )}
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[90rem] mx-auto px-4 sm:px-6 pt-8 relative z-10">
        <div
          className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 fade-in-pop"
          style={{ animationDelay: '50ms' }}
        >
          {/* Compact Buttons UI */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto hide-scroll w-full md:w-auto p-1 bg-[#121212] rounded-xl border border-white/5 shadow-inner">
            <button
              onClick={() => switchTab('new')}
              className={`shrink-0 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 border ${
                currentTab === 'new'
                  ? 'bg-white/10 text-white border-white/10'
                  : 'bg-transparent text-stone-400 hover:text-stone-200 border-transparent'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-themeYellow" />
              Latest <span className="hidden sm:inline">Batches</span>
            </button>

            <button
              onClick={() => switchTab('wishlist')}
              className={`shrink-0 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 border ${
                currentTab === 'wishlist'
                  ? 'bg-white/10 text-white border-white/10'
                  : 'bg-transparent text-stone-400 hover:text-stone-200 border-transparent'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">My </span>Enrolled
              {wishlist.length > 0 && (
                <span className="bg-themeGreen text-black text-[9px] sm:text-[10px] font-black px-1.5 py-0.5 rounded">
                  {wishlist.length}
                </span>
              )}
            </button>

            <div className="w-px h-4 bg-white/10 mx-1 shrink-0" />

            <button
              onClick={() => switchTab('old')}
              className={`shrink-0 px-3 sm:px-5 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-sm font-bold transition-all flex items-center gap-1.5 border btn-click-effect ${
                currentTab === 'old'
                  ? 'bg-white/10 text-white border-white/10'
                  : 'bg-transparent text-stone-400 hover:text-themeYellow border-transparent'
              }`}
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Old <span className="hidden sm:inline">Batches</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-[350px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-stone-500" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setDisplayedCount(ITEMS_PER_PAGE);
              }}
              placeholder="Search batches..."
              className="w-full bg-[#121212] border border-white/10 text-white text-sm rounded-lg block pl-10 pr-10 py-2.5 transition-all placeholder:text-stone-600 focus:outline-none focus:border-themeYellow/50 focus:bg-[#1a1a1a]"
            />
            {searchQuery.length > 0 && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setDisplayedCount(ITEMS_PER_PAGE);
                }}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-stone-500 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Loading Indicator */}
        {loadingBatches ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-themeYellow mb-3" />
            <p className="text-stone-400 font-medium text-sm">Loading batches...</p>
          </div>
        ) : filteredBatches.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center fade-in-pop">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
              <FolderOpen className="w-8 h-8 text-stone-600" />
            </div>
            <h3 className="text-xl font-bold text-white mb-1">No Batches Found</h3>
            <p className="text-stone-500 text-sm">
              Try adjusting your search or enrolling in new batches.
            </p>
          </div>
        ) : (
          <>
            {/* Batch Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleBatches.map((batch, index) => {
                const id = String(batch.id);
                const isEnrolled = wishlist.includes(id);
                const delay = `${(index % ITEMS_PER_PAGE) * 30}ms`;

                return (
                  <div
                    key={id}
                    style={{ animationDelay: delay }}
                    className="premium-card rounded-xl overflow-hidden fade-in-pop group flex flex-col relative"
                  >
                    <div
                      onClick={() => handleOpenBatch(id)}
                      className="relative w-full aspect-[16/9] overflow-hidden bg-black border-b border-white/5 cursor-pointer"
                    >
                      <img
                        src={batch.thumbnail}
                        alt={batch.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-transparent opacity-90" />

                      <div className="absolute top-3 right-3 bg-themeGreen/20 backdrop-blur-md border border-themeGreen/30 px-2 py-1 rounded flex items-center justify-center z-10 shadow-sm">
                        <span className="text-themeGreen text-[9px] font-black tracking-widest uppercase">
                          FREE
                        </span>
                      </div>
                    </div>

                    <div className="p-5 flex flex-col flex-1 relative z-20">
                      <h3
                        onClick={() => handleOpenBatch(id)}
                        className="text-gray-200 font-semibold text-sm leading-relaxed mb-4 line-clamp-2 group-hover:text-white transition-colors cursor-pointer"
                      >
                        {batch.title}
                      </h3>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                        <div>
                          {isEnrolled ? (
                            <button
                              onClick={(e) => toggleEnroll(e, id)}
                              className="bg-themeGreen/10 text-themeGreen border border-themeGreen/20 px-3 py-1.5 rounded text-[11px] font-bold tracking-wider flex items-center gap-1.5 hover:bg-themeGreen/20 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" /> ENROLLED
                            </button>
                          ) : (
                            <button
                              onClick={(e) => toggleEnroll(e, id)}
                              className="bg-themeGreen hover:bg-emerald-400 text-black px-3 py-1.5 rounded text-[11px] font-bold tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md"
                            >
                              <Plus className="w-3.5 h-3.5" /> ENROLL
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => handleOpenBatch(id)}
                          className="bg-themeYellow hover:bg-yellow-400 text-black px-4 py-2 rounded text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors btn-click-effect shadow-md"
                        >
                          Let&apos;s Study <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load More Button */}
            {displayedCount < filteredBatches.length && (
              <div className="w-full flex justify-center mt-10 mb-6 fade-in-pop">
                <button
                  disabled={loadingMore}
                  onClick={handleLoadMore}
                  className="px-8 py-2.5 bg-[#121212] border border-white/10 hover:border-white/30 rounded-lg text-white font-semibold text-sm transition-all btn-click-effect flex items-center gap-2 disabled:opacity-60"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-stone-400" /> Loading
                    </>
                  ) : (
                    <>
                      Load More <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {pdfModalElement}
    </div>
  );
}
export default App;
