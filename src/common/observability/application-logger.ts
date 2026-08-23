import {
  ConsoleLogger,
  type ConsoleLoggerOptions,
  type LogLevel,
} from '@nestjs/common'
import { getObservabilityContext } from './observability-context'

export type LogFormat = 'json' | 'pretty'
export type LogThreshold = 'error' | 'warn' | 'log' | 'debug' | 'verbose'

export type ApplicationLoggerOptions = Readonly<{
  serviceName: string
  format: LogFormat
  level: LogThreshold
}>

type JsonLogOptions = {
  context: string
  logLevel: LogLevel
  writeStreamType?: 'stdout' | 'stderr'
  errorStack?: unknown
}

const logLevelsByThreshold: Record<LogThreshold, LogLevel[]> = {
  error: ['fatal', 'error'],
  warn: ['fatal', 'error', 'warn'],
  log: ['fatal', 'error', 'warn', 'log'],
  debug: ['fatal', 'error', 'warn', 'log', 'debug'],
  verbose: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
}

function isLogFields(message: unknown): message is Record<string, unknown> {
  return (
    typeof message === 'object' && message !== null && !Array.isArray(message)
  )
}

export class ApplicationLogger extends ConsoleLogger {
  constructor(
    private readonly serviceName: string,
    options: ConsoleLoggerOptions,
  ) {
    super(options)
  }

  protected override getJsonLogObject(
    message: unknown,
    options: JsonLogOptions,
  ) {
    const baseLog = super.getJsonLogObject(message, options)
    const context = getObservabilityContext()
    const contextFields = context
      ? {
          // biome-ignore lint/style/useNamingConvention: Structured log schema uses snake_case.
          request_id: context.requestId,
        }
      : undefined

    if (!isLogFields(message)) {
      return {
        ...baseLog,
        service: this.serviceName,
        ...contextFields,
      }
    }

    const { message: explicitMessage, ...fields } = message

    return {
      ...fields,
      ...baseLog,
      message:
        typeof explicitMessage === 'string'
          ? explicitMessage
          : typeof fields.event === 'string'
            ? fields.event
            : 'structured_log',
      service: this.serviceName,
      ...contextFields,
    }
  }
}

export function createApplicationLogger(
  options: ApplicationLoggerOptions,
): ApplicationLogger {
  const json = options.format === 'json'

  return new ApplicationLogger(options.serviceName, {
    colors: !json,
    compact: json,
    json,
    logLevels: logLevelsByThreshold[options.level],
  })
}
