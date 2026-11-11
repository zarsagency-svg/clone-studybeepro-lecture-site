import React, { useEffect, useState, useCallback } from 'react';
import logo from '../assets/logo.jpg';
import {
  CourseContentItem,
  CourseOverviewData,
  DownloadQuality,
  TestQuestion,
  fetchCourseOverview,
  fetchFolderContent,
  fetchWithFallback,
  generateFallbackTestQuestions,
  parseDownloadUrls,
} from '../services/studybeeApi';
import { BatchItem } from '../data/batches';
import { ActiveVideoParams } from './VideoPlayerView';

interface BatchContentViewProps {
  courseId: string;
  batchFallback?: BatchItem;
  onBackToHome: () => void;
  onSelectBatch: (newCourseId: string) => void;
  onPlayVideo: (params: ActiveVideoParams) => void;
  onOpenPdf: (courseId: string, contentId: string, title: string, directUrl?: string) => void;
}

interface FolderBreadcrumb {
  id: string;
  title: string;
}

interface SelectedVideoModalState {
  courseId: string;
  contentId: string;
  vdcId: string;
  ytUrl: string;
  title: string;
  thumbnail: string;
  downloadUrlsRaw?: string | null;
  directFileUrl?: string;
  qualities: DownloadQuality[];
  showQualityList: boolean;
}

