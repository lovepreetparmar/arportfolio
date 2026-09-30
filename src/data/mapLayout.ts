export const WORLD = { width: 12000, height: 8000 }

export type Territory = 'branding' | 'editorial' | 'digital' | 'print' | 'experiments'

export const mapLabels = [
  { text: 'BRANDING', x: 2800, y: 1400, size: 'lg' as const },
  { text: 'EDITORIAL', x: 9200, y: 1200, size: 'md' as const },
  { text: 'DIGITAL', x: 9600, y: 4200, size: 'md' as const },
  { text: 'PRINT', x: 2200, y: 5800, size: 'md' as const },
  { text: 'EXPERIMENTS', x: 8800, y: 7000, size: 'sm' as const },
]

export const centralLandmark = {
  x: 6000,
  y: 3800,
  title: 'ANUSHRI RAINA',
  subtitle: 'GRAPHIC DESIGNER',
}

export const aboutLandmark = {
  x: 5400,
  y: 4300,
  portrait: '/character/anushri.svg',
}

export const contactLandmark = {
  x: 10800,
  y: 7200,
}

export const initialCamera = {
  x: 5200,
  y: 3200,
  zoom: 0.42,
}
