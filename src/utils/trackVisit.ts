// Anonymous visit counter. Stores only a random device ID (no name, no email)
// so the admin can see how many students use the site, even without login.
const SUPABASE_URL = 'https://duoynnsuogaekjtdzcrd.supabase.co';
const SUPABASE_KEY = 'sb_publishable_tt29PlGr1WMeZOY8Pa3IfQ_wmhd6432';
const VISITOR_STORAGE_KEY = 'mindspark_notification_visitor';
const SITE_NAME = 'xhashikstudy-nt';

function getVisitorId(): string | null {
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

/** Count this device as a visitor today, and optionally count a batch being opened. */
export function trackVisit(courseId?: string | null, batchTitle?: string | null): void {
  try {
    const visitorId = getVisitorId();
    if (!visitorId) return;
    void fetch(`${SUPABASE_URL}/rest/v1/rpc/track_site_visit`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        p_visitor_id: visitorId,
        p_site: SITE_NAME,
        p_course_id: courseId ? String(courseId) : null,
        p_batch_title: batchTitle || null,
      }),
    }).catch(() => undefined);
  } catch {
    // Tracking must never break the site.
  }
}
