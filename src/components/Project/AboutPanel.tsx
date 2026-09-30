import { site } from '../../data/site'

export function AboutPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-[#faf9f6] p-8 md:p-12">
      <button type="button" className="text-xs tracking-[0.25em] uppercase" onClick={onClose}>
        ← Return to map
      </button>
      <h2 className="mt-12 text-5xl font-bold tracking-tight">ANUSHRI RAINA</h2>
      <p className="mt-4 text-sm tracking-[0.2em] uppercase">Graphic Designer</p>
      <p className="mt-10 max-w-xl text-lg leading-relaxed">{site.bio}</p>
      <ul className="mt-12 space-y-2 text-sm tracking-[0.12em] uppercase">
        <li>Brand Identity</li>
        <li>Typography</li>
        <li>Editorial</li>
        <li>Art Direction</li>
        <li>Digital Design</li>
        <li>Campaigns</li>
      </ul>
    </div>
  )
}
