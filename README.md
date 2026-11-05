# MindSpark

A single-page lecture/course-browsing web app: browse course batches, open batch content (folders, videos, PDFs, tests, links, notes), stream lectures with an HLS player, and view PDFs in an in-app modal.

Built with **React 19 + Vite 7 + TypeScript + Tailwind CSS 4**.

## Features

- 📚 **Batch browsing** — New / Old / Wishlist tabs with search and paginated "load more" grid
- 🎬 **Video player** — HLS streaming via [hls.js](https://github.com/video-dev/hls.js), including tokenized VOD links and download-quality selection
- 📄 **PDF viewer** — in-app modal for lecture notes and PDFs
- 🗂️ **Batch content tree** — folders, files, and tests with per-type content counts (free/paid)
- ⭐ **Wishlist** — saved locally via `localStorage`
- 🌐 **API with fallback** — primary endpoint `nt.studybeepro.site` with `asmultiverse.site` as fallback

## Project Structure

```
├── index.html
├── public/
│   └── batches.json            # Static batch data
├── src/
│   ├── App.tsx                 # Main app: tabs, search, pagination, routing between views
│   ├── main.tsx
│   ├── index.css               # Tailwind entry
│   ├── components/
│   │   ├── BatchContentView.tsx  # Folder/file/test tree for a batch
│   │   ├── VideoPlayerView.tsx   # HLS video player view
│   │   └── PdfViewerModal.tsx    # PDF viewer modal
│   ├── services/
│   │   └── studybeeApi.ts        # API client (batches, content, video links)
│   ├── data/
│   │   └── batches.ts            # Initial/fallback batch data + types
│   └── utils/
│       └── cn.ts                 # clsx + tailwind-merge helper
├── vite.config.ts              # React + Tailwind + single-file build
├── tsconfig.json
└── package.json
```

## Getting Started

Requires [Node.js](https://nodejs.org/) 18+ and npm.

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev

# Production build (outputs a single self-contained HTML file via vite-plugin-singlefile)
npm run build

# Preview the production build
npm run preview
```

## Tech Stack

| Layer      | Tech                                   |
| ---------- | -------------------------------------- |
| UI         | React 19, lucide-react icons           |
| Styling    | Tailwind CSS 4 (@tailwindcss/vite)     |
| Video      | hls.js                                 |
| Tooling    | Vite 7, TypeScript 5.9, vite-plugin-singlefile |

## Notes

- Auth tokens (if present) are read at runtime from `localStorage` (`studybee_token`) — no credentials are stored in this repository.
- The production build is bundled into a single HTML file, making it easy to host anywhere.
