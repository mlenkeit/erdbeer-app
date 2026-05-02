export default function Welcome() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <h1 className="text-2xl font-bold text-text mb-2">
          Willkommen bei erdbeer-app
        </h1>
        <p className="text-sm text-text-secondary mb-4">
          erdbeer-app hilft Gruppen dabei, ihre Erdbeereinkäufe zu erfassen und den Überblick zu behalten.
        </p>
        <p className="text-sm text-text-secondary">
          Um die App zu nutzen, benötigst du einen persönlichen Einladungslink von deinem Gruppenadmin.
        </p>
      </div>
    </div>
  )
}
