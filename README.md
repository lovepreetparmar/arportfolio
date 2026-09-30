# Anushri Raina — Portfolio

Premium interactive portfolio (React, Vite, TypeScript, GSAP, Lenis, React Three Fiber).

## Commands

```bash
npm install
npm run dev
npm run build
```

## Assets

Download Behance cover art into `public/projects/{slug}/`:

```bash
node scripts/download-behance-assets.mjs
```

Add additional `02.webp`, `03.webp` per project from Behance exports manually.

## Hostinger deploy

1. Run `npm run build`.
2. Upload **contents** of `dist/` to `public_html/`.
3. Ensure `public/.htaccess` is deployed (copied to `dist/.htaccess` on build) for SPA routing.
