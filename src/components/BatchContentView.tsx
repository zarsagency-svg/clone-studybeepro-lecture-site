import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  FolderOpen,
  Home,
  Loader2,
  Play,
  Sparkles,
  X,
  Check,
  Plus,
} from 'lucide-react';
import logo from '../assets/logo.jpg';
import { BatchItem } from '../data/batches';
import {
  CourseContentItem,
  CourseOverviewData,
  DownloadQuality,
  fetchCourseOverview,
  fetchFolderContent,
  fetchWithFallback,
  generateFallbackTestQuestions,
  parseDownloadUrls,
  TestQuestion,
} from '../services/studybeeApi';
import { ActiveVideoParams } from './VideoPlayerView';
import {
  GlassDocsIcon,
  GlassFolderIcon,
  GlassMedalIcon,
  GlassPlayIcon,
  GlassShieldIcon,
} from './GlassIcons3D';

interface BatchContentViewProps {
  courseId: string;
  batchFallback?: BatchItem;
  isEnrolled?: boolean;
  onToggleEnroll?: (e: React.MouseEvent, batchId: string) => void;
  onBackToHome: () => void;
  onSelectBatch: (batchId: string) => void;
  onPlayVideo: (params: ActiveVideoParams) => void;
  onOpenPdf: (
    courseId: string,
    contentId: string,
    title: string,
    directUrl?: string
  ) => void;
}

interface FolderBreadcrumb {
  id: string;
  title: string;
}

interface VideoActionModalState {
  courseId: string;
  contentId: string;
  vdcId?: string;
  ytUrl?: string;
  title: string;
  thumbnail: string;
  downloadUrlsRaw?: string | null;
  directFileUrl?: string;
  qualities: DownloadQuality[];
  showQualityList: boolean;
}

interface ExamResultSummary {
  testName: string;
  rank: string;
  totalStudents: string;
  score: number;
  maxMarks: number;
  percentage: string;
  percentile: string;
  correct: number;
  incorrect: number;
  unattempted: number;
}

