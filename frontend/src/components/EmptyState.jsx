import { AppCard } from './AppCard'
import { DecorativeBerry } from './DecorativeBerry'

export function EmptyState({ title, description, action }) {
  return (
    <AppCard variant="soft" className="p-6 text-center">
      <DecorativeBerry className="mx-auto mb-4 h-14 w-14" />
      <h2 className="font-heading text-xl text-leaf-900">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-ink-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </AppCard>
  )
}
