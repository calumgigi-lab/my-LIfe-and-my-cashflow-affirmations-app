/**
 * Centralized error handling and logging utilities for production debugging
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface ErrorLog {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, any>;
  timestamp: string;
  url?: string;
}

class ErrorLogger {
  private logs: ErrorLog[] = [];
  private maxLogs = 50;

  log(level: LogLevel, message: string, error?: Error, context?: Record<string, any>) {
    const logEntry: ErrorLog = {
      level,
      message,
      error,
      context,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Also log to console in development
    if (__DEV__) {
      const consoleMethod = level === "error" ? console.error : console[level] || console.log;
      consoleMethod(`[${level.toUpperCase()}] ${message}`, error || "", context || "");
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log("debug", message, undefined, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log("info", message, undefined, context);
  }

  warn(message: string, error?: Error, context?: Record<string, any>) {
    this.log("warn", message, error, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.log("error", message, error, context);
  }

  getLogs(): ErrorLog[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }

  getLatestErrors(count: number = 10): ErrorLog[] {
    return this.logs.filter(l => l.level === "error").slice(-count);
  }
}

export const errorLogger = new ErrorLogger();

/**
 * Safe wrapper for API calls with error logging
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  context: { name: string; operation: string },
): Promise<T | null> {
  try {
    return await apiCall();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    errorLogger.error(`API Call Failed: ${context.name}`, error, {
      operation: context.operation,
      message: error.message,
    });
    return null;
  }
}

/**
 * Generate a debug report for error diagnosis
 */
export function getDebugReport() {
  return {
    timestamp: new Date().toISOString(),
    logs: errorLogger.getLogs(),
    recentErrors: errorLogger.getLatestErrors(10),
    logCount: errorLogger.getLogs().length,
  };
}

/**
 * Convert error to user-friendly message
 */
export function getUserFriendlyErrorMessage(error: Error | string): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("401") || message.includes("Unauthorized")) {
    return "Your session expired. Please log in again.";
  }
  if (message.includes("404")) {
    return "The requested resource was not found.";
  }
  if (message.includes("500") || message.includes("Internal server error")) {
    return "Server error. Please try again later.";
  }
  if (message.includes("timeout") || message.includes("Abort")) {
    return "Request took too long. Please check your connection and try again.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Network error. Please check your internet connection.";
  }
  if (message.includes("Database") || message.includes("database")) {
    return "Database error. Please try again later.";
  }

  return "Something went wrong. Please try again.";
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Operation failed after retries");
}
