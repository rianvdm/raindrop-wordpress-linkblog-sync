// ABOUTME: Retry utility with exponential backoff for handling transient failures in external API calls.
// ABOUTME: Configurable retry logic that distinguishes between retryable and permanent errors.
export interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  shouldRetry?: (error: any) => boolean;
}

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  shouldRetry: (error: any) => {
    // Retry on network errors or 5xx server errors
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return true; // Network error
    }
    if (error.status >= 500 && error.status < 600) {
      return true; // Server error
    }
    // Don't retry on 4xx client errors (auth, validation, etc.)
    return false;
  }
};

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }

      // Check if we should retry this error
      if (!config.shouldRetry!(error)) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
      );

      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error instanceof Error ? error.message : String(error));
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}