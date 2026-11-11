import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, X, Download } from 'lucide-react';
import { resolvePdfUrl } from '../services/studybeeApi';
import { GlassDocsIcon } from './GlassIcons3D';

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
  const [pdfUrl, setPdfUrl] = useState<string | null>(directUrl || null);
  const [loading, setLoading] = useState(!directUrl);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (directUrl) {
      setPdfUrl(directUrl);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    resolvePdfUrl(courseId, contentId)
      .then((resolved) => {
        if (!mounted) return;
        if (resolved?.url) {
          setPdfUrl(resolved.url);
        } else {
          setError('PDF document link could not be found.');
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err?.message || 'Failed to load PDF.');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [courseId, contentId, directUrl]);

  const googleDocsViewerUrl = pdfUrl
    ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`
    : '';

  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col animate-pop-in"
      style={{
        background: 'rgba(7, 16, 57, 0.88)',
        backdropFilter: 'var(--glass-overlay-filter)',
        WebkitBackdropFilter: 'var(--glass-overlay-filter)',
      }}
    >
      {/* Top Frosted Glass Header */}
      <div
        className="h-16 px-4 md:px-6 flex items-center justify-between shrink-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(26,59,176,0.65) 0%, rgba(15,34,112,0.88) 100%)',
          borderBottom: '1px solid rgba(175,197,248,0.32)',
          boxShadow: '0 8px 24px rgba(7,16,57,0.6)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0 pr-4">
          <GlassDocsIcon className="w-10 h-10 shrink-0" />
          <div className="min-w-0">
            <span className="block text-[10px] font-bold uppercase tracking-widest text-[#AFC5F8]">
              MIND SPARK · Lecture Notes
            </span>
            <h2 className="text-sm md:text-base font-display font-bold text-[#E6EDFD] truncate">
              {title || 'Document Viewer'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {pdfUrl && (
            <>
              <a
                href={pdfUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#E6EDFD] flex items-center gap-1.5 transition-ui hover:-translate-y-0.5 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #6E92F2 0%, #2E5DE6 100%)',
                  border: '1px solid rgba(230,237,253,0.55)',
                  boxShadow: '0 6px 16px rgba(46,93,230,0.45)',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download PDF</span>
              </a>
              <a
                href={pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl text-xs font-semibold text-[#E6EDFD] flex items-center gap-1.5 transition-colors hover:bg-white/15"
                style={{
                  background: 'rgba(15,34,112,0.65)',
                  border: '1px solid rgba(175,197,248,0.35)',
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Open Direct</span>
              </a>
            </>
          )}
          <button
            onClick={onClose}
            aria-label="Close PDF viewer"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-[#AFC5F8] hover:text-[#E6EDFD] hover:bg-white/15 transition-colors cursor-pointer"
            style={{
              background: 'rgba(7,16,57,0.55)',
              border: '1px solid rgba(175,197,248,0.3)',
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Viewer Body */}
      <div className="flex-1 w-full relative bg-[#050b24] flex items-center justify-center overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center gap-3 text-[#AFC5F8]">
            <Loader2 className="w-9 h-9 text-[#6E92F2] animate-spin" />
            <span className="text-sm font-semibold text-[#E6EDFD]">Loading PDF document...</span>
          </div>
        ) : error ? (
          <div className="glass-surface p-6 rounded-3xl max-w-md text-center mx-4">
            <GlassDocsIcon className="w-12 h-12 mx-auto mb-3" />
            <h3 className="text-lg font-display font-bold text-[#E6EDFD] mb-1">
              Unable to Preview PDF
            </h3>
            <p className="text-xs text-[#AFC5F8] mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-[#2E5DE6] text-[#E6EDFD] text-xs font-bold hover:bg-[#1A3BB0] transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={googleDocsViewerUrl}
            title={title}
            className="w-full h-full border-0 bg-white"
            allow="autoplay"
          />
        ) : null}
      </div>
    </div>
  );
};
