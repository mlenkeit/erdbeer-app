function SkeletonBlock({ className = '' }) {
  return (
    <div
      className={`bg-gray-200 rounded-lg motion-safe:animate-pulse ${className}`}
      aria-hidden="true"
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface rounded-xl shadow-sm p-4 space-y-3">
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
    <div className="flex gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex-1 bg-surface rounded-xl shadow-sm p-3 space-y-2">
          <SkeletonBlock className="h-6 w-16 mx-auto" />
          <SkeletonBlock className="h-3 w-12 mx-auto" />
        </div>
      ))}
    </div>
  )
}
