import React, { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  ChevronRight,
  ChevronLeft,
  Check,
  PictureInPicture,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import {
  CourseContentItem,
  DownloadQuality,
  resolveVideoPlayback,
} from '../services/studybeeApi';

export interface ActiveVideoParams {
  courseId: string;
  contentId: string;
  vdcId?: string;
  ytUrl?: string;
  title?: string;
  thumbnail?: string;
  downloadUrlsRaw?: string | null;
  directFileUrl?: string;
  siblingPdfs?: CourseContentItem[];
}

interface VideoPlayerViewProps {
  params: ActiveVideoParams;
  onBack: () => void;
  onOpenPdf: (courseId: string, contentId: string, title: string, directUrl?: string) => void;
}

interface QualityOption {
  label: string;
  type: 'hls-auto' | 'hls-level' | 'mp4';
  hlsLevelIndex?: number;
  mp4Url?: string;
}

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({
  params,
  onBack,
  onOpenPdf,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const shakaRef = useRef<any>(null);
  const hideControlsTimerRef = useRef<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [loaderMsg, setLoaderMsg] = useState('Resolving Source...');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [buffering, setBuffering] = useState(false);

  const [title, setTitle] = useState(params.title || 'MindSpark');
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeId, setYoutubeId] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const [activeMenu, setActiveMenu] = useState<'none' | 'notes' | 'settings'>('none');
  const [settingsSubmenu, setSettingsSubmenu] = useState<'main' | 'quality' | 'speed'>('main');

  const [qualityOptions, setQualityOptions] = useState<QualityOption[]>([]);
  const [selectedQualityLabel, setSelectedQualityLabel] = useState('Auto');
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [downloadQualities, setDownloadQualities] = useState<DownloadQuality[]>([]);

  // Visual pop indicators
  const [popIndicator, setPopIndicator] = useState<'none' | 'skip-left' | 'skip-right' | 'play' | 'pause'>('none');
  const popTimerRef = useRef<number | null>(null);

  // Double tap tracking
  const lastTapRef = useRef<{ left: number; center: number; right: number }>({
    left: 0,
    center: 0,
    right: 0,
  });
  const singleTapTimerRef = useRef<number | null>(null);

  const triggerPopIndicator = (type: 'skip-left' | 'skip-right' | 'play' | 'pause') => {
    setPopIndicator('none');
    if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
    window.requestAnimationFrame(() => {
      setPopIndicator(type);
      popTimerRef.current = window.setTimeout(() => {
        setPopIndicator('none');
      }, 600);
    });
  };

  const scheduleHideControls = useCallback(
    (force = false) => {
      if (hideControlsTimerRef.current) {
        window.clearTimeout(hideControlsTimerRef.current);
      }
      if (force) {
        setControlsVisible(false);
        setActiveMenu('none');
        return;
      }
      hideControlsTimerRef.current = window.setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused && activeMenu === 'none') {
          setControlsVisible(false);
        }
      }, 3000);
    },
    [activeMenu]
  );

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHideControls(false);
  }, [scheduleHideControls]);

  const cleanupPlayers = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (shakaRef.current) {
      try {
        shakaRef.current.destroy();
      } catch {
        // ignore
      }
      shakaRef.current = null;
    }
  };

  const playDirectMp4 = useCallback(
    (mp4Url: string, label = '720p', resumeTime = 0) => {
      cleanupPlayers();
      const video = videoRef.current;
      if (!video) return;
      video.src = mp4Url;
      video.playbackRate = playbackSpeed;
      if (resumeTime > 0) {
        video.currentTime = resumeTime;
      }
      setSelectedQualityLabel(label);
      setLoading(false);
      video.play().catch(() => {});
    },
    [playbackSpeed]
  );

  const initPlayback = useCallback(async () => {
    cleanupPlayers();
    setLoading(true);
    setErrorMsg(null);
    setLoaderMsg(params.vdcId ? 'Unlocking Secure Video...' : 'Resolving Source...');

    try {
      const resolved = await resolveVideoPlayback({
        courseId: params.courseId,
        contentId: params.contentId,
        vdcId: params.vdcId,
        ytUrl: params.ytUrl,
        title: params.title,
        thumbnail: params.thumbnail,
        downloadUrlsRaw: params.downloadUrlsRaw,
        directFileUrl: params.directFileUrl,
      });

      if (resolved.title) {
        setTitle(resolved.title);
      }
      setDownloadQualities(resolved.downloadQualities || []);

      // If it resolved to a PDF instead of video
      if (resolved.pdfUrl) {
        onOpenPdf(params.courseId, params.contentId, resolved.title || title, resolved.pdfUrl);
        return;
      }

      // 1. YouTube
      if (resolved.type === 'youtube' && resolved.youtubeId) {
        setIsYouTube(true);
        setYoutubeId(resolved.youtubeId);
        setLoading(false);
        return;
      }

      setIsYouTube(false);
      setYoutubeId(null);

      const video = videoRef.current;
      if (!video) return;

      // Build base MP4 quality options from downloadQualities
      const mp4Options: QualityOption[] = (resolved.downloadQualities || []).map((dq) => ({
        label: dq.title.endsWith('p') ? dq.title : `${dq.title}p`,
        type: 'mp4',
        mp4Url: dq.url,
      }));

      // 2. HLS (.m3u8)
      if (resolved.type === 'hls') {
        if (Hls.isSupported()) {
          const hls = new Hls({
            maxBufferLength: 45,
            enableWorker: true,
          });
          hlsRef.current = hls;
          hls.loadSource(resolved.streamUrl);
          hls.attachMedia(video);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            const hlsOpts: QualityOption[] = [
              { label: 'Auto', type: 'hls-auto', hlsLevelIndex: -1 },
              ...hls.levels.map((lvl, idx) => ({
                label: `${lvl.height}p`,
                type: 'hls-level' as const,
                hlsLevelIndex: idx,
              })),
            ];
            setQualityOptions(hlsOpts.length > 1 ? hlsOpts : [{ label: 'Auto', type: 'hls-auto', hlsLevelIndex: -1 }, ...mp4Options]);
            setSelectedQualityLabel('Auto');
            setLoading(false);
            video.play().catch(() => {});
          });

          hls.on(Hls.Events.ERROR, (_event, data) => {
            if (data.fatal) {
              console.warn('HLS fatal error, attempting MP4 fallback:', data);
              if (resolved.fallbackMp4Url) {
                setQualityOptions(mp4Options);
                playDirectMp4(resolved.fallbackMp4Url, '720p', video.currentTime);
              } else {
                setErrorMsg('Stream interrupted. Please try switching quality or retrying.');
                setLoading(false);
              }
            }
          });
          return;
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS (Safari / iOS)
          video.src = resolved.streamUrl;
          setQualityOptions([{ label: 'Auto', type: 'hls-auto' }, ...mp4Options]);
          setSelectedQualityLabel('Auto');
          setLoading(false);
          video.play().catch(() => {});
          return;
        }
      }

      // 3. DRM MPD (.mpd) via Shaka Player with automatic fallback
      const w = window as any;
      if (resolved.type === 'mpd' && w.shaka) {
        w.shaka.polyfill.installAll();
        if (w.shaka.Player.isBrowserSupported()) {
          const shakaPlayer = new w.shaka.Player(video);
          shakaRef.current = shakaPlayer;
          const config: any = {
            streaming: { bufferingGoal: 30, rebufferingGoal: 2, jumpLargeGaps: true },
          };
          if (resolved.token) {
            const licenseUrl =
              'https://license.videocrypt.com/validateLicense?pallyconCustomdataV2=' +
              encodeURIComponent(resolved.token);
            config.drm = {
              servers: {
                'com.widevine.alpha': licenseUrl,
                'com.microsoft.playready': licenseUrl,
              },
            };
          }
          shakaPlayer.configure(config);
          try {
            await shakaPlayer.load(resolved.streamUrl);
            setQualityOptions([{ label: 'Auto (HD)', type: 'hls-auto' }, ...mp4Options]);
            setLoading(false);
            video.play().catch(() => {});
            return;
          } catch (drmErr) {
            console.warn('DRM MPD failed, falling back to MP4:', drmErr);
            if (resolved.fallbackMp4Url) {
              setQualityOptions(mp4Options);
              playDirectMp4(resolved.fallbackMp4Url, '720p');
              return;
            }
          }
        }
      }

      // 4. Native MP4 Direct
      const targetUrl = resolved.streamUrl || resolved.fallbackMp4Url;
      if (targetUrl) {
        setQualityOptions(
          mp4Options.length > 0 ? mp4Options : [{ label: 'HD', type: 'mp4', mp4Url: targetUrl }]
        );
        playDirectMp4(targetUrl, mp4Options.find((m) => m.mp4Url === targetUrl)?.label || '720p');
        return;
      }

      setErrorMsg('Video stream unavailable.');
      setLoading(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to load video stream');
      setLoading(false);
    }
  }, [params, onOpenPdf, playDirectMp4, title]);

  useEffect(() => {
    // Ensure 24h verification key is always valid in localStorage just like player.html expects
    localStorage.setItem('smex_key_expiry', String(Date.now() + 48 * 60 * 60 * 1000));
    initPlayback();

    return () => {
      cleanupPlayers();
      if (hideControlsTimerRef.current) window.clearTimeout(hideControlsTimerRef.current);
      if (popTimerRef.current) window.clearTimeout(popTimerRef.current);
    };
  }, [initPlayback]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isYouTube) return;
      const video = videoRef.current;
      if (!video) return;

      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        if (video.paused) {
          video.play().catch(() => {});
          triggerPopIndicator('play');
        } else {
          video.pause();
          triggerPopIndicator('pause');
        }
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyJ') {
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 10);
        triggerPopIndicator('skip-left');
        showControls();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyL') {
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        triggerPopIndicator('skip-right');
        showControls();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        video.muted = !video.muted;
        setIsMuted(video.muted);
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isYouTube, showControls]);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const skipSeconds = (delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + delta));
    triggerPopIndicator(delta < 0 ? 'skip-left' : 'skip-right');
    showControls();
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const togglePiP = (e: React.MouseEvent) => {
    e.stopPropagation();
    const video = videoRef.current as any;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture?.().catch(() => {});
    } else {
      video.requestPictureInPicture?.().catch(() => {});
    }
  };

  const handleQualitySelect = (opt: QualityOption) => {
    const video = videoRef.current;
    const currentPos = video?.currentTime || 0;

    if (opt.type === 'hls-auto' && hlsRef.current) {
      hlsRef.current.currentLevel = -1;
      setSelectedQualityLabel('Auto');
    } else if (opt.type === 'hls-level' && hlsRef.current && typeof opt.hlsLevelIndex === 'number') {
      hlsRef.current.currentLevel = opt.hlsLevelIndex;
      setSelectedQualityLabel(opt.label);
    } else if (opt.type === 'mp4' && opt.mp4Url) {
      playDirectMp4(opt.mp4Url, opt.label, currentPos);
    }
    setActiveMenu('none');
  };

  const handleSpeedSelect = (spd: number) => {
    setPlaybackSpeed(spd);
    if (videoRef.current) {
      videoRef.current.playbackRate = spd;
    }
    setActiveMenu('none');
  };

  const handleZoneTap = (zone: 'left' | 'center' | 'right', e: React.MouseEvent) => {
    e.stopPropagation();
    const now = Date.now();
    const lastTap = lastTapRef.current[zone];
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTap < DOUBLE_TAP_DELAY) {
      if (singleTapTimerRef.current) window.clearTimeout(singleTapTimerRef.current);
      lastTapRef.current[zone] = 0;
      if (zone === 'left') {
        skipSeconds(-10);
      } else if (zone === 'right') {
        skipSeconds(10);
      } else {
        togglePlay();
        triggerPopIndicator(videoRef.current?.paused ? 'pause' : 'play');
      }
    } else {
      lastTapRef.current[zone] = now;
      singleTapTimerRef.current = window.setTimeout(() => {
        lastTapRef.current[zone] = 0;
        if (controlsVisible && activeMenu === 'none') {
          scheduleHideControls(true);
        } else {
          setActiveMenu('none');
          showControls();
        }
      }, DOUBLE_TAP_DELAY);
    }
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return h > 0
      ? `${h}:${m < 10 ? '0' : ''}${m}:${sec < 10 ? '0' : ''}${sec}`
      : `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] bg-black text-white flex flex-col overflow-hidden select-none"
      onMouseMove={() => {
        if (!isYouTube) showControls();
      }}
      onMouseLeave={() => {
        if (!isYouTube && isPlaying) scheduleHideControls(false);
      }}
    >
      {/* Loader Overlay */}
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black">
          <button
            onClick={onBack}
            className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
            title="Back to Course"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Loader2 className="w-10 h-10 text-themeRed animate-spin mb-4" />
          <p className="text-stone-400 text-sm font-medium animate-pulse">{loaderMsg}</p>
        </div>
      )}

      {/* Error Overlay */}
      {errorMsg && !loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/95 gap-3 px-4">
          <button
            onClick={onBack}
            className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <AlertCircle className="w-12 h-12 text-red-500" />
          <p className="text-red-400 font-bold text-center max-w-md">{errorMsg}</p>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={initPlayback}
              className="bg-themeRed text-black px-5 py-2 rounded-xl text-sm font-bold active:scale-95 hover:bg-red-500 transition-colors"
            >
              Retry Stream
            </button>
            <button
              onClick={onBack}
              className="bg-white/10 text-white px-5 py-2 rounded-xl text-sm font-bold active:scale-95 hover:bg-white/20 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      )}

      {/* Main Player Container */}
      <div className="relative w-full h-full bg-black overflow-hidden">
        {/* YouTube Player Mode */}
        {isYouTube && youtubeId ? (
          <div className="w-full h-full flex flex-col bg-black">
            <div className="bg-[#0a0a0a]/95 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4 z-40">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={onBack}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90 shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="text-white font-bold text-sm sm:text-base truncate">{title}</div>
              </div>
              <a
                href={`https://www.youtube.com/watch?v=${youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-1.5 shrink-0 transition-colors"
              >
                YouTube <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <div className="flex-1 w-full h-full relative">
              <iframe
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                className="w-full h-full border-0"
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                allowFullScreen
                title={title}
              />
            </div>
          </div>
        ) : (
          <>
            {/* HTML5 Video Element */}
            <video
              ref={videoRef}
              className="w-full h-full object-contain bg-black outline-none"
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration || 0);
                }
              }}
              onPlay={() => {
                setIsPlaying(true);
                setBuffering(false);
                scheduleHideControls(false);
              }}
              onPause={() => {
                setIsPlaying(false);
                setControlsVisible(true);
              }}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => setBuffering(false)}
              onCanPlay={() => setBuffering(false)}
            />

            {/* Buffering Spinner */}
            {buffering && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                <div className="w-14 h-14 border-4 border-themeRed/30 border-t-themeRed rounded-full animate-spin" />
              </div>
            )}

            {/* Tap Zones for Mobile & Desktop Gestures */}
            <div
              className="absolute top-0 bottom-0 left-0 w-1/3 z-30 cursor-pointer"
              onClick={(e) => handleZoneTap('left', e)}
            />
            <div
              className="absolute top-0 bottom-0 left-1/3 w-1/3 z-30 cursor-pointer"
              onClick={(e) => handleZoneTap('center', e)}
            />
            <div
              className="absolute top-0 bottom-0 right-0 w-1/3 z-30 cursor-pointer"
              onClick={(e) => handleZoneTap('right', e)}
            />

            {/* Animated Visual Indicators */}
            {popIndicator === 'skip-left' && (
              <div className="absolute top-1/2 left-10 -translate-y-1/2 bg-black/60 backdrop-blur-md p-4 rounded-full text-white flex items-center gap-2 font-bold pointer-events-none z-50 animate-pop-icon">
                <RotateCcw className="w-7 h-7" /> <span className="text-lg">-10s</span>
              </div>
            )}
            {popIndicator === 'skip-right' && (
              <div className="absolute top-1/2 right-10 -translate-y-1/2 bg-black/60 backdrop-blur-md p-4 rounded-full text-white flex items-center gap-2 font-bold pointer-events-none z-50 animate-pop-icon">
                <RotateCw className="w-7 h-7" /> <span className="text-lg">+10s</span>
              </div>
            )}
            {popIndicator === 'play' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md p-6 rounded-full text-white pointer-events-none z-50 animate-pop-icon">
                <Play className="w-10 h-10 fill-current ml-1" />
              </div>
            )}
            {popIndicator === 'pause' && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/60 backdrop-blur-md p-6 rounded-full text-white pointer-events-none z-50 animate-pop-icon">
                <Pause className="w-10 h-10 fill-current" />
              </div>
            )}

            {/* Controls Overlay */}
            <div
              className={`absolute inset-0 flex flex-col justify-between z-40 transition-opacity duration-300 pointer-events-none ${
                controlsVisible ? 'opacity-100' : 'opacity-0'
              }`}
            >
              {/* TOP BAR */}
              <div
                className="flex items-center justify-between gap-4 px-6 pt-6 pb-12 pointer-events-auto"
                style={{
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.9), transparent)',
                }}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBack();
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90 z-50 relative"
                  title="Back to Course Content"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="flex-1 text-white font-bold text-base sm:text-lg truncate drop-shadow-md">
                  {title}
                </div>

                {/* Notes & Downloads Menu Button */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenu(activeMenu === 'notes' ? 'none' : 'notes');
                    }}
                    className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/10 flex items-center justify-center text-white transition-all active:scale-90"
                    title="Lecture Notes & Downloads"
                  >
                    <FileText className="w-5 h-5" />
                  </button>

                  {activeMenu === 'notes' && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute top-14 right-0 min-w-[240px] p-3.5 rounded-2xl bg-[#111111]/95 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 flex flex-col gap-2"
                    >
                      <span className="text-[10px] uppercase tracking-wider font-bold text-stone-400 border-b border-white/10 pb-1.5">
                        Lecture Notes &amp; Downloads
                      </span>

                      {params.siblingPdfs && params.siblingPdfs.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[10px] text-themeRed font-semibold">
                            Chapter PDF Notes
                          </span>
                          {params.siblingPdfs.map((pdf) => (
                            <button
                              key={pdf.entity_id}
                              onClick={() =>
                                onOpenPdf(
                                  params.courseId,
                                  pdf.entity_id,
                                  pdf.title,
                                  pdf.data?.file_url
                                )
                              }
                              className="w-full text-left px-2.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-zinc-200 flex items-center gap-2 transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span className="truncate">{pdf.title}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {downloadQualities.length > 0 ? (
                        <div className="flex flex-col gap-1.5 mt-1">
                          <span className="text-[10px] text-stone-400 font-semibold">
                            Direct Video Download
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            {downloadQualities.map((dq) => (
                              <a
                                key={dq.title}
                                href={dq.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-themeRed hover:text-black text-xs font-bold text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                {dq.title}p
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : (
                        (!params.siblingPdfs || params.siblingPdfs.length === 0) && (
                          <p className="text-xs text-stone-500 py-1">No extra data</p>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* BOTTOM BAR */}
              <div
                className="px-6 pt-12 pb-6 pointer-events-auto"
                style={{
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.95), rgba(0,0,0,0.6), transparent)',
                }}
              >
                {/* Progress Bar */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="text-zinc-300 font-mono text-xs sm:text-sm w-14 text-right">
                    {formatTime(currentTime)}
                  </span>
                  <div className="flex-1 relative group flex items-center h-5">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={0.1}
                      value={progressPct}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value);
                        if (videoRef.current && duration > 0) {
                          videoRef.current.currentTime = (pct / 100) * duration;
                          setCurrentTime((pct / 100) * duration);
                        }
                      }}
                      className="player-range absolute inset-0 z-10 opacity-0 cursor-pointer"
                    />
                    <div className="w-full h-1.5 bg-white/20 rounded-full relative overflow-hidden">
                      <div
                        className="absolute top-0 left-0 bottom-0 bg-themeRed rounded-full shadow-[0_0_10px_#FACC15]"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-zinc-300 font-mono text-xs sm:text-sm w-14">
                    {formatTime(duration)}
                  </span>
                </div>

                {/* Controls Row */}
                <div className="flex items-center justify-between relative z-50">
                  <div className="flex items-center gap-4 sm:gap-6">
                    <button
                      onClick={(e) => skipSeconds(-10, e)}
                      className="text-white hover:text-themeRed transition-colors"
                      title="Rewind 10s"
                    >
                      <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>

                    <button
                      onClick={togglePlay}
                      className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-themeRed text-black flex items-center justify-center hover:scale-105 transition-all shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                    >
                      {isPlaying ? (
                        <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
                      ) : (
                        <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1" />
                      )}
                    </button>

                    <button
                      onClick={(e) => skipSeconds(10, e)}
                      className="text-white hover:text-themeRed transition-colors"
                      title="Forward 10s"
                    >
                      <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
                    </button>

                    <div className="hidden sm:block w-px h-6 bg-white/20 mx-2" />

                    <button
                      onClick={toggleMute}
                      className="hidden sm:block text-white hover:text-themeRed transition-colors"
                    >
                      {isMuted ? (
                        <VolumeX className="w-6 h-6" />
                      ) : (
                        <Volume2 className="w-6 h-6" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6">
                    <button
                      onClick={togglePiP}
                      className="text-white hover:text-themeRed transition-colors hidden sm:block"
                      title="Picture in Picture"
                    >
                      <PictureInPicture className="w-6 h-6" />
                    </button>

                    {/* Settings Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSettingsSubmenu('main');
                          setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings');
                        }}
                        className="text-white hover:text-themeRed transition-colors flex items-center"
                        title="Settings"
                      >
                        <Settings
                          className={`w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 ${
                            activeMenu === 'settings' ? 'rotate-90 text-themeRed' : ''
                          }`}
                        />
                      </button>

                      {activeMenu === 'settings' && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute bottom-14 right-0 w-[230px] rounded-2xl bg-[#111111]/95 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden"
                        >
                          {settingsSubmenu === 'main' && (
                            <div className="p-2 flex flex-col gap-1">
                              <button
                                onClick={() => setSettingsSubmenu('quality')}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-xl text-sm font-bold text-zinc-200 transition-colors"
                              >
                                Quality
                                <span className="flex items-center gap-1 text-themeRed">
                                  <span>{selectedQualityLabel}</span>
                                  <ChevronRight className="w-4 h-4" />
                                </span>
                              </button>
                              <button
                                onClick={() => setSettingsSubmenu('speed')}
                                className="w-full flex items-center justify-between p-3 hover:bg-white/10 rounded-xl text-sm font-bold text-zinc-200 transition-colors"
                              >
                                Speed
                                <span className="flex items-center gap-1 text-themeRed">
                                  <span>{playbackSpeed}x</span>
                                  <ChevronRight className="w-4 h-4" />
                                </span>
                              </button>
                            </div>
                          )}

                          {settingsSubmenu === 'quality' && (
                            <div className="p-2">
                              <button
                                onClick={() => setSettingsSubmenu('main')}
                                className="w-full flex items-center gap-2 p-2.5 text-sm font-bold text-zinc-400 hover:text-white border-b border-white/10 mb-1.5"
                              >
                                <ChevronLeft className="w-4 h-4" /> Back
                              </button>
                              <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1">
                                {qualityOptions.map((qOpt, idx) => {
                                  const isSelected = selectedQualityLabel === qOpt.label;
                                  return (
                                    <button
                                      key={`${qOpt.label}-${idx}`}
                                      onClick={() => handleQualitySelect(qOpt)}
                                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-bold transition-colors ${
                                        isSelected
                                          ? 'bg-themeRed/10 text-themeRed'
                                          : 'text-zinc-300 hover:bg-white/10'
                                      }`}
                                    >
                                      <span>{qOpt.label}</span>
                                      {isSelected && <Check className="w-4 h-4" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {settingsSubmenu === 'speed' && (
                            <div className="p-2">
                              <button
                                onClick={() => setSettingsSubmenu('main')}
                                className="w-full flex items-center gap-2 p-2.5 text-sm font-bold text-zinc-400 hover:text-white border-b border-white/10 mb-1.5"
                              >
                                <ChevronLeft className="w-4 h-4" /> Back
                              </button>
                              <div className="max-h-48 overflow-y-auto custom-scrollbar pr-1 flex flex-col gap-1">
                                {SPEED_OPTIONS.map((spd) => {
                                  const isSelected = playbackSpeed === spd;
                                  return (
                                    <button
                                      key={spd}
                                      onClick={() => handleSpeedSelect(spd)}
                                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-bold transition-colors ${
                                        isSelected
                                          ? 'bg-themeRed/10 text-themeRed'
                                          : 'text-zinc-300 hover:bg-white/10'
                                      }`}
                                    >
                                      <span>{spd}x</span>
                                      {isSelected && <Check className="w-4 h-4" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      onClick={toggleFullscreen}
                      className="text-white hover:text-themeRed transition-colors"
                      title="Toggle Fullscreen"
                    >
                      {isFullscreen ? (
                        <Minimize className="w-6 h-6 sm:w-7 sm:h-7" />
                      ) : (
                        <Maximize className="w-6 h-6 sm:w-7 sm:h-7" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
