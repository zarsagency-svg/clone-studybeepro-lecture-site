import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { NotificationItem } from '../types/notifications';
import { X } from 'lucide-react';
import { GlassEnvelopeNotificationIcon } from './GlassIcons3D';
import type { PaletteChoice, CardStyleChoice } from './NotificationsDrawer';

let drawerModule: Promise<typeof import('./NotificationsDrawer')> | null = null;
function loadDrawer() {
  drawerModule ??= import('./NotificationsDrawer').catch((error) => {
    drawerModule = null;
    throw error;
  });
  return drawerModule;
}
function warmDrawer() {
  void loadDrawer().catch(() => undefined);
}
const NotificationsDrawer = lazy(loadDrawer);

const SUPABASE_URL = 'https://duoynnsuogaekjtdzcrd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tt29PlGr1WMeZOY8Pa3IfQ_wmhd6432';
const VISITOR_STORAGE_KEY = 'mindspark_notification_visitor';
const LAST_SEEN_STORAGE_KEY = 'mindspark_notifications_last_seen';

export type { NotificationItem } from '../types/notifications';

const FALLBACK_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'welcome-mr-sad',
    title: 'A message from Mr Sad, Admin',
    text: 'Hello everyone, I am Mr Sad, the administrator of MIND SPARK. I hope you are all doing well. It is a pleasure to have you here — I will be sharing important updates and announcements through this channel. If you need any assistance, please feel free to reach out.',
    createdAt: new Date('2026-11-05T13:48:17.834Z').getTime(),
    likes: 18,
    liked: false,
    tag: 'Pinned Announcement',
  },
  {
    id: 'ecosystem-ultramarine-update',
    title: 'MIND SPARK 3D Glass Lecture Ecosystem Live',
    text: 'All 2026–27 & 2025–26 Next Toppers batches — AARMBH, PRARAMBH, NIRBHAY, ABHAY, UPBOARD, BIHARBOARD & CUET — are now supercharged with 3D Glass Folders, Custom Colour Palettes, HLS Lecture Streaming, PDF Notes & Live Mock Assessments.',
    createdAt: Date.now() - 1000 * 60 * 180,
    likes: 29,
    liked: false,
    tag: 'Platform Release',
  },
];

function getOrCreateVisitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

