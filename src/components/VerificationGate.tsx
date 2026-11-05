import { FormEvent, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, KeyRound, ShieldCheck, TriangleAlert } from 'lucide-react';

const ACCESS_WINDOW_MS = 48 * 60 * 60 * 1000;
const STORAGE_KEY = 'mindspark_verification';
const TUTORIAL_URL = 'https://www.youtube.com/embed/JhyVwMdkt6I';

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
  const expiresAtLabel = useMemo(() => new Date(Date.now() + ACCESS_WINDOW_MS).toLocaleString(), [generatedKey]);

  const saveAccess = (accessKey: string) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ key: accessKey, expiresAt: Date.now() + ACCESS_WINDOW_MS }));
    onVerified();
  };

  const handleGenerate = () => {
    const nextKey = createKey();
    setGeneratedKey(nextKey);
    setKey(nextKey);
    setMessage('Your verification key is ready. Use it on the link-shortener page, then enter the returned key below.');
    setError('');
  };

  const handleVerify = (event: FormEvent) => {
    event.preventDefault();
    if (key.trim() && key.trim() === generatedKey) {
      saveAccess(key.trim());
      return;
    }
    setError('Enter the generated key to unlock this batch.');
  };

  const handleAdmin = (event: FormEvent) => {
    event.preventDefault();
    const configuredPassword = import.meta.env.VITE_ADMIN_BYPASS_PASSWORD;
    if (configuredPassword && adminPassword === configuredPassword) {
      saveAccess('admin-bypass');
      return;
    }
    setError('Admin access is not configured or the password is incorrect.');
  };

  return (
    <main className="min-h-screen bg-[#07111f] px-4 py-10 text-slate-100">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-slate-900/80 shadow-2xl shadow-cyan-950/20">
          <div className="border-b border-white/10 bg-gradient-to-br from-cyan-400/15 via-slate-900 to-blue-950/40 p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3 text-cyan-200"><ShieldCheck className="size-5" /><span className="text-xs font-bold uppercase tracking-[0.2em]">Secure access</span></div>
            <p className="mb-2 text-sm text-slate-400">Unlocking batch</p>
            <h1 className="max-w-xl text-3xl font-black tracking-tight sm:text-5xl">Verify once. Study for 48 hours.</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">Generate a verification key, complete your short-link step, and return here to unlock <strong className="text-white">{batchTitle}</strong>.</p>
          </div>
          <div className="grid gap-4 p-6 sm:p-8">
            <button onClick={handleGenerate} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 transition hover:bg-cyan-200"><KeyRound className="size-4" /> Generate verification key</button>
            {generatedKey && <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4"><p className="text-xs uppercase tracking-wider text-cyan-200">Your key</p><p className="mt-2 break-all font-mono text-xl font-bold text-white">{generatedKey}</p><p className="mt-2 text-xs text-slate-300">Complete the short-link step, then enter this key below.</p></div>}
            <form onSubmit={handleVerify} className="grid gap-3 border-t border-white/10 pt-5"><label htmlFor="verification-key" className="text-sm font-semibold">Verification key</label><input id="verification-key" value={key} onChange={(event) => setKey(event.target.value)} placeholder="MS-..." className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 font-mono text-sm outline-none ring-cyan-300/50 placeholder:text-slate-600 focus:ring-2" /><button className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 font-semibold transition hover:bg-white/15">Unlock batch</button></form>
            <form onSubmit={handleAdmin} className="grid gap-3 border-t border-white/10 pt-5"><label htmlFor="admin-password" className="text-sm font-semibold">Admin bypass</label><input id="admin-password" type="password" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} placeholder="Admin password" className="rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none ring-cyan-300/50 placeholder:text-slate-600 focus:ring-2" /><button className="rounded-xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 font-semibold text-amber-100 transition hover:bg-amber-300/15">Enter as admin</button></form>
            {message && <p className="flex items-start gap-2 text-sm text-emerald-300"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />{message} Access expires {expiresAtLabel}.</p>}
            {error && <p role="alert" className="flex items-start gap-2 text-sm text-rose-300"><TriangleAlert className="mt-0.5 size-4 shrink-0" />{error}</p>}
          </div>
        </section>
        <section className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-xl sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Need help?</p><h2 className="mt-1 text-xl font-bold">How to verify</h2></div><a href="https://youtube.com/shorts/JhyVwMdkt6I?si=-2jC5QExjSj6LeW" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-white">Open tutorial <ExternalLink className="size-3" /></a></div><div className="aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"><iframe className="size-full" src={TUTORIAL_URL} title="Verification tutorial" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen /></div><p className="mt-4 text-sm leading-6 text-slate-400">Watch the tutorial if the short-link step is unfamiliar. Never share your verification key or admin password.</p></section>
      </div>
    </main>
  );
}
