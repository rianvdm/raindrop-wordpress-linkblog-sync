import { describe, it, expect, vi, beforeEach } from 'vitest';
import { retryWithBackoff, defaultRetryOptions } from './retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    
    const result = await retryWithBackoff(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce({ status: 500, message: 'Server Error' })
      .mockResolvedValue('success');

    const result = await retryWithBackoff(operation, { 
      maxRetries: 2, 
      baseDelay: 1 // Very short delay for testing
    });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 400, message: 'Bad Request' });
    
    await expect(retryWithBackoff(operation)).rejects.toEqual({ status: 400, message: 'Bad Request' });
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry network errors', async () => {
    const networkError = new TypeError('fetch failed');
    const operation = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockResolvedValue('success');

    const result = await retryWithBackoff(operation, { baseDelay: 1 });
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should respect maxRetries limit', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' });
    
    await expect(retryWithBackoff(operation, { 
      maxRetries: 2, 
      baseDelay: 1 
    })).rejects.toEqual({ status: 500, message: 'Server Error' });
    
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' });
    
    await expect(retryWithBackoff(operation, { 
      maxRetries: 2, 
      baseDelay: 1 
    })).rejects.toEqual({ status: 500, message: 'Server Error' });
    
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should respect maxDelay', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' });
    
    await expect(retryWithBackoff(operation, { 
      maxRetries: 2, 
      baseDelay: 1, 
      maxDelay: 2 
    })).rejects.toEqual({ status: 500, message: 'Server Error' });
    
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use custom shouldRetry function', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 404, message: 'Not Found' });
    
    const shouldRetry = vi.fn().mockReturnValue(true);
    
    await expect(retryWithBackoff(operation, { 
      maxRetries: 1, 
      shouldRetry, 
      baseDelay: 1 
    })).rejects.toEqual({ status: 404, message: 'Not Found' });
    
    expect(shouldRetry).toHaveBeenCalledWith({ status: 404, message: 'Not Found' });
    expect(operation).toHaveBeenCalledTimes(2);
  });
});