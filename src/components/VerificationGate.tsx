import { FormEvent, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  KeyRound,
  ShieldCheck,
  TriangleAlert,
  Link,
  Lock,
  Play,
} from 'lucide-react';

const ACCESS_WINDOW_MS = 48 * 60 * 60 * 1000;
const STORAGE_KEY = 'mindspark_verification';
const TUTORIAL_URL = 'https://www.youtube.com/embed/JhyVwMdkt6I';

// vplink.in link shortener credentials
const API_TOKEN = 'c88149befbcc8e5f594ad154d02bc4612a851037';
const VPLink_API = 'https://vplink.in/api';

// Admin bypass password — admin can enter without going through the link shortener
const ADMIN_PASSWORD = '01006533';

type VerificationRecord = { key: string; expiresAt: number };

function readVerification(): VerificationRecord | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as VerificationRecord | null;
    return value && value.expiresAt > Date.now() ? value : null;
  } catch {
    return null;
  }
}

function createKey() {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  return `MS-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function hasActiveVerification() {
  return Boolean(readVerification());
}

export function VerificationGate({ batchTitle, onVerified }: { batchTitle: string; onVerified: () => void }) {
  const [key, setKey] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [generatedKey, setGeneratedKey] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Link shortener state
  const [destinationUrl, setDestinationUrl] = useState(window.location.href);
  const [shortUrl, setShortUrl] = useState('');
  const [shortening, setShortening] = useState(false);
  const [shortError, setShortError] = useState('');

  const expiresAtLabel = useMemo(() => new Date(Date.now() + ACCESS_WINDOW_MS).toLocaleString(), [generatedKey]);

  const saveAccess = (accessKey: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: accessKey, expiresAt: Date.now() + ACCESS_WINDOW_MS }));
    setMessage('');
    setError('');
    onVerified();
  };

  const handleGenerate = () => {
    const nextKey = createKey();
    setGeneratedKey(nextKey);
    setKey(nextKey);
    setShortUrl('');
    setShortError('');
    setMessage('Key generated. Now shorten the link below using the shortener, open it, complete the step, then enter your key to unlock.');
    setError('');
  };

  const handleShorten = async () => {
    if (!destinationUrl.trim()) {
      setShortError('Please enter a destination URL.');
      return;
    }
    setShortening(true);
    setShortError('');
    try {
      const apiUrl = `${VPLink_API}?api=${API_TOKEN}&url=${encodeURIComponent(destinationUrl.trim())}&format=text`;
      const res = await fetch(apiUrl, { cache: 'no-store' });
      const text = await res.text();
      const cleaned = text.trim();
      if (cleaned && cleaned.includes('vplink.in')) {
        setShortUrl(cleaned);
        setMessage('Short link ready! Open it, complete the short-link step, then return and enter your key below.');
      } else {
        setShortError('Shortener returned an unexpected response. Please try again.');
      }
    } catch {
      setShortError('Unable to reach the link shortener. Please check your connection and try again.');
    } finally {
      setShortening(false);
    }
  };

  const copyShortUrl = () => {
    if (!shortUrl) return;
    navigator.clipboard.writeText(shortUrl).then(() => {
      setMessage('Short link copied to clipboard!');
    });
  };

  const handleVerify = (event: FormEvent) => {
    event.preventDefault();
    if (!generatedKey) {
      setError('Generate a verification key first.');
      return;
    }
    if (key.trim() && key.trim() === generatedKey) {
      saveAccess(key.trim());
      return;
    }
    setError('Enter the generated key to unlock this batch.');
  };

  const handleAdmin = (event: FormEvent) => {
    event.preventDefault();
    if (adminPassword === ADMIN_PASSWORD) {
      saveAccess('admin-bypass');
      return;
    }
    setError('Incorrect admin password.');
  };

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-10 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Left: verification + link shortener */}
        <section className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-slate-900/80 shadow-2xl shadow-cyan-950/20">
          <div className="border-b border-white/10 bg-gradient-to-br from-cyan-400/15 via-slate-900 to-blue-950/40 p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3 text-cyan-200">
              <ShieldCheck className="size-5" />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">Secure access</span>
            </div>
            <p className="mb-2 text-sm text-slate-400">Unlocking batch</p>
            <h1 className="max-w-xl text-3xl font-black tracking-tight sm:text-5xl">Verify once. Study for 48 hours.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
              Generate a verification key, complete the link-shortener step below, then return here to unlock{' '}
              <strong className="text-white">{batchTitle}</strong>.
            </p>
          </div>

          <div className="grid gap-4 p-6 sm:p-8">
            {/* Step 1: Generate key */}
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-200">
                <KeyRound className="size-3" /> Step 1 — Generate your key
              </div>
              <button
                onClick={handleGenerate}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                <KeyRound className="size-4" /> Generate verification key
              </button>
              {generatedKey && (
                <div className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                  <p className="text-xs uppercase tracking-wider text-cyan-200">Your verification key</p>
                  <p className="mt-2 break-all font-mono text-xl font-bold text-white">{generatedKey}</p>
                  <p className="mt-2 text-xs text-slate-300">Keep this key. You will enter it again after the short-link step.</p>
                </div>
              )}
            </div>

            {/* Step 2: Link shortener */}
            <div className="rounded-xl border border-white/10 bg-slate-950/60 p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200">
                <Link className="size-3" /> Step 2 — Link shortener (required)
              </div>
              <p className="text-xs text-slate-400 mb-3">Paste any destination link and shorten it through vplink. Open the short link and complete the step.</p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                  placeholder="https://example.com/your-link"
                  className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none ring-cyan-300/50 placeholder:text-slate-600 focus:ring-2"
                />
                <button
                  onClick={handleShorten}
                  disabled={shortening}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-semibold transition disabled:opacity-60 disabled:cursor-not-allowed hover:bg-white/15"
                >
                  {shortening ? (
                    <>
                      <svg className="w-4 h-4 animate-spin text-slate-300" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Shortening...
                    </>
                  ) : (
                    <>
                      <Link className="size-4" />{' '}Shorten link
                    </>
                  )}
                </button>
                {shortError && <p className="text-xs text-rose-400">{shortError}</p>}
                {shortUrl && (
                  <div className="mt-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 flex items-center gap-2">
                    <p className="text-xs uppercase tracking-wider text-cyan-200">Your short link</p>
                    <a href={shortUrl} target="_blank" rel="noreferrer" className="flex-1 break-all text-sm text-cyan-100 hover:underline">{shortUrl}</a>
                    <button onClick={copyShortUrl} className="p-1.5 text-cyan-200 hover:text-white" title="Copy">
                      <Copy className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Verify key */}
            <form onSubmit={handleVerify} className="grid gap-3 border-t border-white/10 pt-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-200">
                <Lock className="size-3" /> Step 3 — Unlock batch
              </div>
              <label htmlFor="verification-key" className="text-sm font-semibold">Verification key</label>
              <input
                id="verification-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="MS-..."
                className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-sm outline-none ring-cyan-300/50 placeholder:text-slate-600 focus:ring-2"
              />
              <button className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/15">
                Unlock batch
              </button>
              {expiresAtLabel && (
                <p className="text-xs text-slate-400">Access will expire on {expiresAtLabel}.</p>
              )}
            </form>

            {message && (
              <p className="flex items-start gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {message}
              </p>
            )}
            {error && (
              <p role="alert" className="flex items-start gap-2 text-sm text-rose-300">
                <TriangleAlert className="mt-0.5 size-4 shrink-0" /> {error}
              </p>
            )}
          </div>
        </section>

        {/* Admin bypass */}
        <section className="rounded-xl border border-amber-300/20 bg-amber-950/10 p-4 sm:p-6 shadow-amber-900/20">
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200">
            <Lock className="size-3" /> Admin bypass — no short link needed
          </div>
          <p className="text-xs text-amber-200/80 mb-4">
            Admin only. Enter the admin password to skip the link-shortener step entirely.
          </p>
          <form onSubmit={handleAdmin} className="grid gap-3">
            <label htmlFor="admin-password" className="text-sm font-semibold text-amber-100">Admin password</label>
            <input
              id="admin-password"
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="•••••••"
              className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none ring-amber-300/50 placeholder:text-slate-600 focus:ring-2"
            />
            <button className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/15">
              Enter as admin
            </button>
          </form>
        </section>

        {/* Right: tutorial playing directly on the page */}
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Need help?</p>
              <h2 className="mt-1 text-xl font-bold">How to verify</h2>
            </div>
            <a href="https://youtube.com/shorts/JhyVwMdkt6I?si=-2jC5QExjSj6LeW" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-white">
              Open on YouTube <ExternalLink className="size-3" />
            </a>
          </div>
          <div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black">
            <iframe
              className="size-full"
              src={TUTORIAL_URL}
              title="Verification tutorial"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/60 p-3">
            <div className="flex items-start gap-2 mb-2">
              <Play className="mt-0.5 size-4 text-cyan-200 shrink-0" />
              <p className="text-xs text-cyan-100 font-medium">Watch before you start</p>
            </div>
            <p className="text-sm leading-6 text-slate-400">
              The tutorial plays directly on this page. It shows how to generate your key, use the link shortener,
              and enter the key to unlock any batch. Your verification is valid for <strong>48 hours</strong>.
              Never share your verification key or the admin password.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
