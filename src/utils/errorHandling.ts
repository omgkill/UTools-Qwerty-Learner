export type AppErrorType =
  | 'DATABASE_ERROR'
  | 'NETWORK_ERROR'
  | 'STORAGE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR'

export type AppError = {
  type: AppErrorType
  message: string
  originalError?: unknown
  timestamp: number
  context?: Record<string, unknown>
}

export class AppErrorClass extends Error {
  public readonly type: AppErrorType
  public readonly timestamp: number
  public readonly context?: Record<string, unknown>

  constructor(type: AppErrorType, message: string, originalError?: unknown, context?: Record<string, unknown>) {
    super(message)
    this.name = 'AppError'
    this.type = type
    this.timestamp = Date.now()
    this.context = context
    this.cause = originalError instanceof Error ? originalError : undefined
  }

  toJSON(): AppError {
    return {
      type: this.type,
      message: this.message,
      originalError: this.cause,
      timestamp: this.timestamp,
      context: this.context,
    }
  }
}

export function createAppError(
  type: AppErrorType,
  message: string,
  originalError?: unknown,
  context?: Record<string, unknown>,
): AppErrorClass {
  return new AppErrorClass(type, message, originalError, context)
}

export function isAppError(error: unknown): error is AppErrorClass {
  return error instanceof AppErrorClass
}

export function getErrorMessage(error: unknown): string {
  if (isAppError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return '发生了未知错误'
}

export function getErrorType(error: unknown): AppErrorType {
  if (isAppError(error)) {
    return error.type
  }
  return 'UNKNOWN_ERROR'
}

type ErrorHandler = (error: AppError) => void

const errorHandlers: Set<ErrorHandler> = new Set()

export function registerErrorHandler(handler: ErrorHandler): () => void {
  errorHandlers.add(handler)
  return () => errorHandlers.delete(handler)
}

export function handleError(error: unknown, context?: Record<string, unknown>): void {
  const appError = isAppError(error)
    ? error
    : createAppError('UNKNOWN_ERROR', getErrorMessage(error), error, context)

  console.error('[ErrorHandler]', {
    type: appError.type,
    message: appError.message,
    timestamp: new Date(appError.timestamp).toISOString(),
    context: appError.context,
  })

  errorHandlers.forEach((handler) => {
    try {
      handler(appError)
    } catch (handlerError) {
      console.error('[ErrorHandler] Handler threw error:', handlerError)
    }
  })
}

export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: Record<string, unknown>,
): Promise<T | null> {
  try {
    return await fn()
  } catch (error) {
    handleError(error, context)
    return null
  }
}

export function withErrorHandlingSync<T>(fn: () => T, context?: Record<string, unknown>): T | null {
  try {
    return fn()
  } catch (error) {
    handleError(error, context)
    return null
  }
}