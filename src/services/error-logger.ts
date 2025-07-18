// ABOUTME: KV-based error logging service that captures application errors, warnings, and info messages.
// ABOUTME: Stores structured logs with context data and automatic expiration for operational monitoring.
export interface ErrorLog {
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  context?: Record<string, any>;
  stack?: string;
}

export class ErrorLogger {
  constructor(private kv: KVNamespace) {}

  async logError(
    error: Error | string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.log("error", error, context);
  }

  async logWarning(
    message: string,
    context?: Record<string, any>
  ): Promise<void> {
    await this.log("warning", message, context);
  }

  async logInfo(message: string, context?: Record<string, any>): Promise<void> {
    await this.log("info", message, context);
  }

  private async log(
    level: ErrorLog["level"],
    error: Error | string,
    context?: Record<string, any>
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const errorLog: ErrorLog = {
        timestamp,
        level,
        message: error instanceof Error ? error.message : error,
        context,
        stack: error instanceof Error ? error.stack : undefined,
      };

      // Store with timestamp-based key for chronological ordering
      const key = `error:${timestamp}:${Math.random().toString(36).substring(2, 11)}`;
      await this.kv.put(key, JSON.stringify(errorLog), {
        expirationTtl: 30 * 24 * 60 * 60, // Keep errors for 30 days
      });

      // Also log to console for immediate visibility
      console.error(`[${level.toUpperCase()}] ${errorLog.message}`, {
        context: errorLog.context,
        stack: errorLog.stack,
      });
    } catch (kvError) {
      // Fallback to console if KV fails
      console.error("Failed to log to KV:", kvError);
      console.error("Original error:", error, context);
    }
  }

  async getRecentErrors(limit = 50): Promise<ErrorLog[]> {
    try {
      // Get all keys and filter client-side since prefix search isn't working
      const list = await this.kv.list({ limit: 1000 });
      const errorKeys = list.keys.filter(key => key.name.startsWith("error:"));
      const errors: ErrorLog[] = [];

      // Process up to 'limit' error keys
      for (const key of errorKeys.slice(0, limit)) {
        try {
          const value = await this.kv.get(key.name);
          if (value) {
            errors.push(JSON.parse(value));
          } else {
            console.error("Empty value for key:", key.name);
          }
        } catch (parseError) {
          console.error(
            "Failed to parse error log for key:",
            key.name,
            "Error:",
            parseError
          );
          // Also log the raw value to see what we're trying to parse
          try {
            const rawValue = await this.kv.get(key.name);
            console.error("Raw value:", rawValue);
          } catch (e) {
            console.error("Failed to get raw value:", e);
          }
        }
      }

      // Sort by timestamp (newest first)
      return errors.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error("Failed to retrieve error logs:", error);
      return [];
    }
  }

  async clearOldErrors(olderThanDays = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const list = await this.kv.list({ prefix: "error:" });
      let deletedCount = 0;

      for (const key of list.keys) {
        try {
          const value = await this.kv.get(key.name);
          if (value) {
            const errorLog: ErrorLog = JSON.parse(value);
            if (new Date(errorLog.timestamp) < cutoffDate) {
              await this.kv.delete(key.name);
              deletedCount++;
            }
          }
        } catch {
          // Delete unparseable entries
          await this.kv.delete(key.name);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Failed to clear old errors:", error);
      return 0;
    }
  }
}
