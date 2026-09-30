import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { execSync } from 'node:child_process'

const CDN = 'https://mir-s3-cdn-cf.behance.net/projects'

/** Verified from behance.net/anushriraina6 — cover asset hashes from profile HTML */
const projects = [
  {
    slug: 'brand-identity',
    title: 'Brand Identity | Mockup Brand',
    behanceId: 248198295,
    hash: 'faa0f4248198295.Y3JvcCwxMDM4LDgxMiw3MjUsMzg.png',
  },
  {
    slug: 'brand-with-a-heart',
    title: 'Brand With A Heart',
    behanceId: 245401853,
    hash: '30bb98245401853.Y3JvcCwxODQxLDE0NDAsMzYwLDA.png',
  },
  {
    slug: 'food-creatives',
    title: 'Food Creatives',
    behanceId: 242821061,
    hash: '69ba66242821061.Y3JvcCwxMjAwLDkzOCwwLDI3OQ.png',
  },
  {
    slug: 'adventure-website',
    title: 'Adventure Website Mockup',
    behanceId: 242021543,
    hash: 'aecb30242021543.Y3JvcCwxOTIwLDE1MDEsMCwxODM0.png',
  },
  {
    slug: 'roshan-shah',
    title: 'Roshan Shah Jewellers',
    behanceId: 227006567,
    hash: '08ece1227006567.Y3JvcCwxMjE5LDk1Myw4MSww.png',
  },
  {
    slug: 'invitation',
    title: 'A4 Invitation | Moodboard',
    behanceId: 225950611,
    hash: '9f0fef225950611.Y3JvcCwxNjAwLDEyNTEsMCwxMDI1.png',
  },
  {
    slug: 'real-estate',
    title: 'Real Estate Branding',
    behanceId: 225925307,
    hash: 'a492f4225925307.Y3JvcCwxNjAwLDEyNTEsMCwxMTA.png',
  },
  {
    slug: 'book-cover',
    title: 'Book Cover',
    behanceId: 225833191,
    hash: 'd19a48225833191.Y3JvcCwxNDA2LDExMDAsOTcsMA.png',
  },
  {
    slug: 'billboards',
    title: 'Billboards or Hoardings',
    behanceId: 225769125,
    hash: '478452225769125.Y3JvcCwxNDA2LDExMDAsOTcsMA.png',
  },
  {
    slug: 'company-portfolio',
    title: 'Company Portfolio',
    behanceId: 225767477,
    hash: '3579c9225767477.Y3JvcCwxNzg5LDE0MDAsMTA2LDA.png',
  },
  {
    slug: 'timbs',
    title: 'Timbs',
    behanceId: 225659479,
    hash: 'ee2205225659479.Y3JvcCwxMjMxLDk2Myw4NSww.png',
  },
  {
    slug: 'social-media',
    title: 'Social Media Banners',
    behanceId: 225040911,
    hash: '7aa405225040911.Y3JvcCwxNTk1LDEyNDgsODQxLDA.png',
  },
]

async function download(url, dest) {
  execSync(`curl -sL -A "Mozilla/5.0" "${url}" -o "${dest}"`, { stdio: 'inherit' })
}

const root = path.resolve('public/projects')

for (const project of projects) {
  const dir = path.join(root, project.slug)
  await mkdir(dir, { recursive: true })
  const coverUrl = `${CDN}/max_808_webp/${project.hash}`
  const coverPath = path.join(dir, 'cover.webp')
  console.log(`Downloading ${project.slug}...`)
  await download(coverUrl, coverPath)
  // Detail pages reuse cover until full case-study exports are added manually.
  await download(coverUrl, path.join(dir, '01.webp'))
}

await writeFile(
  path.join(root, 'manifest.json'),
  JSON.stringify({ downloadedAt: new Date().toISOString(), projects }, null, 2),
)

console.log('Done. Add additional 02.webp, 03.webp exports per project from Behance as needed.')
