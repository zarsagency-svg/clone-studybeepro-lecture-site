import { useEffect, useState } from 'react';
import { X } from 'lucide-react';

const TG_LINK = 'https://t.me/zarsstudy';
const SESSION_FLAG = 'mindspark_tg_invite_dismissed';

export function TelegramInviteModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(SESSION_FLAG) === '1';
    } catch {
      // ignore storage errors
    }
    if (dismissed) return;
    const t = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const dismiss = () => {
    setOpen(false);
    try {
      sessionStorage.setItem(SESSION_FLAG, '1');
    } catch {
      // ignore storage errors
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="animate-pop relative w-full max-w-sm space-y-4 rounded-3xl border border-white/10 bg-[#121212] p-7 text-center shadow-2xl shadow-black/60">
        {/* Cross / cancel in the upper corner */}
        <button
          onClick={dismiss}
          aria-label="Close invitation"
          className="absolute right-4 top-4 text-stone-500 transition-colors hover:text-white btn-click-effect"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Telegram logo */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-themeRed to-themeRedDeep shadow-lg shadow-themeRed/20">
          <svg viewBox="0 0 24 24" className="h-8 w-8 fill-white" aria-hidden="true">
            <path d="M9.04 15.51l-.38 5.35c.54 0 .78-.23 1.06-.5l2.55-2.44 5.28 3.87c.97.53 1.66.25 1.92-.9l3.47-16.25c.31-1.43-.52-1.99-1.46-1.64L1.4 10.63c-1.42.55-1.4 1.34-.24 1.7l5.22 1.63L18.5 6.4c.57-.37 1.09-.17.66.21L9.04 15.51z" />
          </svg>
        </div>

        <h2 className="text-xl font-black font-syne tracking-wide text-white">
          YOU&apos;RE INVITED!
        </h2>

        {/* Invitation note below the logo */}
        <p className="text-sm leading-6 text-stone-400">
          An invitation to our Telegram channel - please join! This site can be banned at
          any time, so stay connected with us there.
        </p>
        <p className="text-xs font-black uppercase tracking-wider text-themeRed">
          @zarsstudy
        </p>

        <a
          href={TG_LINK}
          target="_blank"
          rel="noopener noreferrer"
          onClick={dismiss}
          className="block w-full rounded-xl bg-themeRed px-4 py-3.5 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-themeRedHover btn-click-effect"
        >
          Join Now
        </a>
        <button
          onClick={dismiss}
          className="text-[11px] font-semibold uppercase tracking-wider text-stone-500 transition-colors hover:text-stone-300"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
