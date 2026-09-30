export function Footer() {
  return (
    <footer className="border-t border-line px-5 py-10 md:px-10">
      <div className="mx-auto max-w-[1800px]">
        <p className="text-sm font-semibold tracking-tight">ANUSHRI RAINA</p>
        <p className="mt-1 text-xs tracking-[0.15em] text-muted uppercase">Graphic Designer</p>
        <p className="mt-4 text-xs text-muted">© {new Date().getFullYear()}</p>
      </div>
    </footer>
  )
}
