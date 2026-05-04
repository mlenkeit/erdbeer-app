function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`rounded-lg bg-cream-300 motion-safe:animate-pulse ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-cream-300/70 bg-white p-4 space-y-3 shadow-[0_8px_24px_rgba(80,40,20,0.08)]">
      <SkeletonBlock className="h-4 w-2/3" />
      <SkeletonBlock className="h-3 w-1/2" />
      <SkeletonBlock className="h-3 w-3/4" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 py-3">
      <SkeletonBlock className="h-4 w-8" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-3/4" />
        <SkeletonBlock className="h-3 w-1/2" />
      </div>
      <SkeletonBlock className="h-4 w-16" />
    </div>
  )
}

export function SkeletonStats() {
  return (
    <div className="grid grid-cols-3 gap-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-cream-300/70 bg-white p-3 space-y-2 shadow-[0_8px_24px_rgba(80,40,20,0.08)]">
          <SkeletonBlock className="h-6 w-16 mx-auto" />
          <SkeletonBlock className="h-3 w-12 mx-auto" />
        </div>
      ))}
    </div>
  )
}
