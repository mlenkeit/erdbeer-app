import { DecorativeBerry } from '../components/DecorativeBerry'

export default function Welcome() {
  return (
    <div className="min-h-dvh bg-cream-100 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <DecorativeBerry className="mx-auto mb-4 h-16 w-16" />
        <h1 className="font-heading text-2xl text-leaf-900 mb-2">
          Willkommen bei erdbeer-app
        </h1>
        <p className="text-sm text-ink-500 mb-4">
          erdbeer-app hilft Gruppen dabei, ihre Erdbeereinkäufe zu erfassen und den Überblick zu behalten.
        </p>
        <p className="text-sm text-ink-500">
          Um die App zu nutzen, benötigst du einen persönlichen Einladungslink von deinem Gruppenadmin.
        </p>
      </div>
    </div>
  )
}
