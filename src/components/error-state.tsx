import { Button } from '@/components/ui/button'

export function ErrorState({
  message,
  retry,
}: {
  message: string
  retry?: () => void
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-border p-8 text-center"
    >
      <p className="mb-4">{message}</p>
      {retry && <Button onClick={retry}>Tentar novamente</Button>}
    </div>
  )
}
