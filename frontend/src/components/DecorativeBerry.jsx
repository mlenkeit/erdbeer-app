export function DecorativeBerry({ className = "" }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className={className}
      fill="none"
    >
      <path
        d="M32 59C18 48 10 36 13 24c2-9 10-15 19-15s17 6 19 15c3 12-5 24-19 35Z"
        fill="#E9434A"
      />
      <path
        d="M24 10c2-5 6-7 8-7s6 2 8 7c-4-2-12-2-16 0Z"
        fill="#6BAA4A"
      />
      <path d="M20 12c-5-1-8-4-10-8 6 0 10 2 14 6" fill="#6BAA4A" />
      <path d="M44 12c5-1 8-4 10-8-6 0-10 2-14 6" fill="#6BAA4A" />
      {[[25, 25], [35, 24], [29, 34], [40, 35], [24, 43], [34, 46]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="2" ry="3" fill="#FFF3E6" />
      ))}
    </svg>
  )
}