export const BatchContentView: React.FC<BatchContentViewProps> = ({
  courseId,
  batchFallback,
  isEnrolled = false,
  onToggleEnroll,
  onBackToHome,
  onSelectBatch,
  onPlayVideo,
  onOpenPdf,
}) => {
  const [effectiveCourseId, setEffectiveCourseId] = useState<string>(courseId);
  const effectiveCourseIdRef = useRef(courseId);
  const folderRequestRef = useRef(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'content'>('content');
  const [viewMode, setViewMode] = useState<'content' | 'instructions' | 'exam' | 'result'>('content');

  // Overview state
  const [overview, setOverview] = useState<CourseOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  // Content & Folders state
  const [rootFolders, setRootFolders] = useState<CourseContentItem[]>([]);
  const [folderItems, setFolderItems] = useState<CourseContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [folderHistory, setFolderHistory] = useState<FolderBreadcrumb[]>([
    { id: '0', title: 'Root' },
  ]);

  // Video Action Modal (Watch Now vs Download)
  const [videoModal, setVideoModal] = useState<VideoActionModalState | null>(null);

  // Test Engine State
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [currentTestTitle, setCurrentTestTitle] = useState<string>('Practice Test');
  const [testDurationMins, setTestDurationMins] = useState<number>(15);
  const [testInstructionsHtml, setTestInstructionsHtml] = useState<string>('');
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [userResponses, setUserResponses] = useState<
    Record<string, { selected: string[]; time_spent: number; status: string }>
  >({});
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [examLoadingText, setExamLoadingText] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [examResultSummary, setExamResultSummary] = useState<ExamResultSummary | null>(null);

  const loadFolder = useCallback(
    async (folderId: string, folderTitle?: string) => {
      const requestId = ++folderRequestRef.current;
      setContentLoading(true);

      setFolderHistory((prev) => {
        if (folderId === '0') {
          return [{ id: '0', title: 'Root' }];
        }
        const existingIndex = prev.findIndex((f) => String(f.id) === String(folderId));
        if (existingIndex !== -1) {
          return prev.slice(0, existingIndex + 1);
        }
        if (folderTitle) {
          return [...prev, { id: String(folderId), title: folderTitle }];
        }
        return prev;
      });

      const targetId = folderId === '0' ? courseId : effectiveCourseIdRef.current;
      const { items, effectiveCourseId: resolvedId } = await fetchFolderContent(
        targetId,
        String(folderId)
      );

      if (requestId !== folderRequestRef.current) return;
      if (folderId === '0') {
        effectiveCourseIdRef.current = resolvedId;
        setEffectiveCourseId(resolvedId);
        setRootFolders(items);
      }
      setFolderItems(items);
      setContentLoading(false);
    },
    [courseId]
  );

  // Load initial course overview and root folder
  useEffect(() => {
    let mounted = true;
    effectiveCourseIdRef.current = courseId;
    setEffectiveCourseId(courseId);
    setOverviewLoading(true);
    setActiveTab('content');
    setViewMode('content');

    fetchCourseOverview(courseId).then((data) => {
      if (!mounted) return;
      setOverview(data);
      setOverviewLoading(false);
    });

    loadFolder('0', 'Root');

    return () => {
      mounted = false;
      folderRequestRef.current++;
    };
  }, [courseId, loadFolder]);

  // Exam timer countdown
  useEffect(() => {
    if (viewMode !== 'exam') return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [viewMode]);

  const formatDuration = (sec?: number) => {
    if (!sec || sec <= 0) return '00:00';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (ts?: number) => {
    if (!ts) return '';
    try {
      const d = new Date(ts * 1000);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const formatExamTimer = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  const handleVideoCardClick = (item: CourseContentItem) => {
    const fallbackThumbnail =
      'https://decicqog4ulhy.cloudfront.net/0/admin_v2/uploads/courses/thumbnail/2671188_1_logo.jpg';
    const thumbnail = item.data?.thumbnail?.trim() ? item.data.thumbnail : fallbackThumbnail;
    const videoType = item.data?.video_type;
    const vdcId = item.data?.vdc_id || '';
    const isYouTube = !vdcId && videoType == 1;

    let ytUrl = '';
    if (isYouTube && thumbnail.includes('i.ytimg.com/vi/')) {
      const parts = thumbnail.split('/vi/');
      if (parts.length > 1) {
        const ytId = parts[1].split('/')[0];
        if (ytId) {
          ytUrl = `https://www.youtube.com/watch?v=${ytId}`;
        }
      }
    }

    const qualities = parseDownloadUrls(item.data?.download_urls);

    setVideoModal({
      courseId: effectiveCourseId,
      contentId: item.entity_id,
      vdcId: String(vdcId || ''),
      ytUrl,
      title: item.title,
      thumbnail,
      downloadUrlsRaw: item.data?.download_urls,
      directFileUrl: item.data?.file_url,
      qualities,
      showQualityList: false,
    });
  };

  const handleWatchNowFromModal = () => {
    if (!videoModal) return;
    const siblingPdfs = folderItems.filter(
      (i) => i.type === 'file' && i.data?.file_type === 1
    );
    onPlayVideo({
      courseId: videoModal.courseId,
      contentId: videoModal.contentId,
      vdcId: videoModal.vdcId,
      ytUrl: videoModal.ytUrl,
      title: videoModal.title,
      thumbnail: videoModal.thumbnail,
      downloadUrlsRaw: videoModal.downloadUrlsRaw,
      directFileUrl: videoModal.directFileUrl,
      siblingPdfs,
    });
    setVideoModal(null);
  };

  // Exam Engine Handlers
  const openTestInstructions = async (testId: string, title: string) => {
    setCurrentTestId(testId);
    setCurrentTestTitle(title);
    setViewMode('instructions');
    setTestInstructionsHtml('<div class="py-10 text-[#AFC5F8]">Loading instructions...</div>');

    const fallback = generateFallbackTestQuestions(title);
    const token = localStorage.getItem('studybee_token');

    if (token) {
      try {
        const json = await fetchWithFallback(`?test_instructions=${testId}&_t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (json?.success && json.data) {
          setTestDurationMins(Math.floor((parseInt(json.data.total_time) || 900) / 60));
          setTestInstructionsHtml(
            json.data.test_instructions || fallback.instructionsHtml
          );
          return;
        }
      } catch {
        // Fallback to curated instructions
      }
    }

    setTestDurationMins(fallback.durationMinutes);
    setTestInstructionsHtml(fallback.instructionsHtml);
  };

  const fetchTestDataAndStart = async () => {
    if (!currentTestId) return;
    setExamLoadingText('Fetching Questions...');

    const fallback = generateFallbackTestQuestions(currentTestTitle);
    let questionsToUse = fallback.questions;
    let durationSec = fallback.durationMinutes * 60;

    const token = localStorage.getItem('studybee_token');
    if (token) {
      try {
        const json = await fetchWithFallback(`?test_data=${currentTestId}&_t=${Date.now()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const section = json?.data?.sections?.[0];
        if (json?.success && section?.questions?.length > 0) {
          questionsToUse = section.questions;
          durationSec =
            parseInt(section.time_limits) || parseInt(json.data.total_time) || durationSec;
        }
      } catch {
        // Use fallback questions
      }
    }

    const initialResponses: Record<
      string,
      { selected: string[]; time_spent: number; status: string }
    > = {};
    questionsToUse.forEach((q) => {
      initialResponses[q.question_group_id] = {
        selected: [],
        time_spent: 0,
        status: '1',
      };
    });

    setTestQuestions(questionsToUse);
    setUserResponses(initialResponses);
    setRemainingSeconds(durationSec);
    setCurrentQuestionIndex(0);
    setExamLoadingText(null);
    setViewMode('exam');
  };

  const handleSelectOption = (questionId: string, optionKey: string) => {
    setUserResponses((prev) => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || { time_spent: 0 }),
        selected: [optionKey],
        status: '2',
      },
    }));
  };

  const handleClearResponse = () => {
    const q = testQuestions[currentQuestionIndex];
    if (!q) return;
    setUserResponses((prev) => ({
      ...prev,
      [q.question_group_id]: {
        ...(prev[q.question_group_id] || { time_spent: 0 }),
        selected: [],
        status: '1',
      },
    }));
  };

  const handleSaveAndNext = () => {
    if (currentQuestionIndex < testQuestions.length - 1) {
      setCurrentQuestionIndex((i) => i + 1);
    } else {
      setShowSubmitModal(true);
    }
  };

  const handleConfirmSubmitTest = () => {
    setShowSubmitModal(false);
    setExamLoadingText('Preparing Results...');

    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;
    let score = 0;
    let maxMarks = 0;

    testQuestions.forEach((q) => {
      const qMarks = Number(q.mark_per_question) || 4;
      const negMarks = Number(q.negative_marks) || 1;
      maxMarks += qMarks;

      const resp = userResponses[q.question_group_id];
      const chosen = resp?.selected?.[0];
      if (!chosen) {
        unattempted++;
      } else if (chosen === (q.correct_option || 'option_a')) {
        correct++;
        score += qMarks;
      } else {
        incorrect++;
        score -= negMarks;
      }
    });

    const attempted = correct + incorrect;
    const accuracy = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const pct = maxMarks > 0 ? Math.max(0, Math.round((score / maxMarks) * 100)) : 0;

    window.setTimeout(() => {
      setExamResultSummary({
        testName: currentTestTitle,
        rank: score >= maxMarks * 0.8 ? '12' : score >= maxMarks * 0.5 ? '84' : '240',
        totalStudents: '1,420',
        score,
        maxMarks,
        percentage: String(accuracy),
        percentile: String(Math.min(99.8, Math.max(45, pct + 18)).toFixed(1)),
        correct,
        incorrect,
        unattempted,
      });
      setExamLoadingText(null);
      setViewMode('result');
    }, 450);
  };

  const displayTitle = overview?.title || batchFallback?.title || 'Loading Batch...';
  const displayThumb = overview?.thumbnail || batchFallback?.thumbnail || '';

  return (
    <>
    <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-12 flex flex-col relative z-10 flex-1">
      {/* Top Batch Navigation Bar (leaves room for fixed Style & Notifications buttons) */}
      <div
        className="w-full mb-6 rounded-[24px] px-4 py-3 flex items-center justify-between gap-3 animate-pop-in"
        style={{
          background:
            'linear-gradient(145deg, rgba(175,197,248,0.22) 0%, rgba(26,59,176,0.42) 55%, rgba(15,34,112,0.82) 100%)',
          backdropFilter: 'var(--glass-filter)',
          WebkitBackdropFilter: 'var(--glass-filter)',
          border: '1px solid rgba(230,237,253,0.42)',
          boxShadow:
            '0 14px 32px -8px rgba(7,16,57,0.8), inset 0 1.5px 2px rgba(230,237,253,0.4)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBackToHome}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-[#E6EDFD] transition-ui hover:-translate-x-0.5 cursor-pointer shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
              border: '1px solid rgba(230,237,253,0.55)',
              boxShadow: '0 6px 16px rgba(46,93,230,0.45)',
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Batches</span>
          </button>

          <div
            onClick={onBackToHome}
            className="hidden sm:flex items-center gap-2.5 cursor-pointer min-w-0"
          >
            <div className="w-8 h-8 rounded-xl overflow-hidden border border-[#AFC5F8]/45 shrink-0 bg-[#071039]">
              <img src={logo} alt="MindSpark logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-display font-extrabold text-sm tracking-wider mindspark-gradient-text truncate">
              MIND SPARK
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onToggleEnroll && (
            <button
              type="button"
              onClick={(e) => onToggleEnroll(e, courseId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-[#E6EDFD] transition-ui cursor-pointer active:scale-95"
              style={{
                background: isEnrolled
                  ? 'linear-gradient(135deg, rgba(110,146,242,0.45) 0%, rgba(46,93,230,0.65) 100%)'
                  : 'rgba(7, 16, 57, 0.5)',
                border: isEnrolled
                  ? '1px solid rgba(230,237,253,0.7)'
                  : '1px solid rgba(175,197,248,0.35)',
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
                  <span>Enroll Batch</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* =================== FOLDER/CONTENT VIEW =================== */}
      {viewMode === 'content' && (
        <div className="w-full flex flex-col flex-1">
          {/* Dual-Layer 3D Glass Course Hero Banner */}
          <div className="relative pt-3 mb-7 animate-pop-in">
            {/* Tilted Vivid Ultramarine Back Plate */}
            <div
              className="pointer-events-none absolute top-0 inset-x-8 h-12 rounded-t-3xl"
              style={{
                transform: 'rotate(-0.8deg)',
                background: 'linear-gradient(90deg, #2E5DE6 0%, #6E92F2 50%, #1A3BB0 100%)',
                border: '1px solid rgba(230,237,253,0.45)',
                boxShadow: '0 8px 24px rgba(46,93,230,0.45)',
              }}
            />

            <div
              className="relative z-10 rounded-[28px] p-5 sm:p-7 flex flex-col-reverse md:flex-row items-center justify-between gap-6 overflow-hidden"
              style={{
                background: 'var(--community-background)',
                backdropFilter: 'var(--glass-filter)',
                WebkitBackdropFilter: 'var(--glass-filter)',
                borderTop: '1.5px solid rgba(230,237,253,0.62)',
                borderLeft: '1px solid rgba(230,237,253,0.38)',
                borderRight: '1px solid rgba(175,197,248,0.28)',
                borderBottom: '1.5px solid rgba(7,16,57,0.85)',
                boxShadow:
                  '0 20px 44px -12px rgba(7,16,57,0.88), 0 0 30px rgba(46,93,230,0.26), inset 0 1.5px 2px rgba(230,237,253,0.45)',
              }}
            >
              <div className="flex flex-col items-start gap-3 flex-1 w-full relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#E6EDFD] px-3 py-1 rounded-full"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(110,146,242,0.42) 0%, rgba(46,93,230,0.62) 100%)',
                      border: '1px solid rgba(230,237,253,0.52)',
                    }}
                  >
                    <Sparkles className="w-3 h-3" />
                    Premium Batch · Free
                  </span>
                  {effectiveCourseId !== courseId && (
                    <span
                      className="text-[11px] font-bold text-[#E6EDFD] px-3 py-1 rounded-full"
                      style={{
                        background: 'rgba(15, 34, 112, 0.72)',
                        border: '1px solid rgba(175, 197, 248, 0.45)',
                      }}
                    >
                      Full Lecture Archive Unlocked
                    </span>
                  )}
                </div>

                <h1 className="text-xl sm:text-3xl font-display font-extrabold text-[#E6EDFD] leading-tight">
                  {displayTitle}
                </h1>


              </div>

              {displayThumb && (
                <div className="w-full md:w-auto shrink-0 flex justify-center md:justify-end relative z-10">
                  <div
                    className="w-full max-w-[290px] rounded-[20px] p-1.5 transition-transform duration-300 hover:scale-[1.03]"
                    style={{
                      transform: 'rotate(1.6deg)',
                      background:
                        'linear-gradient(145deg, #6E92F2 0%, #2E5DE6 50%, #071039 100%)',
                      border: '1.5px solid rgba(230,237,253,0.72)',
                      boxShadow: 'var(--folder-logo-shadow)',
                    }}
                  >
                    <img
                      src={displayThumb}
                      alt={displayTitle}
                      className="w-full rounded-[15px] object-cover aspect-[16/9]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 3D Glassmorphic Navigation Tabs Dock */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {[
              {
                key: 'content' as const,
                label: 'Subject',
                icon: <GlassFolderIcon className="w-7 h-7" />,
              },
              {
                key: 'overview' as const,
                label: 'Overview',
                icon: <GlassDocsIcon className="w-7 h-7" />,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className="flex min-w-0 justify-center items-center gap-2 px-2 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-display font-bold transition-ui cursor-pointer hover:-translate-y-0.5"
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, rgba(110,146,242,0.45) 0%, rgba(46,93,230,0.72) 100%)'
                      : 'linear-gradient(145deg, rgba(175,197,248,0.16) 0%, rgba(15,34,112,0.58) 100%)',
                    border: isActive
                      ? '1.5px solid rgba(230,237,253,0.78)'
                      : '1px solid rgba(175,197,248,0.3)',
                    boxShadow: isActive
                      ? '0 10px 24px -6px rgba(46,93,230,0.6), inset 0 1px 2px rgba(230,237,253,0.5)'
                      : 'none',
                    color: '#E6EDFD',
                  }}
                >
                  {tab.icon}
                  <span>{tab.label}</span>

                </button>
              );
            })}
          </div>

          {/* =================== TAB 1: OVERVIEW =================== */}
          {activeTab === 'overview' && (
            <div className="space-y-8 animate-pop-in">
              {/* Included Combo Packages if present */}
              {overview?.packages && overview.packages.length > 0 && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[#AFC5F8] mb-4 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#6E92F2]" />
                    <span>Included Combo Packages</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {overview.packages.map((pkg) => (
                      <div
                        key={pkg.id}
                        onClick={() => onSelectBatch(String(pkg.id))}
                        className="glass-card rounded-2xl p-3 flex items-center gap-4 cursor-pointer"
                      >
                        <img
                          src={pkg.thumbnail}
                          alt={pkg.title}
                          className="w-24 aspect-[16/9] rounded-xl object-cover border border-[#AFC5F8]/35 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-[#E6EDFD] bg-[#2E5DE6]/60 px-2 py-0.5 rounded-full border border-[#E6EDFD]/35">
                            INCLUDED
                          </span>
                          <h4 className="text-[#E6EDFD] font-display font-bold text-sm truncate mt-1.5">
                            {pkg.title}
                          </h4>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Subject Folders Preview on Overview */}
              {rootFolders.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-[#AFC5F8] flex items-center gap-2">
                      <FolderOpen className="w-4 h-4 text-[#6E92F2]" />
                      <span>Subject Folders &amp; Lectures</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab('content')}
                      className="text-xs font-bold text-[#E6EDFD] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <span>Open Full Folder Browser</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                    {rootFolders.slice(0, 8).map((item, idx) => (
                      <ContentGridCard
                        key={item.entity_id}
                        item={item}
                        index={idx}
                        onFolderClick={(fId, fTitle) => {
                          setActiveTab('content');
                          loadFolder(fId, fTitle);
                        }}
                        onVideoClick={handleVideoCardClick}
                        onPdfClick={(pdfItem) =>
                          onOpenPdf(
                            effectiveCourseId,
                            pdfItem.entity_id,
                            pdfItem.title,
                            pdfItem.data?.file_url
                          )
                        }
                        onTestClick={openTestInstructions}
                        formatDuration={formatDuration}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Course Description Box */}
              <div className="glass-surface rounded-[26px] p-6 md:p-8 text-[#E6EDFD]/90 leading-relaxed text-sm md:text-base course-desc-html">
                <h3 className="text-[#E6EDFD] font-display font-bold text-lg mb-4 pb-3 border-b border-[#AFC5F8]/25 flex items-center gap-2.5">
                  <GlassDocsIcon className="w-8 h-8" />
                  <span>Batch Details &amp; Syllabus</span>
                </h3>
                {overviewLoading ? (
                  <p className="animate-pulse text-[#AFC5F8]">Loading description...</p>
                ) : overview?.description ? (
                  <div dangerouslySetInnerHTML={{ __html: overview.description }} />
                ) : (
                  <p>
                    Complete premium batch with live interactive classes, recorded video lectures,
                    chapter-wise PDF notes, and mock assessments — 100% free on MIND SPARK.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* =================== TAB 2: CONTENT (3D FOLDERS & LECTURES) =================== */}
          {activeTab === 'content' && (
            <div className="flex flex-col h-full animate-pop-in">
              {/* Glassmorphic Breadcrumbs */}
              <div
                className="mb-6 px-4 py-3 rounded-2xl flex items-center overflow-x-auto whitespace-nowrap no-scrollbar"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(175,197,248,0.18) 0%, rgba(15,34,112,0.65) 100%)',
                  backdropFilter: 'var(--glass-filter)',
                  border: '1px solid rgba(175,197,248,0.35)',
                }}
              >
                <div className="flex items-center text-xs sm:text-sm font-semibold text-[#AFC5F8] gap-1">
                  {folderHistory.map((folder, index) => {
                    const isFirst = index === 0;
                    const isLast = index === folderHistory.length - 1;
                    return (
                      <span key={`${folder.id}-${index}`} className="flex items-center">
                        <button
                          type="button"
                          disabled={isLast}
                          onClick={() => {
                            if (!isLast) loadFolder(folder.id, folder.title);
                          }}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-colors ${
                            isLast
                              ? 'bg-[#2E5DE6]/55 text-[#E6EDFD] font-bold border border-[#E6EDFD]/35 cursor-default'
                              : 'hover:bg-white/10 hover:text-[#E6EDFD] cursor-pointer'
                          }`}
                        >
                          {isFirst ? (
                            <>
                              <Home className="w-3.5 h-3.5" />
                              <span>Subjects</span>
                            </>
                          ) : (
                            folder.title
                          )}
                        </button>
                        {!isLast && (
                          <ChevronRight className="w-4 h-4 mx-1 text-[#AFC5F8]/60 shrink-0" />
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Loader or Grid */}
              {contentLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <Loader2 className="w-9 h-9 text-[#6E92F2] animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-widest text-[#AFC5F8]">
                    Opening Glass Folders...
                  </span>
                </div>
              ) : folderItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                  {folderItems.map((item, index) => (
                    <ContentGridCard
                      key={`${item.type}-${item.entity_id}-${index}`}
                      item={item}
                      index={index}
                      onFolderClick={(fId, fTitle) => loadFolder(fId, fTitle)}
                      onVideoClick={handleVideoCardClick}
                      onPdfClick={(pdfItem) =>
                        onOpenPdf(
                          effectiveCourseId,
                          pdfItem.entity_id,
                          pdfItem.title,
                          pdfItem.data?.file_url
                        )
                      }
                      onTestClick={openTestInstructions}
                      formatDuration={formatDuration}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              ) : (
                <div className="glass-surface rounded-[28px] py-16 px-6 text-center max-w-md mx-auto my-6">
                  <GlassFolderIcon className="w-14 h-14 mx-auto mb-3" />
                  <h3 className="text-lg font-display font-bold text-[#E6EDFD]">Folder is Empty</h3>
                  <p className="text-xs text-[#AFC5F8] mt-1">
                    No lectures or notes have been uploaded to this folder yet.
                  </p>
                  {folderHistory.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const prev = folderHistory[folderHistory.length - 2];
                        if (prev) loadFolder(prev.id, prev.title);
                      }}
                      className="mt-4 px-4 py-2 rounded-full text-xs font-bold text-[#E6EDFD] bg-[#2E5DE6] hover:bg-[#1A3BB0] transition-colors cursor-pointer"
                    >
                      Go Back
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* =================== EXAM INSTRUCTIONS VIEW =================== */}
      {viewMode === 'instructions' && (
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col py-4 animate-pop-in">
          <div className="glass-surface rounded-[28px] p-6 md:p-8 flex flex-col flex-1">
            <div className="flex items-start gap-4 mb-6 pb-4 border-b border-[#AFC5F8]/25">
              <GlassShieldIcon className="w-12 h-12 shrink-0" />
              <div>
                <h2 className="text-xl md:text-2xl font-display font-bold text-[#E6EDFD]">
                  {currentTestTitle}
                </h2>
                <p className="text-xs sm:text-sm text-[#AFC5F8] mt-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{testDurationMins} Mins Duration</span>
                </p>
              </div>
            </div>

            <h3 className="text-base font-display font-bold mb-3 text-[#E6EDFD]">Instructions</h3>
            <div
              className="flex-1 overflow-y-auto pr-2 text-[#E6EDFD]/85 text-sm space-y-3 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: testInstructionsHtml }}
            />

            <div className="mt-8 pt-5 border-t border-[#AFC5F8]/25 flex flex-col sm:flex-row justify-end gap-3 w-full">
              <button
                type="button"
                onClick={() => {
                  setViewMode('content');
                  setCurrentTestId(null);
                }}
                className="px-6 py-2.5 rounded-2xl font-bold text-xs text-[#E6EDFD] bg-[#071039]/60 border border-[#AFC5F8]/35 hover:bg-white/10 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={fetchTestDataAndStart}
                className="px-6 py-2.5 rounded-2xl font-bold text-xs text-[#E6EDFD] transition-ui hover:-translate-y-0.5 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
                  border: '1px solid rgba(230,237,253,0.6)',
                  boxShadow: '0 8px 20px rgba(46,93,230,0.5)',
                }}
              >
                Start Assessment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== EXAM LIVE VIEW =================== */}
      {viewMode === 'exam' && testQuestions[currentQuestionIndex] && (
        <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col py-2 animate-pop-in">
          <div className="glass-surface rounded-[28px] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-5 border-b border-[#AFC5F8]/25 bg-[#071039]/55">
              <h2 className="text-sm md:text-base font-display font-bold truncate pr-4 text-[#E6EDFD]">
                {currentTestTitle}
              </h2>
              <div className="flex items-center gap-3 shrink-0">
                <div className="bg-[#071039]/80 text-[#E6EDFD] px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mono border border-[#AFC5F8]/35 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-[#6E92F2]" />
                  <span>{formatExamTimer(remainingSeconds)}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-[#E6EDFD] bg-[#2E5DE6] hover:bg-[#1A3BB0] border border-[#E6EDFD]/40 transition-colors cursor-pointer"
                >
                  Submit
                </button>
              </div>
            </div>

            {(() => {
              const q = testQuestions[currentQuestionIndex];
              const qId = q.question_group_id;
              const langData = q.languages.english;
              const currentSelected = userResponses[qId]?.selected?.[0] || null;
              const opts = [
                { key: 'option_a', label: langData.option_a },
                { key: 'option_b', label: langData.option_b },
                { key: 'option_c', label: langData.option_c },
                { key: 'option_d', label: langData.option_d },
                { key: 'option_e', label: langData.option_e },
              ].filter((o) => o.label && o.label.trim() !== '');

              return (
                <div className="flex-1 overflow-y-auto p-5 md:p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-base sm:text-lg font-display font-bold text-[#E6EDFD]">
                      Question {currentQuestionIndex + 1} of {testQuestions.length}
                    </h3>
                    <div className="text-xs font-bold text-[#AFC5F8]">
                      Marks: <span className="text-[#E6EDFD]">+{q.mark_per_question}</span> /{' '}
                      <span className="text-[#AFC5F8]">-{q.negative_marks}</span>
                    </div>
                  </div>
                  <div
                    className="text-sm sm:text-base mb-6 text-[#E6EDFD] question-html leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: langData.question_text }}
                  />
                  <div className="space-y-3">
                    {opts.map((opt) => {
                      const isChecked = currentSelected === opt.key;
                      return (
                        <div
                          key={opt.key}
                          onClick={() => handleSelectOption(qId, opt.key)}
                          className="flex items-center p-3.5 px-4 rounded-2xl border cursor-pointer transition-ui text-sm"
                          style={{
                            background: isChecked
                              ? 'linear-gradient(135deg, rgba(110,146,242,0.38) 0%, rgba(46,93,230,0.58) 100%)'
                              : 'rgba(7, 16, 57, 0.55)',
                            borderColor: isChecked
                              ? 'rgba(230,237,253,0.85)'
                              : 'rgba(175,197,248,0.25)',
                            color: '#E6EDFD',
                          }}
                        >
                          <div
                            className={`w-[18px] h-[18px] rounded-full border-2 mr-3 flex items-center justify-center shrink-0 ${
                              isChecked ? 'border-[#E6EDFD]' : 'border-[#AFC5F8]/50'
                            }`}
                          >
                            {isChecked && <div className="w-2 h-2 rounded-full bg-[#E6EDFD]" />}
                          </div>
                          <div
                            className="flex-1 question-html"
                            dangerouslySetInnerHTML={{ __html: opt.label || '' }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="p-4 border-t border-[#AFC5F8]/25 bg-[#071039]/55 flex justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={currentQuestionIndex === 0}
                  onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                  className="px-4 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl font-bold text-xs text-[#E6EDFD] disabled:opacity-40 cursor-pointer"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleClearResponse}
                  className="px-4 py-2.5 text-[#AFC5F8] hover:text-[#E6EDFD] rounded-xl font-bold text-xs cursor-pointer"
                >
                  Clear
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveAndNext}
                className="px-6 py-2.5 rounded-xl font-bold text-xs text-[#E6EDFD] cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
                  border: '1px solid rgba(230,237,253,0.6)',
                }}
              >
                {currentQuestionIndex === testQuestions.length - 1 ? 'Submit' : 'Save & Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== RESULTS DASHBOARD =================== */}
      {viewMode === 'result' && examResultSummary && (
        <div className="max-w-3xl mx-auto w-full flex-1 py-4 animate-pop-in">
          <div className="glass-surface rounded-[28px] p-6 md:p-10">
            <div className="text-center mb-8">
              <GlassMedalIcon className="w-16 h-16 mx-auto mb-3" />
              <h2 className="text-2xl md:text-3xl font-display font-bold text-[#E6EDFD] mb-1">
                Assessment Complete
              </h2>
              <p className="text-[#AFC5F8] text-sm">{examResultSummary.testName}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
              {[
                {
                  label: 'Rank',
                  val: `${examResultSummary.rank} / ${examResultSummary.totalStudents}`,
                },
                {
                  label: 'Score',
                  val: `${examResultSummary.score} / ${examResultSummary.maxMarks}`,
                },
                { label: 'Accuracy', val: `${examResultSummary.percentage}%` },
                { label: 'Percentile', val: examResultSummary.percentile },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: 'rgba(7, 16, 57, 0.55)',
                    border: '1px solid rgba(175, 197, 248, 0.3)',
                  }}
                >
                  <div className="text-[10px] text-[#AFC5F8] font-bold uppercase tracking-widest mb-1">
                    {stat.label}
                  </div>
                  <div className="text-lg font-display font-bold text-[#E6EDFD]">{stat.val}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              <div className="rounded-2xl p-3.5 text-center bg-[#071039]/55 border border-[#AFC5F8]/25">
                <div className="text-xl font-bold text-[#E6EDFD]">{examResultSummary.correct}</div>
                <div className="text-[11px] text-[#AFC5F8] mt-0.5">Correct</div>
              </div>
              <div className="rounded-2xl p-3.5 text-center bg-[#071039]/55 border border-[#AFC5F8]/25">
                <div className="text-xl font-bold text-[#E6EDFD]">
                  {examResultSummary.incorrect}
                </div>
                <div className="text-[11px] text-[#AFC5F8] mt-0.5">Incorrect</div>
              </div>
              <div className="rounded-2xl p-3.5 text-center bg-[#071039]/55 border border-[#AFC5F8]/25">
                <div className="text-xl font-bold text-[#E6EDFD]">
                  {examResultSummary.unattempted}
                </div>
                <div className="text-[11px] text-[#AFC5F8] mt-0.5">Skipped</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setViewMode('content');
                setExamResultSummary(null);
              }}
              className="w-full py-3 rounded-2xl font-bold text-xs uppercase tracking-wider text-[#E6EDFD] cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
                border: '1px solid rgba(230,237,253,0.6)',
              }}
            >
              Back to Course Folders
            </button>
          </div>
        </div>
      )}
    </main>

      {/*
        The full-screen overlays below are siblings of <main>, not children, on purpose.
        The Red / Green / Custom palettes put `filter: hue-rotate()` on <main> (see index.css),
        and a filtered ancestor becomes the containing block for `position: fixed`. An overlay
        inside <main> is then laid out against the whole page instead of the screen, so its
        card ends up off-screen. As direct children of .site-shell (like the PDF viewer and the
        notifications drawer) they still pick up the palette through `.theme-* > .fixed`.
      */}

      {/* =================== GLASSMORPHIC VIDEO ACTION MODAL =================== */}
      {videoModal && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setVideoModal(null);
          }}
          className="fixed inset-0 z-[100] flex justify-center p-4 overflow-y-auto overscroll-contain"
          style={{
            background: 'rgba(7, 16, 57, 0.78)',
            backdropFilter: 'var(--glass-overlay-filter)',
            WebkitBackdropFilter: 'var(--glass-overlay-filter)',
          }}
        >
          <div
            className="relative w-full max-w-md my-auto rounded-[28px] p-6 text-[#E6EDFD] overflow-hidden animate-pop-in"
            style={{
              background:
                'linear-gradient(160deg, rgba(46,93,230,0.35) 0%, rgba(15,34,112,0.90) 52%, rgba(7,16,57,0.97) 100%)',
              backdropFilter: 'var(--glass-filter)',
              WebkitBackdropFilter: 'var(--glass-filter)',
              border: '1.5px solid rgba(230,237,253,0.48)',
              boxShadow:
                '0 25px 60px -12px rgba(7,16,57,0.95), 0 0 40px rgba(46,93,230,0.35), inset 0 1.5px 2px rgba(230,237,253,0.45)',
            }}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <GlassPlayIcon className="w-11 h-11 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#AFC5F8]">
                    Lecture Stream Ready
                  </span>
                  <h3 className="font-display font-bold text-base text-[#E6EDFD] line-clamp-2">
                    {videoModal.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setVideoModal(null)}
                className="p-1.5 rounded-full text-[#AFC5F8] hover:text-[#E6EDFD] hover:bg-white/10 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full aspect-video rounded-2xl overflow-hidden mb-5 border border-[#AFC5F8]/35 bg-[#071039]">
              <img
                src={videoModal.thumbnail}
                alt={videoModal.title}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleWatchNowFromModal}
                className="w-full py-3.5 px-4 rounded-2xl font-display font-bold text-sm text-[#E6EDFD] flex items-center justify-center gap-2 transition-ui hover:-translate-y-0.5 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
                  border: '1px solid rgba(230,237,253,0.65)',
                  boxShadow: '0 10px 24px rgba(46,93,230,0.55)',
                }}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Watch Lecture Now</span>
              </button>

              {videoModal.qualities.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setVideoModal((prev) =>
                      prev ? { ...prev, showQualityList: !prev.showQualityList } : null
                    )
                  }
                  className="w-full py-3 px-4 rounded-2xl font-bold text-xs text-[#E6EDFD] flex items-center justify-center gap-2 transition-colors hover:bg-white/15 cursor-pointer"
                  style={{
                    background: 'rgba(15, 34, 112, 0.65)',
                    border: '1px solid rgba(175, 197, 248, 0.38)',
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>Download Video ({videoModal.qualities.length} Qualities)</span>
                </button>
              )}

              {videoModal.showQualityList && videoModal.qualities.length > 0 && (
                <div className="p-3 rounded-2xl bg-[#071039]/70 border border-[#AFC5F8]/30">
                  <div className="text-[10px] font-bold text-[#AFC5F8] uppercase tracking-wider mb-2">
                    Select Resolution to Download
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {videoModal.qualities.map((q) => (
                      <a
                        key={q.title}
                        href={q.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-[#2E5DE6]/45 hover:bg-[#2E5DE6] border border-[#E6EDFD]/35 text-[#E6EDFD] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>{q.title}p</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =================== SUBMIT TEST MODAL =================== */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] bg-[#071039]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-surface rounded-[28px] p-6 max-w-sm w-full text-center animate-pop-in">
            <GlassShieldIcon className="w-12 h-12 mx-auto mb-3" />
            <h3 className="text-xl font-display font-bold text-[#E6EDFD] mb-2">
              Submit Assessment
            </h3>
            <p className="text-[#AFC5F8] text-xs sm:text-sm mb-6">
              Are you sure you want to submit? You cannot change answers after submission.
            </p>
            <div className="flex gap-3 justify-center w-full">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#071039]/60 border border-[#AFC5F8]/35 text-[#E6EDFD] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmitTest}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-xs text-[#E6EDFD] bg-[#2E5DE6] border border-[#E6EDFD]/50 cursor-pointer"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== EXAM LOADING MODAL =================== */}
      {examLoadingText && (
        <div className="fixed inset-0 z-[110] bg-[#071039]/90 backdrop-blur-md flex items-center justify-center flex-col gap-3">
          <Loader2 className="w-9 h-9 text-[#6E92F2] animate-spin" />
          <h2 className="text-sm font-display font-bold text-[#E6EDFD] tracking-wide">
            {examLoadingText}
          </h2>
        </div>
      )}
    </>
  );
};

interface ContentGridCardProps {
  item: CourseContentItem;
  index: number;
  onFolderClick: (folderId: string, folderTitle: string) => void;
  onVideoClick: (item: CourseContentItem) => void;
  onPdfClick: (item: CourseContentItem) => void;
  onTestClick: (testId: string, title: string) => void;
  formatDuration: (sec?: number) => string;
  formatDate: (ts?: number) => string;
}

const FOLDER_TILTS = [-6, 5, -5, 6, -4, 5, -6, 4];

const ContentGridCard: React.FC<ContentGridCardProps> = ({
  item,
  index,
  onFolderClick,
  onVideoClick,
  onPdfClick,
  onTestClick,
  formatDuration,
  formatDate,
}) => {
  // 1. SUBJECT / CHAPTER FOLDER ITEM -> 3D GLASS FOLDER CARD (replicates PlatformFolderCard)
  if (item.type === 'folder') {
    const counts = item.data?.content_counts || {};
    const fCount = counts.folders?.total || 0;
    const vCount = (counts.video?.paid || 0) + (counts.video?.free || 0);
    const pCount = (counts.pdf?.paid || 0) + (counts.pdf?.free || 0);
    const tCount = (counts.test?.paid || 0) + (counts.test?.free || 0);

    const badges: string[] = [];
    if (vCount > 0) badges.push(`${vCount} Videos`);
    if (pCount > 0) badges.push(`${pCount} PDFs`);
    if (tCount > 0) badges.push(`${tCount} Tests`);
    if (fCount > 0) badges.push(`${fCount} Folders`);

    const metaSummary = badges.length > 0 ? badges.slice(0, 2).join(' · ') : 'Open Folder';
    const subtitleText =
      badges.length > 2 ? badges.slice(2).join(' · ') : fCount > 0 ? `${fCount} Subfolders` : 'Lectures & Notes';
    const hasThumb = Boolean(item.data?.thumbnail && item.data.thumbnail.trim() !== '');
    const tiltAngle = FOLDER_TILTS[index % FOLDER_TILTS.length];
    const gradId = `${item.entity_id}-${index}`;

    return (
      <div
        onClick={() => onFolderClick(item.entity_id, item.title)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onFolderClick(item.entity_id, item.title);
          }
        }}
        className="group relative w-full aspect-[280/242] select-none transition-ui duration-200 ease-out hover:-translate-y-2 cursor-pointer text-left animate-pop-in"
      >
        {/* Ambient Ultramarine Floor Shadow */}
        <div
          className="pointer-events-none absolute -bottom-3 inset-x-5 h-10 rounded-full opacity-70 transition-ui duration-200 group-hover:opacity-100 group-hover:scale-105"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(46,93,230,0.65) 0%, rgba(15,34,112,0.45) 55%, rgba(7,16,57,0) 80%)',
          }}
        />

        {/* LAYER 1: SVG FOLDER BACK PLATE WITH CURVED TOP-LEFT TAB */}
        <svg
          viewBox="0 0 280 242"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="folder-backplate absolute inset-0 w-full h-full"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={`subFolderBack-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#6E92F2" />
              <stop offset="28%" stopColor="#2E5DE6" />
              <stop offset="72%" stopColor="#1A3BB0" />
              <stop offset="100%" stopColor="#0F2270" />
            </linearGradient>
            <linearGradient id={`subFolderRim-${gradId}`} x1="0%" y1="0%" x2="100%" y2="40%">
              <stop offset="0%" stopColor="#E6EDFD" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#AFC5F8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#6E92F2" stopOpacity="0.2" />
            </linearGradient>
          </defs>
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
            fill={`url(#subFolderBack-${gradId})`}
          />
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
            stroke={`url(#subFolderRim-${gradId})`}
            strokeWidth="2"
          />
        </svg>

        {/* LAYER 2: INNER DOCUMENT SLEEVE + TILTED SUBJECT CARD */}
        <div className="absolute inset-x-[7.5%] top-[17.5%] bottom-[8%] pointer-events-none flex items-start justify-center">
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

          <div
            className="absolute -top-[10%] right-[10%] w-[44%] aspect-square rounded-[20px] p-1.5 transition-ui duration-200 ease-out group-hover:-translate-y-3.5 group-hover:scale-105"
            style={{
              transform: `rotate(${tiltAngle}deg)`,
              background: 'linear-gradient(145deg, #071039 0%, #0F2270 65%, #1A3BB0 100%)',
              border: '2px solid rgba(230,237,253,0.78)',
              boxShadow: 'var(--folder-logo-shadow)',
            }}
          >
            <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-[#071039] flex items-center justify-center">
              {hasThumb ? (
                <img
                  src={item.data.thumbnail!}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-[12px]"
                />
              ) : (
                <GlassFolderIcon className="w-12 h-12" />
              )}
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

        {/* LAYER 3: FROSTED GLASS FRONT POCKET */}
        <div
          className="folder-pocket absolute inset-x-0 bottom-0 h-[71.5%] rounded-[22px] overflow-hidden flex flex-col justify-between p-3.5 sm:p-4 transition-ui duration-200"
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

          {/* Diagonal sheen */}
          <div
            className="desktop-sheen pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out"
            style={{
              background:
                'linear-gradient(105deg, transparent 20%, rgba(230,237,253,0.26) 50%, transparent 80%)',
            }}
          />

          <div className="relative z-10 flex items-start justify-between gap-2 px-1.5 pt-0.5">
            <div className="text-left min-w-0">
              <h3 className="font-display font-bold text-[14px] sm:text-[16px] leading-snug tracking-tight text-[#E6EDFD] line-clamp-2 group-hover:text-white transition-colors">
                {item.title}
              </h3>
              <p className="text-[10.5px] sm:text-[11.5px] font-medium text-[#E6EDFD]/80 truncate mt-0.5">
                {subtitleText}
              </p>
            </div>

            <div
              className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center"
              style={{
                border: '1.25px solid rgba(230,237,253,0.75)',
                background: 'rgba(230,237,253,0.12)',
              }}
            >
              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 text-[#E6EDFD]" fill="currentColor">
                <circle cx="8" cy="3.5" r="1.2" />
                <circle cx="8" cy="8" r="1.2" />
                <circle cx="8" cy="12.5" r="1.2" />
              </svg>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between px-1.5 pb-0.5 gap-1">
            <span className="text-[10px] sm:text-[11px] font-semibold tracking-wide text-[#E6EDFD]/90 truncate">
              {metaSummary}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[#E6EDFD] shrink-0"
              style={{
                background: 'rgba(7,16,57,0.42)',
                border: '1px solid rgba(230,237,253,0.32)',
              }}
            >
              <span>Open</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. FILE ITEM (Video or PDF) -> DUAL-LAYER 3D GLASS CARD
  if (item.type === 'file') {
    const fileType = item.data?.file_type;
    const isVideo = fileType === 2 || (item.data?.video_type || 0) > 0;

    if (isVideo) {
      const fallbackThumbnail =
        'https://decicqog4ulhy.cloudfront.net/0/admin_v2/uploads/courses/thumbnail/2671188_1_logo.jpg';
      const thumbnail = item.data?.thumbnail?.trim() ? item.data.thumbnail : fallbackThumbnail;
      const durationRaw = item.data?.duration || 0;
      const duration = formatDuration(durationRaw);
      const formattedDate = formatDate(item.data?.created_at);

      const isLive = item.data?.is_live == 1;
      const videoType = item.data?.video_type;
      const vdcId = item.data?.vdc_id || '';
      const isYouTube = !vdcId && videoType == 1;

      return (
        <div
          onClick={() => onVideoClick(item)}
          className="group relative pt-2.5 cursor-pointer flex flex-col transition-ui duration-200 hover:-translate-y-1.5 animate-pop-in"
        >
          {/* Tilted Vivid Backplate */}
          <div
            className="pointer-events-none absolute top-0 left-3 right-5 h-8 rounded-t-2xl"
            style={{
              transform: index % 2 === 0 ? 'rotate(-1.2deg)' : 'rotate(1.2deg)',
              background: 'linear-gradient(90deg, #2E5DE6 0%, #6E92F2 55%, #1A3BB0 100%)',
              border: '1px solid rgba(230,237,253,0.45)',
            }}
          />

          <div className="glass-card relative z-10 rounded-[22px] p-2.5 flex flex-col flex-1 overflow-hidden">
            <div className="relative aspect-[16/9] w-full rounded-[14px] bg-[#071039] overflow-hidden border border-[#AFC5F8]/35 mb-2.5">
              <img
                src={thumbnail}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-[#071039]/25 group-hover:bg-[#071039]/45 transition-colors flex items-center justify-center">
                <div className="scale-90 group-hover:scale-105 transition-transform">
                  <GlassPlayIcon className="w-11 h-11" />
                </div>
              </div>

              <div className="absolute top-2 left-2">
                <span
                  className="text-[9.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full text-[#E6EDFD] flex items-center gap-1"
                  style={{
                    background: isLive
                      ? 'rgba(46, 93, 230, 0.9)'
                      : 'rgba(7, 16, 57, 0.8)',
                    border: '1px solid rgba(230, 237, 253, 0.45)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E6EDFD]" />
                  {isYouTube ? 'YOUTUBE' : isLive ? 'LIVE' : 'LECTURE'}
                </span>
              </div>

              {durationRaw > 0 && (
                <div className="absolute bottom-2 right-2 bg-[#071039]/85 px-2 py-0.5 rounded-md text-[10px] font-mono text-[#E6EDFD] border border-[#AFC5F8]/30">
                  {duration}
                </div>
              )}
            </div>

            <div className="px-1 flex-1 flex flex-col justify-between">
              <h3 className="text-[#E6EDFD] font-display font-bold text-xs sm:text-[13.5px] leading-snug line-clamp-2 group-hover:text-white">
                {item.title}
              </h3>
              <div className="mt-2 pt-2 border-t border-[#AFC5F8]/20 flex items-center justify-between text-[10px] text-[#AFC5F8] font-semibold">
                <span>{formattedDate || 'HD Lecture'}</span>
                <span className="text-[#E6EDFD] font-bold flex items-center gap-1">
                  Watch <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // PDF ITEM -> DUAL-LAYER 3D GLASS DOCUMENT CARD
    const formattedDate = formatDate(item.data?.created_at);
    return (
      <div
        onClick={() => onPdfClick(item)}
        className="group relative pt-2.5 cursor-pointer flex flex-col transition-ui duration-200 hover:-translate-y-1.5 animate-pop-in"
      >
        <div
          className="pointer-events-none absolute top-0 left-3 right-5 h-8 rounded-t-2xl"
          style={{
            transform: index % 2 === 0 ? 'rotate(-1.2deg)' : 'rotate(1.2deg)',
            background: 'linear-gradient(90deg, #6E92F2 0%, #2E5DE6 100%)',
            border: '1px solid rgba(230,237,253,0.45)',
          }}
        />
        <div className="glass-card relative z-10 rounded-[22px] p-3.5 flex flex-col justify-between flex-1 min-h-[195px]">
          <div className="flex items-start justify-between gap-2">
            <GlassDocsIcon className="w-12 h-12" />
            <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider text-[#E6EDFD] bg-[#071039]/60 border border-[#AFC5F8]/35">
              PDF Notes
            </span>
          </div>

          <div className="my-3">
            <h3 className="text-[#E6EDFD] font-display font-bold text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-white">
              {item.title}
            </h3>
            {formattedDate && (
              <p className="text-[10px] text-[#AFC5F8] mt-1 font-medium">{formattedDate}</p>
            )}
          </div>

          <div className="pt-2.5 border-t border-[#AFC5F8]/20 flex items-center justify-between text-[11px] font-bold text-[#E6EDFD]">
            <span>Lecture Attachment</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#2E5DE6]/65 border border-[#E6EDFD]/40 text-[10px]">
              Read PDF <ExternalLink className="w-2.5 h-2.5" />
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. TEST ITEM -> DUAL-LAYER 3D GLASS ASSESSMENT CARD
  if (item.type === 'test') {
    const testId = String(item.data?.id || item.entity_id);
    const title = item.title || item.data?.test_name || 'Practice Assessment';

    return (
      <div
        onClick={() => onTestClick(testId, title)}
        className="group relative pt-2.5 cursor-pointer flex flex-col transition-ui duration-200 hover:-translate-y-1.5 animate-pop-in"
      >
        <div
          className="pointer-events-none absolute top-0 left-3 right-5 h-8 rounded-t-2xl"
          style={{
            transform: index % 2 === 0 ? 'rotate(-1.2deg)' : 'rotate(1.2deg)',
            background: 'linear-gradient(90deg, #2E5DE6 0%, #6E92F2 100%)',
            border: '1px solid rgba(230,237,253,0.45)',
          }}
        />
        <div className="glass-card relative z-10 rounded-[22px] p-3.5 flex flex-col justify-between flex-1 min-h-[195px]">
          <div className="flex items-start justify-between gap-2">
            <GlassMedalIcon className="w-12 h-12" />
            <span className="px-2.5 py-0.5 rounded-full text-[9.5px] font-bold uppercase tracking-wider text-[#E6EDFD] bg-[#2E5DE6]/55 border border-[#E6EDFD]/40">
              Mock Test
            </span>
          </div>

          <div className="my-3">
            <h3 className="text-[#E6EDFD] font-display font-bold text-xs sm:text-sm leading-snug line-clamp-2 group-hover:text-white">
              {title}
            </h3>
          </div>

          <button
            type="button"
            className="w-full py-2 rounded-xl text-xs font-bold text-[#E6EDFD] transition-ui cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
              border: '1px solid rgba(230,237,253,0.55)',
            }}
          >
            Attempt Assessment
          </button>
        </div>
      </div>
    );
  }

  return null;
};
