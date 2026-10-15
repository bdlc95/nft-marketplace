import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { businessHandlers } from './business'
import { socketHandlers } from './socket'

export const worker = setupWorker(
  ...handlers,
  ...businessHandlers,
  ...socketHandlers,
)
