import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Download, FileText, Loader2, AlertCircle } from 'lucide-react';
import { resolvePdfUrl } from '../services/studybeeApi';

interface PdfViewerModalProps {
  courseId: string;
  contentId: string;
  title: string;
  directUrl?: string;
  onClose: () => void;
}

export const PdfViewerModal: React.FC<PdfViewerModalProps> = ({
  courseId,
  contentId,
  title,
  directUrl,
  onClose,
}) => {
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(directUrl || null);
  const [resolvedTitle, setResolvedTitle] = useState(title);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadPdf() {
      if (directUrl && directUrl.startsWith('http')) {
        setPdfUrl(directUrl);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      const res = await resolvePdfUrl(courseId, contentId, directUrl);
      if (!mounted) return;
      if (res && res.url) {
        setPdfUrl(res.url);
        if (res.title) setResolvedTitle(res.title);
      } else {
        setError('Could not resolve PDF document URL.');
      }
      setLoading(false);
    }
    loadPdf();
    return () => {
      mounted = false;
    };
  }, [courseId, contentId, directUrl]);

  return (
    <div className="fixed inset-0 z-[210] bg-black/85 backdrop-blur-md flex flex-col animate-modal-in">
      {/* Top Bar */}
      <div className="bg-[#121212] border-b border-white/10 px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                PDF Notes
              </span>
            </div>
            <h3 className="text-white font-bold text-sm sm:text-base truncate mt-0.5">
              {resolvedTitle}
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {pdfUrl && (
            <>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 transition-colors btn-click-effect"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Open in Tab</span>
              </a>
              <a
                href={pdfUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-lg bg-themeRed hover:bg-red-500 text-black text-xs font-bold flex items-center gap-1.5 transition-colors btn-click-effect"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </a>
            </>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-stone-300 hover:text-white transition-colors btn-click-effect"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 w-full bg-[#0a0a0a] relative flex items-center justify-center overflow-hidden">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-9 h-9 text-themeRed animate-spin" />
            <p className="text-stone-400 text-sm font-medium">Decrypting &amp; Loading PDF Notes...</p>
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-white font-bold text-base">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-semibold"
            >
              Close
            </button>
          </div>
        )}

        {pdfUrl && !loading && (
          <iframe
            src={pdfUrl}
            title={resolvedTitle}
            className="w-full h-full border-0 bg-zinc-900"
          />
        )}
      </div>
    </div>
  );
};
