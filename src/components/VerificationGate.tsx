import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Link2, Loader2, PlayCircle, ShieldCheck } from 'lucide-react';
import logo from '../assets/logo.jpg';

const ACCESS_WINDOW_MS = 48 * 60 * 60 * 1000;
const STORAGE_KEY = 'mindspark_verification';
const PENDING_TOKEN_KEY = 'mindspark_pending_token';

// Admin bypass password — admin can enter without going through the link shortener
const ADMIN_PASSWORD = '01006533';

const TUTORIAL_EMBED = 'https://www.youtube.com/embed/JhyVwMdkt6I?rel=0';

// vplink.in link shortener credentials
const VPLINK_TOKEN = 'c88149befbcc8e5f594ad154d02bc4612a851037';
const VPLINK_API = 'https://vplink.in/api';

type VerificationRecord = { key: string; expiresAt: number };

function readVerification(): VerificationRecord | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as VerificationRecord | null;
    return value && value.expiresAt > Date.now() ? value : null;
  } catch {
    return null;
  }
}

export function hasActiveVerification() {
  return Boolean(readVerification());
}

function saveAccess(accessKey: string) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ key: accessKey, expiresAt: Date.now() + ACCESS_WINDOW_MS })
  );
}

async function shortenViaVplink(destination: string): Promise<string> {
  const direct = `${VPLINK_API}?api=${VPLINK_TOKEN}&url=${encodeURIComponent(destination)}&format=text`;
  const attempts = [
    direct,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(direct)}`,
    `https://corsproxy.io/?url=${encodeURIComponent(direct)}`,
  ];
  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt, { cache: 'no-store' });
      if (!res.ok) continue;
      const text = (await res.text()).trim().replace(/^"+|"+$/g, '');
      const match = /https?:\/\/[^\s"]+/.exec(text);
      if (match && match[0].includes('vplink.in')) return match[0];
    } catch {
      // try the next proxy
    }
  }
  throw new Error('shortener unreachable');
}

export function VerificationGate({
  batchTitle,
  onVerified,
}: {
  batchTitle: string;
  onVerified: () => void;
}) {
  const [stage, setStage] = useState<'verify' | 'success'>(() =>
    hasActiveVerification() ? 'success' : 'verify'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  // Returning from the short link with ?token=... -> match against the pending
  // token stored on this device, then unlock for 48 hours.
  useEffect(() => {
    if (stage !== 'verify') return;
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (!urlToken) return;
    const cleanUrl = () => {
      params.delete('token');
      const qs = params.toString();
      try {
        window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
      } catch {
        // ignore history errors in sandboxed iframes
      }
    };
    const expected = localStorage.getItem(PENDING_TOKEN_KEY);
    if (expected && urlToken === expected) {
      localStorage.removeItem(PENDING_TOKEN_KEY);
      saveAccess(urlToken);
      cleanUrl();
      setStage('success');
    } else {
      cleanUrl();
      setError('Link expired or invalid! Please verify from this device.');
    }
  }, [stage]);

  const handleGetLink = async () => {
    setLoading(true);
    setError('');
    const token =
      'msx_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem(PENDING_TOKEN_KEY, token);
    const url = new URL(window.location.href);
    url.searchParams.delete('token');
    url.searchParams.set('token', token);
    try {
      const shortUrl = await shortenViaVplink(url.toString());
      window.location.href = shortUrl;
    } catch {
      localStorage.removeItem(PENDING_TOKEN_KEY);
      setError('Failed to generate the verification link. Please try again.');
      setLoading(false);
    }
  };

  const handleAdmin = (event: FormEvent) => {
    event.preventDefault();
    if (adminPassword.trim() === ADMIN_PASSWORD) {
      saveAccess('admin-bypass');
      setStage('success');
      return;
    }
    setAdminError('Incorrect admin password.');
  };

  return (
    <main className="min-h-screen bg-themeBg px-4 py-10 text-white flex flex-col items-center">
      <div className="w-full max-w-md space-y-5">
        {stage === 'verify' ? (
          <section className="rounded-3xl border border-white/10 bg-[#121212] p-8 text-center shadow-2xl shadow-black/50 space-y-5">
            <img
              src={logo}
              alt="MindSpark logo"
              className="mx-auto w-16 h-16 rounded-2xl border border-white/10 object-cover"
            />
            <h2 className="text-2xl font-black font-syne tracking-wide">
              VERIFICATION REQUIRED
            </h2>
            <p className="text-sm leading-6 text-stone-400">
              You need to verify the link to proceed. This access will remain valid for{' '}
              <strong className="text-themeRed">48 hours</strong>.
              {batchTitle ? (
                <>
                  {' '}
                  Unlocking: <strong className="text-white">{batchTitle}</strong>.
                </>
              ) : null}
            </p>
            <button
              onClick={handleGetLink}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-themeRed px-4 py-3.5 text-sm font-black uppercase tracking-wider transition-colors hover:bg-themeRedHover disabled:opacity-60 disabled:cursor-not-allowed btn-click-effect"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {loading ? 'Creating verification link...' : 'Get Verification Link'}
            </button>
            {error && <p className="text-xs font-semibold text-themeRed">{error}</p>}

            <div className="space-y-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setAdminOpen((v) => !v)}
                className="mx-auto flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-stone-500 transition-colors hover:text-themeRed"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Admin? Skip verification
              </button>
              {adminOpen && (
                <form onSubmit={handleAdmin} className="flex gap-2">
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(e) => {
                      setAdminPassword(e.target.value);
                      setAdminError('');
                    }}
                    placeholder="Admin password"
                    className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm outline-none placeholder:text-stone-600 focus:ring-2 focus:ring-themeRed/50"
                  />
                  <button className="shrink-0 rounded-xl border border-themeRed/30 bg-themeRed/10 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-themeRed/15">
                    Enter
                  </button>
                </form>
              )}
              {adminError && (
                <p className="text-xs font-semibold text-themeRed">{adminError}</p>
              )}
            </div>
          </section>
        ) : (
          <section className="animate-pop space-y-4 rounded-3xl border border-themeGreen/25 bg-[#121212] p-8 text-center shadow-2xl shadow-black/50">
            <CheckCircle2 className="mx-auto w-14 h-14 text-themeGreen" />
            <h2 className="text-2xl font-black font-syne tracking-wide text-themeGreen">
              VERIFIED SUCCESSFULLY!
            </h2>
            <p className="text-sm leading-6 text-stone-400">
              Your 48-hour access has been unlocked. Enjoy seamless learning.
            </p>
            <button
              onClick={onVerified}
              className="w-full rounded-xl bg-themeRed px-4 py-3.5 text-sm font-black uppercase tracking-wider transition-colors hover:bg-themeRedHover btn-click-effect"
            >
              Continue to MindSpark
            </button>
          </section>
        )}

        {/* Tutorial plays directly on the verification page */}
        <section className="space-y-3 rounded-3xl border border-white/10 bg-[#121212] p-4 sm:p-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-themeRed">
            <PlayCircle className="w-3.5 h-3.5" /> Tutorial - how to verify
          </p>
          <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
            <iframe
              className="h-full w-full"
              src={TUTORIAL_EMBED}
              title="Verification tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </section>
      </div>
    </main>
  );
}