export const BatchContentView: React.FC<BatchContentViewProps> = ({
  courseId,
  batchFallback,
  onBackToHome,
  onSelectBatch,
  onPlayVideo,
  onOpenPdf,
}) => {
  const [viewMode, setViewMode] = useState<'content' | 'instructions' | 'exam' | 'result'>('content');
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'live'>('overview');

  const [overview, setOverview] = useState<CourseOverviewData | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [effectiveCourseId, setEffectiveCourseId] = useState(courseId);
  const [folderHistory, setFolderHistory] = useState<FolderBreadcrumb[]>([
    { id: '0', title: 'Course Content' },
  ]);
  const [folderItems, setFolderItems] = useState<CourseContentItem[]>([]);
  const [rootFolders, setRootFolders] = useState<CourseContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);

  // Video Options Modal
  const [videoModal, setVideoModal] = useState<SelectedVideoModalState | null>(null);

  // Live Classes Tab state
  const [liveItems, setLiveItems] = useState<CourseContentItem[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  // Exam Engine State
  const [currentTestId, setCurrentTestId] = useState<string | null>(null);
  const [currentTestTitle, setCurrentTestTitle] = useState('');
  const [testDurationMins, setTestDurationMins] = useState(15);
  const [testInstructionsHtml, setTestInstructionsHtml] = useState('Loading instructions...');
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userResponses, setUserResponses] = useState<
    Record<string, { selected: string[]; time_spent: number; status: string }>
  >({});
  const [remainingSeconds, setRemainingSeconds] = useState(900);
  const [examLoadingText, setExamLoadingText] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [examResultSummary, setExamResultSummary] = useState<{
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
  } | null>(null);

  // Load overview and root folder when courseId changes
  const loadFolder = useCallback(
    async (folderId: string, folderTitle: string, targetCourseId = effectiveCourseId) => {
      setFolderHistory((prev) => {
        const existingIndex = prev.findIndex((f) => f.id === folderId);
        if (existingIndex > -1) {
          return prev.slice(0, existingIndex + 1);
        }
        return [...prev, { id: folderId, title: folderTitle }];
      });

      setContentLoading(true);
      const { items, effectiveCourseId: resolvedId } = await fetchFolderContent(
        targetCourseId,
        folderId
      );
      if (folderId === '0') {
        setEffectiveCourseId(resolvedId);
        setRootFolders(items);
      }
      setFolderItems(items);
      setContentLoading(false);
    },
    [effectiveCourseId]
  );

  useEffect(() => {
    let mounted = true;
    setEffectiveCourseId(courseId);
    setViewMode('content');
    setActiveTab('overview');
    setFolderHistory([{ id: '0', title: 'Course Content' }]);
    setOverviewLoading(true);
    setContentLoading(true);

    fetchCourseOverview(courseId).then((data) => {
      if (!mounted) return;
      setOverview(data);
      setOverviewLoading(false);
    });

    fetchFolderContent(courseId, '0').then(({ items, effectiveCourseId: resolvedId }) => {
      if (!mounted) return;
      setEffectiveCourseId(resolvedId);
      setFolderItems(items);
      setRootFolders(items);
      setContentLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [courseId]);

  // Discover live / recorded video lectures when switching to Live Classes tab
  const loadLiveTabLectures = useCallback(async () => {
    setLiveLoading(true);
    try {
      const collectedVideos: CourseContentItem[] = [];
      // Check root items first
      for (const item of rootFolders) {
        if (item.type === 'file' && (item.data?.file_type === 2 || (item.data?.video_type || 0) > 0)) {
          collectedVideos.push(item);
        }
      }

      // Inspect first few folders to find recent video lectures
      const foldersToScan = rootFolders.filter((i) => i.type === 'folder').slice(0, 4);
      for (const folder of foldersToScan) {
        if (collectedVideos.length >= 10) break;
        const sub = await fetchFolderContent(effectiveCourseId, folder.entity_id);
        for (const subItem of sub.items) {
          if (
            subItem.type === 'file' &&
            (subItem.data?.file_type === 2 || (subItem.data?.video_type || 0) > 0)
          ) {
            collectedVideos.push(subItem);
          } else if (subItem.type === 'folder' && collectedVideos.length < 8) {
            const deep = await fetchFolderContent(effectiveCourseId, subItem.entity_id);
            for (const dItem of deep.items) {
              if (
                dItem.type === 'file' &&
                (dItem.data?.file_type === 2 || (dItem.data?.video_type || 0) > 0)
              ) {
                collectedVideos.push(dItem);
              }
              if (dItem.type === 'folder' && collectedVideos.length < 6) {
                const deeper = await fetchFolderContent(effectiveCourseId, dItem.entity_id);
                for (const dpItem of deeper.items) {
                  if (
                    dpItem.type === 'file' &&
                    (dpItem.data?.file_type === 2 || (dpItem.data?.video_type || 0) > 0)
                  ) {
                    collectedVideos.push(dpItem);
                  }
                }
              }
            }
          }
        }
      }
      setLiveItems(collectedVideos.slice(0, 15));
    } catch {
      // ignore
    } finally {
      setLiveLoading(false);
    }
  }, [rootFolders, effectiveCourseId]);

  useEffect(() => {
    if (activeTab === 'live' && liveItems.length === 0 && !liveLoading && rootFolders.length > 0) {
      loadLiveTabLectures();
    }
  }, [activeTab, liveItems.length, liveLoading, rootFolders.length, loadLiveTabLectures]);

  // Exam Timer Effect
  useEffect(() => {
    if (viewMode !== 'exam') return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          handleConfirmSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [viewMode]);

  const formatDuration = (seconds?: number) => {
    if (!seconds || isNaN(seconds) || seconds <= 0) return '00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const mStr = m.toString().padStart(2, '0');
    const sStr = s.toString().padStart(2, '0');
    return h > 0 ? `${h}:${mStr}:${sStr}` : `${mStr}:${sStr}`;
  };

  const formatDate = (unixTimestamp?: number) => {
    if (!unixTimestamp) return '';
    const date = new Date(unixTimestamp * 1000);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
    setTestInstructionsHtml('<div class="py-10 text-stone-400">Loading instructions...</div>');

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

  const displayTitle =
    overview?.title || batchFallback?.title || 'Loading Batch...';
  const displayThumb = overview?.thumbnail || batchFallback?.thumbnail || '';

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a] text-[#f4f4f5] relative">
      {/* Header matching batch.html */}
      <header className="nav-glass px-4 py-3 sticky top-0 z-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 md:gap-6">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-2 text-textDim hover:text-white transition-colors text-sm font-semibold btn-click-effect"
          >
            <i className="fa-solid fa-arrow-left" />
            <span className="hidden md:inline">Back</span>
          </button>
          <div
            onClick={onBackToHome}
            className="flex items-center gap-3 cursor-pointer btn-click-effect"
          >
            <div className="w-8 h-8 md:w-9 md:h-9 bg-black border border-white/10 rounded-lg flex items-center justify-center overflow-hidden">
              <img src={logo} alt="MindSpark logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-lg font-bold tracking-wider text-white font-syne">
              MIND<span className="text-themeRed">SPARK</span>
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 rounded-md border border-green-500/20 text-[10px] md:text-xs font-semibold text-green-400 uppercase tracking-wide">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Enrolled
        </div>
      </header>

      <main className="max-w-[1400px] w-full mx-auto p-4 md:p-6 flex-1 relative z-10 flex flex-col pb-12">
        {/* =================== FOLDER/CONTENT VIEW =================== */}
        {viewMode === 'content' && (
          <div className="w-full flex flex-col flex-1 pb-12">
            {/* Course Banner */}
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col-reverse md:flex-row items-center justify-between gap-8 mb-8 shadow-xl relative overflow-hidden">
              <div className="absolute -top-32 -left-32 w-64 h-64 bg-themeRed/10 blur-[100px] rounded-full pointer-events-none" />

              <div className="flex flex-col items-start gap-3 flex-1 w-full relative z-10">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-themeRed uppercase tracking-wider bg-themeRed/10 px-2.5 py-1 rounded border border-themeRed/20">
                    Premium Course
                  </span>
                  {effectiveCourseId !== courseId && (
                    <span className="text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">
                      Full Lecture Archive Unlocked
                    </span>
                  )}
                </div>
                <h2 className="text-2xl md:text-4xl font-bold text-white leading-tight">
                  {displayTitle}
                </h2>
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <button
                    onClick={() => setActiveTab('content')}
                    className="bg-themeRed hover:bg-red-500 text-black px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors btn-click-effect shadow-md"
                  >
                    <i className="fa-solid fa-play" /> Browse Lectures &amp; Notes
                  </button>
                  {activeTab !== 'live' && (
                    <button
                      onClick={() => setActiveTab('live')}
                      className="bg-white/5 hover:bg-white/10 text-white border border-white/10 px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors btn-click-effect"
                    >
                      <i className="fa-solid fa-video text-themeRed" /> Live &amp; Marathon Classes
                    </button>
                  )}
                </div>
              </div>

              {displayThumb && (
                <div className="w-full md:w-auto shrink-0 flex justify-center md:justify-end relative z-10">
                  <img
                    src={displayThumb}
                    alt={displayTitle}
                    className="w-full max-w-[300px] rounded-xl border border-white/10 object-cover aspect-[16/9]"
                  />
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-6 md:gap-8 border-b border-white/10 mb-6 overflow-x-auto scrollbar-hide w-full shrink-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-3 text-sm md:text-base font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap btn-click-effect shrink-0 ${
                  activeTab === 'overview'
                    ? 'text-themeRed border-themeRed'
                    : 'text-textDim hover:text-white border-transparent'
                }`}
              >
                <i className="fa-solid fa-circle-info" /> Overview
              </button>
              <button
                onClick={() => setActiveTab('content')}
                className={`pb-3 text-sm md:text-base font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap btn-click-effect shrink-0 ${
                  activeTab === 'content'
                    ? 'text-themeRed border-themeRed'
                    : 'text-textDim hover:text-white border-transparent'
                }`}
              >
                <i className="fa-regular fa-folder-open" /> Content
                {rootFolders.length > 0 && (
                  <span className="bg-white/10 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {rootFolders.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('live')}
                className={`pb-3 text-sm md:text-base font-semibold flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap btn-click-effect shrink-0 ${
                  activeTab === 'live'
                    ? 'text-themeRed border-themeRed'
                    : 'text-textDim hover:text-white border-transparent'
                }`}
              >
                <i className="fa-solid fa-video" /> Live Classes
              </button>
            </div>

            {/* =================== TAB 1: OVERVIEW =================== */}
            {activeTab === 'overview' && (
              <div className="space-y-8 animate-pop-in">
                {/* Included Combo Packages if present */}
                {overview?.packages && overview.packages.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 mb-4 flex items-center gap-2">
                      <i className="fa-solid fa-layer-group text-themeRed" /> Included Combo Packages
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {overview.packages.map((pkg) => (
                        <div
                          key={pkg.id}
                          onClick={() => onSelectBatch(String(pkg.id))}
                          className="glass-card rounded-xl p-3 flex items-center gap-4 cursor-pointer btn-click-effect"
                        >
                          <img
                            src={pkg.thumbnail}
                            alt={pkg.title}
                            className="w-24 aspect-[16/9] rounded-lg object-cover border border-white/10 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-themeGreen bg-themeGreen/10 px-1.5 py-0.5 rounded">
                              INCLUDED
                            </span>
                            <h4 className="text-white font-semibold text-sm truncate mt-1">
                              {pkg.title}
                            </h4>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Subject Folders Preview on Overview so lectures are always 1 click away */}
                {rootFolders.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-stone-400 flex items-center gap-2">
                        <i className="fa-solid fa-folder-tree text-themeRed" /> Subject Folders &amp; Lectures
                      </h3>
                      <button
                        onClick={() => setActiveTab('content')}
                        className="text-xs font-bold text-themeRed hover:underline flex items-center gap-1"
                      >
                        Open Full Content Browser <i className="fa-solid fa-arrow-right text-[10px]" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {rootFolders.slice(0, 10).map((item, idx) => (
                        <ContentGridCard
                          key={item.entity_id}
                          item={item}
                          index={idx}
                          onFolderClick={(fId, fTitle) => {
                            setActiveTab('content');
                            loadFolder(fId, fTitle);
                          }}
                          onVideoClick={handleVideoCardClick}
                          onPdfClick={(item) =>
                            onOpenPdf(
                              effectiveCourseId,
                              item.entity_id,
                              item.title,
                              item.data?.file_url
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
                <div className="bg-[#121212] border border-white/5 rounded-xl p-6 md:p-8 text-gray-300 leading-relaxed text-sm md:text-base course-desc-html">
                  <h3 className="text-white font-bold text-base mb-4 pb-3 border-b border-white/5 flex items-center gap-2">
                    <i className="fa-solid fa-circle-info text-themeRed" /> Batch Details &amp; Syllabus
                  </h3>
                  {overviewLoading ? (
                    <p className="animate-pulse text-stone-400">Loading description...</p>
                  ) : overview?.description ? (
                    <div dangerouslySetInnerHTML={{ __html: overview.description }} />
                  ) : (
                    <p>
                      Complete premium batch with live interactive classes, recorded video lectures,
                      chapter-wise PDF notes, and mock assessments.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* =================== TAB 2: CONTENT =================== */}
            {activeTab === 'content' && (
              <div className="flex flex-col h-full animate-pop-in">
                {/* Breadcrumbs */}
                <div className="mb-5 bg-[#121212] p-3 rounded-lg flex items-center overflow-x-auto whitespace-nowrap scrollbar-hide border border-white/5">
                  <div className="flex items-center text-xs md:text-sm font-medium text-textDim px-1">
                    {folderHistory.map((folder, index) => {
                      const isFirst = index === 0;
                      const isLast = index === folderHistory.length - 1;
                      return (
                        <span key={`${folder.id}-${index}`} className="flex items-center">
                          <button
                            disabled={isLast}
                            onClick={() => {
                              if (!isLast) loadFolder(folder.id, folder.title);
                            }}
                            className={`transition-colors btn-click-effect flex items-center gap-1.5 ${
                              isLast
                                ? 'text-white font-semibold cursor-default'
                                : 'text-textDim hover:text-white cursor-pointer'
                            }`}
                          >
                            {isFirst && <i className="fa-solid fa-home mr-0.5 text-themeRed" />}
                            <span>{folder.title}</span>
                          </button>
                          {!isLast && (
                            <i className="fa-solid fa-chevron-right text-[10px] mx-2.5 text-stone-600" />
                          )}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Loader */}
                {contentLoading ? (
                  <div className="flex flex-col justify-center items-center py-20">
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-themeRed mb-3" />
                    <p className="text-stone-400 text-sm font-medium">Loading content...</p>
                  </div>
                ) : folderItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                    {folderItems.map((item, index) => (
                      <ContentGridCard
                        key={`${item.entity_id}-${index}`}
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
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/5">
                      <i className="fa-regular fa-folder-open text-2xl text-stone-500" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Folder is Empty</h3>
                    <p className="text-sm text-textDim">No content available here yet.</p>
                  </div>
                )}
              </div>
            )}

            {/* =================== TAB 3: LIVE CLASSES =================== */}
            {activeTab === 'live' && (
              <div className="flex flex-col h-full animate-pop-in space-y-6">
                <div className="bg-[#121212] border border-white/5 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-sm sm:text-base">
                        Live &amp; Marathon Recorded Sessions
                      </h3>
                      <p className="text-stone-400 text-xs mt-0.5">
                        Watch recent live streams, doubt classes, and marathon sessions from this batch.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('content')}
                    className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white border border-white/10 transition-colors shrink-0"
                  >
                    Browse All Folders
                  </button>
                </div>

                {liveLoading ? (
                  <div className="flex flex-col justify-center items-center py-20">
                    <i className="fa-solid fa-circle-notch fa-spin text-3xl text-themeRed mb-3" />
                    <p className="text-stone-400 text-sm font-medium">
                      Fetching recent live &amp; recorded classes...
                    </p>
                  </div>
                ) : liveItems.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5">
                    {liveItems.map((item, idx) => (
                      <ContentGridCard
                        key={`${item.entity_id}-${idx}`}
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
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center bg-[#121212] rounded-xl border border-white/5">
                    <i className="fa-solid fa-video-slash text-2xl text-stone-500 mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">No Active Live Broadcast</h3>
                    <p className="text-xs text-stone-400 mb-4">
                      All completed live classes are organized inside the subject folders.
                    </p>
                    <button
                      onClick={() => setActiveTab('content')}
                      className="px-5 py-2 rounded-lg bg-themeRed text-black font-bold text-xs uppercase tracking-wider"
                    >
                      Open Subject Folders
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* =================== EXAM INSTRUCTIONS VIEW =================== */}
        {viewMode === 'instructions' && (
          <div className="max-w-[800px] mx-auto w-full flex-1 flex flex-col pb-8 animate-pop-in">
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 md:p-8 flex-1 flex flex-col">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/5">
                <div className="w-12 h-12 bg-white/5 rounded-lg flex items-center justify-center border border-white/10 shrink-0">
                  <i className="fa-solid fa-clipboard-list text-white text-xl" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">
                    {currentTestTitle}
                  </h2>
                  <p className="text-sm text-textDim mt-1">
                    <i className="fa-regular fa-clock mr-1" /> {testDurationMins} Mins Duration
                  </p>
                </div>
              </div>

              <h3 className="text-lg font-semibold mb-3 text-white">Instructions</h3>
              <div
                className="flex-1 overflow-y-auto pr-2 text-gray-300 text-sm space-y-3 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: testInstructionsHtml }}
              />

              <div className="mt-8 pt-6 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-3 w-full">
                <button
                  onClick={() => {
                    setViewMode('content');
                    setCurrentTestId(null);
                  }}
                  className="px-6 py-2.5 rounded-lg font-medium text-sm bg-white/5 hover:bg-white/10 transition-colors text-white btn-click-effect"
                >
                  Cancel
                </button>
                <button
                  onClick={fetchTestDataAndStart}
                  className="px-6 py-2.5 rounded-lg font-bold text-sm bg-themeRed hover:bg-red-500 text-black transition-colors btn-click-effect"
                >
                  Start Assessment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================== EXAM LIVE VIEW =================== */}
        {viewMode === 'exam' && testQuestions[currentQuestionIndex] && (
          <div className="max-w-[800px] mx-auto w-full flex-1 flex flex-col h-[82vh] pb-4 pt-2 animate-pop-in">
            <div className="flex flex-col h-full bg-[#121212] border border-white/5 rounded-2xl overflow-hidden">
              <div className="flex justify-between items-center p-4 border-b border-white/5 bg-[#18181b] shrink-0">
                <h2 className="text-sm md:text-base font-semibold truncate pr-4 text-gray-200">
                  {currentTestTitle}
                </h2>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="bg-black/50 text-white px-3 py-1.5 rounded text-sm font-mono border border-white/10 flex items-center gap-2">
                    <i className="fa-regular fa-clock text-themeRed" />
                    <span>{formatExamTimer(remainingSeconds)}</span>
                  </div>
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    className="bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 rounded text-sm font-semibold transition-colors btn-click-effect"
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
                  <div className="flex-1 overflow-y-auto p-5 md:p-8 bg-[#0a0a0a]">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-lg font-semibold text-white">
                        Question {currentQuestionIndex + 1} of {testQuestions.length}
                      </h3>
                      <div className="text-xs font-medium text-stone-400">
                        Marks:{' '}
                        <span className="text-green-400">+{q.mark_per_question}</span> /{' '}
                        <span className="text-red-400">-{q.negative_marks}</span>
                      </div>
                    </div>
                    <div
                      className="text-base mb-8 text-gray-200 question-html leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: langData.question_text }}
                    />
                    <div className="space-y-3">
                      {opts.map((opt) => {
                        const isChecked = currentSelected === opt.key;
                        return (
                          <div
                            key={opt.key}
                            onClick={() => handleSelectOption(qId, opt.key)}
                            className={`flex items-center p-3.5 px-4 rounded-lg border cursor-pointer transition-all text-sm ${
                              isChecked
                                ? 'bg-themeRed/5 border-themeRed text-white'
                                : 'bg-[#18181b] border-white/5 text-gray-200 hover:bg-[#27272a]'
                            }`}
                          >
                            <div
                              className={`w-[18px] h-[18px] rounded-full border-2 mr-3 flex items-center justify-center shrink-0 transition-colors ${
                                isChecked ? 'border-themeRed' : 'border-zinc-600'
                              }`}
                            >
                              {isChecked && (
                                <div className="w-2 h-2 rounded-full bg-themeRed" />
                              )}
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

              <div className="p-4 border-t border-white/5 bg-[#18181b] flex justify-between gap-3 shrink-0">
                <div className="flex gap-2 w-1/2">
                  <button
                    disabled={currentQuestionIndex === 0}
                    onClick={() => setCurrentQuestionIndex((i) => Math.max(0, i - 1))}
                    className="px-4 py-2.5 bg-white/5 hover:bg-white/10 rounded-lg font-medium text-sm transition-colors text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed btn-click-effect"
                  >
                    Previous
                  </button>
                  <button
                    onClick={handleClearResponse}
                    className="px-4 py-2.5 text-stone-400 hover:text-white rounded-lg font-medium text-sm transition-colors btn-click-effect"
                  >
                    Clear
                  </button>
                </div>
                <div className="flex gap-2 w-1/2 justify-end">
                  <button
                    onClick={handleSaveAndNext}
                    className={`px-6 py-2.5 rounded-lg font-bold text-sm transition-colors btn-click-effect ${
                      currentQuestionIndex === testQuestions.length - 1
                        ? 'bg-white text-black hover:bg-gray-200'
                        : 'bg-themeRed text-black hover:bg-red-500'
                    }`}
                  >
                    {currentQuestionIndex === testQuestions.length - 1
                      ? 'Submit'
                      : 'Save & Next'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================== RESULTS DASHBOARD =================== */}
        {viewMode === 'result' && examResultSummary && (
          <div className="max-w-[800px] mx-auto w-full flex-1 pb-12 pt-4 animate-pop-in">
            <div className="bg-[#121212] border border-white/5 rounded-2xl p-6 md:p-10 max-w-3xl mx-auto">
              <div className="text-center mb-10">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <i className="fa-solid fa-flag-checkered text-2xl text-themeRed" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Assessment Complete
                </h2>
                <p className="text-stone-400 text-sm">{examResultSummary.testName}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#18181b] p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1">
                    Rank
                  </div>
                  <div className="text-xl font-bold text-white">
                    {examResultSummary.rank}{' '}
                    <span className="text-xs text-stone-600 font-normal">
                      / {examResultSummary.totalStudents}
                    </span>
                  </div>
                </div>
                <div className="bg-[#18181b] p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1">
                    Score
                  </div>
                  <div className="text-xl font-bold text-white">
                    {examResultSummary.score}{' '}
                    <span className="text-xs text-stone-600 font-normal">
                      / {examResultSummary.maxMarks}
                    </span>
                  </div>
                </div>
                <div className="bg-[#18181b] p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1">
                    Accuracy
                  </div>
                  <div className="text-xl font-bold text-white">
                    {examResultSummary.percentage}%
                  </div>
                </div>
                <div className="bg-[#18181b] p-4 rounded-xl border border-white/5 text-center">
                  <div className="text-xs text-stone-500 font-medium uppercase tracking-wider mb-1">
                    Percentile
                  </div>
                  <div className="text-xl font-bold text-white">
                    {examResultSummary.percentile}
                  </div>
                </div>
              </div>

              <div className="bg-[#18181b] rounded-xl p-5 border border-white/5 mb-8">
                <h3 className="text-sm font-semibold text-white mb-4 border-b border-white/5 pb-3">
                  Performance Breakdown
                </h3>
                <div className="flex gap-4">
                  <div className="flex-1 bg-[#121212] border border-white/5 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-400">
                      {examResultSummary.correct}
                    </div>
                    <div className="text-[10px] uppercase font-semibold text-stone-500">
                      Correct
                    </div>
                  </div>
                  <div className="flex-1 bg-[#121212] border border-white/5 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-red-400">
                      {examResultSummary.incorrect}
                    </div>
                    <div className="text-[10px] uppercase font-semibold text-stone-500">
                      Incorrect
                    </div>
                  </div>
                  <div className="flex-1 bg-[#121212] border border-white/5 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-stone-300">
                      {examResultSummary.unattempted}
                    </div>
                    <div className="text-[10px] uppercase font-semibold text-stone-500">
                      Skipped
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  onClick={() => setViewMode('content')}
                  className="px-8 py-3 rounded-xl font-bold text-sm bg-themeRed hover:bg-red-500 text-black transition-colors btn-click-effect"
                >
                  Back to Course Content
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* =================== VIDEO OPTIONS MODAL =================== */}
      {videoModal && (
        <div
          onClick={() => setVideoModal(null)}
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#18181b] border border-white/10 rounded-2xl p-6 max-w-xs w-full text-center animate-modal-in shadow-2xl"
          >
            <h3 className="text-lg font-bold text-white mb-1">Video Options</h3>
            <p className="text-xs text-stone-400 line-clamp-1 mb-4">{videoModal.title}</p>

            <div className="flex flex-col gap-2.5 w-full">
              <button
                onClick={handleWatchNowFromModal}
                className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm bg-themeRed hover:bg-red-500 text-black transition-colors btn-click-effect flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-play" /> Watch Now
              </button>

              {!videoModal.showQualityList ? (
                <button
                  onClick={() => {
                    if (videoModal.qualities.length > 0) {
                      setVideoModal({ ...videoModal, showQualityList: true });
                    } else if (videoModal.ytUrl) {
                      window.open(videoModal.ytUrl, '_blank', 'noopener,noreferrer');
                    } else {
                      handleWatchNowFromModal();
                    }
                  }}
                  className="w-full px-4 py-2.5 rounded-lg font-semibold text-sm bg-white/5 hover:bg-white/10 transition-colors text-white btn-click-effect flex items-center justify-center gap-2"
                >
                  <i className="fa-solid fa-download" /> Download
                </button>
              ) : (
                <div className="bg-black/40 border border-white/10 rounded-xl p-3 flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                    Select Quality to Download
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {videoModal.qualities.map((q) => (
                      <a
                        key={q.title}
                        href={q.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-lg bg-white/10 hover:bg-themeRed hover:text-black text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <i className="fa-solid fa-download text-[10px]" /> {q.title}p
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setVideoModal(null)}
                className="w-full mt-1 px-4 py-2 rounded-lg font-medium text-sm text-stone-400 hover:text-white transition-colors btn-click-effect"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== SUBMIT TEST MODAL =================== */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-white/10 rounded-2xl p-6 max-w-sm w-full text-center animate-modal-in">
            <h3 className="text-xl font-bold text-white mb-2">Submit Assessment</h3>
            <p className="text-textDim text-sm mb-6">
              Are you sure you want to submit? You cannot change answers after submission.
            </p>
            <div className="flex gap-3 justify-center w-full">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-sm bg-white/5 hover:bg-white/10 transition-colors text-white btn-click-effect"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSubmitTest}
                className="flex-1 px-4 py-2.5 rounded-lg font-bold text-sm bg-themeRed hover:bg-red-500 text-black transition-colors btn-click-effect"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================== EXAM LOADING MODAL =================== */}
      {examLoadingText && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex items-center justify-center flex-col">
          <i className="fa-solid fa-circle-notch fa-spin text-3xl text-themeRed mb-4" />
          <h2 className="text-sm font-semibold text-white tracking-wide">{examLoadingText}</h2>
        </div>
      )}
    </div>
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
  const delay = `${(index % 15) * 25}ms`;

  // 1. FOLDER ITEM
  if (item.type === 'folder') {
    const counts = item.data?.content_counts || {};
    const fCount = counts.folders?.total || 0;
    const vCount = (counts.video?.paid || 0) + (counts.video?.free || 0);
    const pCount = (counts.pdf?.paid || 0) + (counts.pdf?.free || 0);
    const tCount = (counts.test?.paid || 0) + (counts.test?.free || 0);

    const badges: string[] = [];
    if (fCount > 0) badges.push(`FOLDERS ${fCount}`);
    if (vCount > 0) badges.push(`VIDEO ${vCount}`);
    if (pCount > 0) badges.push(`PDF ${pCount}`);
    if (tCount > 0) badges.push(`TEST ${tCount}`);

    const countsText = badges.length > 0 ? badges.join('   ') : 'FOLDER';
    const hasThumb = item.data?.thumbnail && item.data.thumbnail.trim() !== '';

    return (
      <div
        onClick={() => onFolderClick(item.entity_id, item.title)}
        style={{ animationDelay: delay }}
        className="glass-card rounded-[20px] cursor-pointer group flex flex-col overflow-hidden h-[220px] animate-pop-in btn-click-effect"
      >
        <div className="h-[125px] w-full relative overflow-hidden bg-[#18181b] border-b border-white/5">
          {hasThumb ? (
            <img
              src={item.data.thumbnail!}
              alt={item.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#18181b]">
              <i className="fa-solid fa-folder text-4xl text-themeRed drop-shadow-[0_0_15px_rgba(250,204,21,0.3)] group-hover:scale-110 transition-transform" />
            </div>
          )}
        </div>
        <div className="p-3 flex-1 flex flex-col justify-center bg-[#121212] group-hover:bg-[#1a1a1a] transition-colors">
          <h3 className="text-white font-medium text-sm leading-snug line-clamp-2">
            {item.title}
          </h3>
          <div className="mt-2 text-[9px] text-textDim font-bold uppercase tracking-wider">
            {countsText}
          </div>
        </div>
      </div>
    );
  }

  // 2. FILE ITEM (Video or PDF)
  if (item.type === 'file') {
    const fileType = item.data?.file_type;
    const isVideo = fileType === 2 || (item.data?.video_type || 0) > 0;

    if (isVideo) {
      const fallbackThumbnail =
        'https://decicqog4ulhy.cloudfront.net/0/admin_v2/uploads/courses/thumbnail/2671188_1_logo.jpg';
      const thumbnail = item.data?.thumbnail?.trim()
        ? item.data.thumbnail
        : fallbackThumbnail;
      const durationRaw = item.data?.duration || 0;
      const duration = formatDuration(durationRaw);
      const formattedDate = formatDate(item.data?.created_at);

      const isLive = item.data?.is_live == 1;
      const videoType = item.data?.video_type;
      const vdcId = item.data?.vdc_id || '';
      const isUpcoming = !isLive && durationRaw == 0 && videoType != 4 && videoType != 1;
      const isYouTube = !vdcId && videoType == 1;

      return (
        <div
          onClick={() => onVideoClick(item)}
          style={{ animationDelay: delay }}
          className="glass-card rounded-[20px] overflow-hidden cursor-pointer group flex flex-col h-[220px] animate-pop-in btn-click-effect"
        >
          <div className="relative h-[125px] w-full bg-black overflow-hidden border-b border-white/5">
            <img
              src={thumbnail}
              alt={item.title}
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-themeRed/90 text-black flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all shadow-lg">
                <i className="fa-solid fa-play text-xs ml-0.5" />
              </div>
            </div>

            <div className="absolute top-2 left-2">
              {isYouTube ? (
                <span className="bg-red-500/20 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20 flex items-center gap-1">
                  <i className="fa-brands fa-youtube" /> YOUTUBE
                </span>
              ) : isLive ? (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 shadow-lg">
                  <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> LIVE
                </span>
              ) : isUpcoming ? (
                <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1">
                  <i className="fa-regular fa-clock" /> UPCOMING
                </span>
              ) : (
                <span className="bg-black/60 backdrop-blur-sm text-themeRed text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-themeRed" /> VIDEO
                </span>
              )}
            </div>

            {durationRaw > 0 && (
              <div className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-[10px] font-mono text-gray-200 border border-white/5">
                {duration}
              </div>
            )}
          </div>

          <div className="p-3 flex-1 flex flex-col justify-between bg-[#121212] group-hover:bg-[#1a1a1a] transition-colors">
            <h3 className="text-gray-200 font-medium text-xs md:text-sm leading-snug line-clamp-2 group-hover:text-white">
              {item.title}
            </h3>
            {formattedDate && (
              <div className="text-[10px] text-stone-500 mt-1 font-medium">
                {formattedDate}
              </div>
            )}
          </div>
        </div>
      );
    }

    // PDF ITEM
    const formattedDate = formatDate(item.data?.created_at);
    return (
      <div
        onClick={() => onPdfClick(item)}
        style={{ animationDelay: delay }}
        className="glass-card rounded-[20px] overflow-hidden cursor-pointer group flex flex-col h-[220px] animate-pop-in btn-click-effect"
      >
        <div className="relative h-[125px] w-full bg-[#18181b] flex items-center justify-center border-b border-white/5">
          <i className="fa-regular fa-file-pdf text-4xl text-red-400 group-hover:scale-110 transition-transform" />
          <div className="absolute top-2 left-2">
            <span className="bg-red-500/10 text-red-400 text-[10px] font-medium px-2 py-0.5 rounded border border-red-500/20">
              PDF
            </span>
          </div>
        </div>
        <div className="p-3 flex-1 flex flex-col justify-center bg-[#121212] group-hover:bg-[#1a1a1a] transition-colors">
          <h3 className="text-gray-200 font-medium text-sm leading-snug line-clamp-2">
            {item.title}
          </h3>
          {formattedDate && (
            <div className="text-[10px] text-stone-500 mt-2 font-medium tracking-wide">
              {formattedDate}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. TEST ITEM
  if (item.type === 'test') {
    return (
      <div
        style={{ animationDelay: delay }}
        className="col-span-full glass-card rounded-[20px] overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-all duration-200 animate-pop-in border border-white/5 hover:border-themeRed/30"
      >
        <div className="flex items-start sm:items-center gap-4 mb-4 sm:mb-0">
          <div className="w-14 h-14 shrink-0 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
            <i className="fa-solid fa-list-check text-2xl text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-indigo-500/10 text-indigo-400 text-[9px] font-bold px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-widest">
                MOCK TEST
              </span>
            </div>
            <h3 className="text-white font-medium text-base">{item.title}</h3>
          </div>
        </div>

        <button
          onClick={() => onTestClick(item.entity_id, item.title)}
          className="w-full sm:w-auto px-6 py-2.5 rounded-lg font-semibold text-sm bg-white/10 hover:bg-themeRed hover:text-black text-white transition-colors btn-click-effect"
        >
          Start Assessment
        </button>
      </div>
    );
  }

  return null;
};
