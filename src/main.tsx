import './index.css'
import './design-match.css'
import '@fontsource/roboto-mono/latin-400.css'
import '@fontsource/roboto-mono/latin-500.css'
import '@fontsource/roboto-mono/latin-700.css'

async function bootstrap() {
  if (import.meta.env.VITE_ENABLE_MOCKS === 'true') {
    const { worker } = await import('./mocks/browser')
    await worker.start({
      quiet: true,
      onUnhandledRequest(request, print) {
        if (new URL(request.url).pathname.startsWith('/api/')) print.error()
      },
    })
  }
  // A importação tardia evita que socket.io-client capture WebSocket antes do MSW.
  const { render } = await import('./app/render')
  render()
}

void bootstrap().catch((error) => {
  console.error('Falha ao inicializar a aplicação', error)
  const root = document.getElementById('root')
  if (root) {
    root.textContent =
      'Não foi possível iniciar a aplicação. Recarregue a página e confira a conexão.'
    root.setAttribute('role', 'alert')
  }
})
