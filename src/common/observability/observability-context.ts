import { AsyncLocalStorage } from 'node:async_hooks'

export type ObservabilityContext = Readonly<{
  requestId: string
}>

const observabilityContextStorage =
  new AsyncLocalStorage<ObservabilityContext>()

export function runWithObservabilityContext<T>(
  context: ObservabilityContext,
  callback: () => T,
): T {
  return observabilityContextStorage.run(context, callback)
}

export function getObservabilityContext(): ObservabilityContext | undefined {
  return observabilityContextStorage.getStore()
}
