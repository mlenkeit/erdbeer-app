export function AppCard({ children, className = "", variant = "default" }) {
  const variants = {
    default: "bg-white border border-cream-300/70 shadow-[0_8px_24px_rgba(80,40,20,0.08)]",
    soft: "bg-cream-50 border border-cream-300/80 shadow-[0_6px_18px_rgba(80,40,20,0.06)]",
    highlight: "bg-gradient-to-br from-cream-100 to-blush-100 border border-blush-200 shadow-[0_10px_28px_rgba(180,60,70,0.12)]",
  }

  return (
    <div className={`rounded-2xl ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}