function getLastSeenTime(): number {
  try {
    return Number(localStorage.getItem(LAST_SEEN_STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

function setLastSeenTime(ts: number): void {
  try {
    localStorage.setItem(LAST_SEEN_STORAGE_KEY, String(ts));
  } catch {
    // ignore storage errors
  }
}

async function callSupabaseRpc(fnName: string, payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error('Could not connect to notifications.');
  }
  return res.json();
}

interface NotificationsCenterProps {
  palette: PaletteChoice;
  onChoosePalette: (choice: PaletteChoice) => void;
  customColour: string;
  onChangeCustomColour: (colour: string) => void;
  cardStyle: CardStyleChoice;
  onChooseCardStyle: (style: CardStyleChoice) => void;
}

export const NotificationsCenter = React.memo(function NotificationsCenter({
  palette,
  onChoosePalette,
  customColour,
  onChangeCustomColour,
  cardStyle,
  onChooseCardStyle,
}: NotificationsCenterProps) {
  const reqCounter = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visitorId] = useState<string | null>(getOrCreateVisitorId);
  const [unreadCount, setUnreadCount] = useState<number>(1);
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<NotificationItem[]>(FALLBACK_NOTIFICATIONS);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLiking, setIsLiking] = useState(false);
  const [showFloatingToast, setShowFloatingToast] = useState(true);

  const loadNotifications = async (markAsRead = false) => {
    const currentReq = ++reqCounter.current;
    setIsLoading(true);
    setErrorMsg('');
    try {
      const raw = await callSupabaseRpc('mindspark_get_notifications_v2', {
        p_visitor_id: visitorId || '00000000-0000-4000-8000-000000000001',
      });
      if (currentReq !== reqCounter.current) return;

      if (Array.isArray(raw) && raw.length > 0) {
        const mapped: NotificationItem[] = raw.map((r: Record<string, unknown>, idx: number) => ({
          id: String(r.id),
          title: String(r.title || 'MIND SPARK Announcement'),
          text: String(r.body || ''),
          imageUrl:
            typeof r.image_url === 'string' &&
            r.image_url.startsWith(`${SUPABASE_URL}/storage/v1/object/public/`)
              ? r.image_url
              : undefined,
          createdAt: new Date(String(r.created_at || Date.now())).getTime(),
          likes: Number(r.likes) || 0,
          liked: Boolean(r.liked),
          tag: idx === 0 ? 'Official Broadcast' : 'Ecosystem Update',
        }));
        setMessages(mapped);

        if (markAsRead) {
          setLastSeenTime(Date.now());
          setUnreadCount(0);
        } else {
          const lastSeen = getLastSeenTime();
          const unread = mapped.filter((m) => m.createdAt > lastSeen).length;
          setUnreadCount(unread);
        }
      } else {
        setMessages(FALLBACK_NOTIFICATIONS);
        if (markAsRead) setUnreadCount(0);
      }
    } catch {
      if (currentReq === reqCounter.current) {
        setMessages((prev) => (prev.length > 0 ? prev : FALLBACK_NOTIFICATIONS));
      }
    } finally {
      if (currentReq === reqCounter.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadNotifications(false);
  }, []);

  useEffect(() => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType || '')) return;

    let idleId: number | undefined;
    const timer = window.setTimeout(() => {
      if ('requestIdleCallback' in window) {
        idleId = window.requestIdleCallback(warmDrawer, { timeout: 1500 });
      } else {
        warmDrawer();
      }
    }, 1200);
    return () => {
      window.clearTimeout(timer);
      if (idleId !== undefined) window.cancelIdleCallback(idleId);
    };
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    },
    []
  );

  const toggleDrawer = () => {
    if (closeTimer.current !== null) clearTimeout(closeTimer.current);
    if (isOpen && isVisible) {
      setIsVisible(false);
      const instant = window.matchMedia(
        '(prefers-reduced-motion: reduce), (max-width: 767px), (pointer: coarse)'
      ).matches;
      if (instant) setIsOpen(false);
      else closeTimer.current = setTimeout(() => setIsOpen(false), 160);
    } else {
      warmDrawer();
      setShowFloatingToast(false);
      loadNotifications(true);
      setIsOpen(true);
      setIsVisible(true);
    }
  };

  const handleToggleLike = async (item: NotificationItem) => {
    if (isLiking) return;
    setIsLiking(true);
    setErrorMsg('');

    const nextLiked = !item.liked;
    setMessages((prev) =>
      prev.map((m) =>
        m.id === item.id
          ? {
              ...m,
              liked: nextLiked,
              likes: Math.max(0, m.likes + (nextLiked ? 1 : -1)),
            }
          : m
      )
    );

    try {
      if (visitorId && !item.id.startsWith('ecosystem-')) {
        await callSupabaseRpc('mindspark_set_notification_like', {
          p_message_id: item.id,
          p_visitor_id: visitorId,
          p_liked: nextLiked,
        });
      }
    } catch {
      // Keep optimistic state
    } finally {
      setIsLiking(false);
    }
  };

  const latestMsg = messages[0];

  return (
    <>
      {/* TOP-RIGHT 3D GLASSMORPHIC NOTIFICATION TRIGGER COMPONENT */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-7 z-40 flex items-center gap-3">
        {/* Floating Mini Glass Preview Pill (when unread & closed) */}
        {showFloatingToast && latestMsg && !isOpen && (
          <div
            onClick={toggleDrawer}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && toggleDrawer()}
            className="hidden lg:flex items-center gap-3 pl-3.5 pr-2.5 py-2 rounded-2xl cursor-pointer transition-ui duration-200 hover:-translate-y-0.5 group animate-pop-in"
            style={{
              background:
                'linear-gradient(135deg, rgba(175,197,248,0.22) 0%, rgba(26,59,176,0.42) 60%, rgba(15,34,112,0.75) 100%)',
              backdropFilter: 'var(--glass-filter)',
              WebkitBackdropFilter: 'var(--glass-filter)',
              border: '1px solid rgba(230,237,253,0.38)',
              boxShadow:
                '0 12px 30px -6px rgba(7,16,57,0.75), inset 0 1px 2px rgba(230,237,253,0.4)',
            }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#E6EDFD]" />
            </span>
            <div className="text-left max-w-[200px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#AFC5F8]">
                Mr Sad · Admin Note
              </p>
              <p className="text-[12px] font-medium text-[#E6EDFD] truncate">
                {latestMsg.title}
              </p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowFloatingToast(false);
              }}
              aria-label="Dismiss notification preview"
              className="p-1 rounded-full text-[#AFC5F8] hover:text-[#E6EDFD] hover:bg-[#E6EDFD]/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Main 3D Glassmorphic Notification Button */}
        <button
          type="button"
          onClick={toggleDrawer}
          onPointerEnter={warmDrawer}
          onPointerDown={warmDrawer}
          onFocus={warmDrawer}
          aria-label="Admin Notifications & Theme Customiser"
          aria-expanded={isOpen}
          className="group relative flex items-center gap-2.5 p-1.5 sm:pr-4 rounded-2xl transition-ui duration-200 hover:-translate-y-0.5 hover:scale-[1.03] active:scale-95 cursor-pointer"
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
          <GlassEnvelopeNotificationIcon
            className="w-10 h-10 sm:w-11 sm:h-11"
            hasUnread={unreadCount > 0}
          />

          <div className="hidden sm:flex flex-col items-start text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#AFC5F8] leading-none">
              Inbox
            </span>
            <span className="text-[13px] font-display font-bold text-[#E6EDFD] leading-tight mt-0.5">
              Updates
            </span>
          </div>

          {unreadCount > 0 && (
            <span
              id="unread-badge"
              className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-bold text-[#071039] px-1.5"
              style={{
                background: 'linear-gradient(135deg, #E6EDFD 0%, #AFC5F8 50%, #6E92F2 100%)',
                boxShadow: '0 0 14px rgba(110,146,242,0.95), 0 2px 6px rgba(7,16,57,0.8)',
                border: '1.5px solid #071039',
              }}
            >
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* GLASSMORPHIC NOTIFICATIONS DRAWER MODAL */}
      {isOpen && (
        <Suspense
          fallback={
            <div
              role="status"
              className="fixed top-20 right-4 z-[60] rounded-2xl bg-[#0F2270] px-4 py-3 text-sm text-[#E6EDFD]"
            >
              Loading updates…
            </div>
          }
        >
          <NotificationsDrawer
            isVisible={isVisible}
            isLoading={isLoading}
            messages={messages}
            errorMsg={errorMsg}
            isLiking={isLiking}
            onClose={toggleDrawer}
            onRefresh={() => loadNotifications(true)}
            onToggleLike={handleToggleLike}
            palette={palette}
            onChoosePalette={onChoosePalette}
            customColour={customColour}
            onChangeCustomColour={onChangeCustomColour}
            cardStyle={cardStyle}
            onChooseCardStyle={onChooseCardStyle}
          />
        </Suspense>
      )}
    </>
  );
});
