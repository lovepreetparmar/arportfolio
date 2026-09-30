import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const root = path.resolve('public/images')

const projects = [
  { file: 'brand-identity-mockup-cover', title: 'Brand Identity', accent: '#8c2f2f' },
  { file: 'brand-identity-mockup-02', title: 'Mockup', accent: '#5c1f1f' },
  { file: 'brand-identity-mockup-03', title: 'Identity', accent: '#a84848' },
  { file: 'roshan-shah-cover', title: 'Roshan Shah', accent: '#b8860b' },
  { file: 'roshan-shah-02', title: 'Jewellers', accent: '#8b6914' },
  { file: 'roshan-shah-03', title: 'Gold', accent: '#d4af37' },
  { file: 'brand-with-a-heart-cover', title: 'Brand With A Heart', accent: '#c45c5c' },
  { file: 'brand-with-a-heart-02', title: 'Concept', accent: '#9e4545' },
  { file: 'timbs-cover', title: 'Timbs', accent: '#e85d04' },
  { file: 'timbs-02', title: 'Food Brand', accent: '#dc2f02' },
  { file: 'timbs-03', title: 'Social', accent: '#f48c06' },
  { file: 'social-banners-cover', title: 'Social Banners', accent: '#3d5a80' },
  { file: 'social-banners-02', title: 'Campaign', accent: '#293241' },
  { file: 'adventure-website-cover', title: 'Adventure Web', accent: '#2d6a4f' },
  { file: 'adventure-website-02', title: 'UI Mockup', accent: '#1b4332' },
  { file: 'invitation-moodboard-cover', title: 'Invitation', accent: '#6d597a' },
  { file: 'invitation-moodboard-02', title: 'Moodboard', accent: '#4a4453' },
  { file: 'billboards-cover', title: 'Billboards', accent: '#1b263b' },
  { file: 'billboards-02', title: 'OOH', accent: '#0d1b2a' },
]

function svg({ title, accent, w = 1200, h = 1500 }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}">
  <rect width="100%" height="100%" fill="#f4f0ea"/>
  <rect x="80" y="80" width="${w - 160}" height="${h - 160}" fill="${accent}" opacity="0.12"/>
  <text x="96" y="${h - 120}" font-family="Georgia, serif" font-size="42" fill="#121212" opacity="0.85">${title}</text>
  <text x="96" y="140" font-family="Arial, sans-serif" font-size="18" letter-spacing="6" fill="#6b6b6b">PLACEHOLDER — REPLACE WITH BEHANCE EXPORT</text>
</svg>`
}

function characterSvg() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800" viewBox="0 0 600 800" role="img" aria-label="Editorial character silhouette">
  <rect width="600" height="800" fill="none"/>
  <ellipse cx="300" cy="220" rx="110" ry="130" fill="#121212" opacity="0.9"/>
  <path d="M140 780 C160 520, 440 520, 460 780 Z" fill="#2a2a2a"/>
  <path d="M210 420 Q300 360 390 420 L420 620 L180 620 Z" fill="#121212" opacity="0.85"/>
  <circle cx="255" cy="210" r="8" fill="#f4f0ea"/>
  <circle cx="345" cy="210" r="8" fill="#f4f0ea"/>
</svg>`
}

await mkdir(path.join(root, 'projects'), { recursive: true })
await mkdir(path.join(root, 'character'), { recursive: true })
await mkdir(path.join(root, 'social'), { recursive: true })
await mkdir(path.join(root, '..', 'favicon'), { recursive: true })

for (const p of projects) {
  const out = path.join(root, 'projects', `${p.file}.svg`)
  await writeFile(out, svg(p))
}

await writeFile(path.join(root, 'character', 'hero-character.svg'), characterSvg())
await writeFile(
  path.join(root, 'social', 'og-cover.svg'),
  svg({ title: 'Anushri Raina', accent: '#121212', w: 1200, h: 630 }),
)
await writeFile(
  path.join(root, '..', 'favicon', 'favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#121212"/><text x="4" y="24" fill="#f4f0ea" font-size="18" font-family="sans-serif">AR</text></svg>`,
)

console.log(`Generated ${projects.length + 3} placeholder assets.`)
