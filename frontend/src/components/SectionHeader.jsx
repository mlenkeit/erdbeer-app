export function SectionHeader({ title, action }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-base font-semibold text-leaf-900">{title}</h2>
      {action}
    </div>
  )
}
