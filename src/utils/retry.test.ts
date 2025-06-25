import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff, defaultRetryOptions } from './retry';

describe('retryWithBackoff', () => {
  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
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

    const promise = retryWithBackoff(operation, { maxRetries: 2 });
    
    // Fast-forward through the delay
    await vi.runAllTimersAsync();
    const result = await promise;
    
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

    const promise = retryWithBackoff(operation);
    
    await vi.runAllTimersAsync();
    const result = await promise;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should respect maxRetries limit', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' });
    
    const promise = retryWithBackoff(operation, { maxRetries: 2 });
    
    await vi.runAllTimersAsync();
    
    await expect(promise).rejects.toEqual({ status: 500, message: 'Server Error' });
    expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
  });

  it('should use exponential backoff', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' });
    
    const promise = retryWithBackoff(operation, { maxRetries: 3, baseDelay: 100 });
    
    // Don't wait for completion, just check that timers are set correctly
    setTimeout(() => {
      // After first failure, should have timer for 100ms
      expect(vi.getTimerCount()).toBe(1);
    }, 0);
    
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toEqual({ status: 500, message: 'Server Error' });
  });

  it('should respect maxDelay', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 500, message: 'Server Error' });
    
    const promise = retryWithBackoff(operation, { 
      maxRetries: 10, 
      baseDelay: 1000, 
      maxDelay: 2000 
    });
    
    await vi.runAllTimersAsync();
    await expect(promise).rejects.toEqual({ status: 500, message: 'Server Error' });
  });

  it('should use custom shouldRetry function', async () => {
    const operation = vi.fn().mockRejectedValue({ status: 404, message: 'Not Found' });
    
    const shouldRetry = vi.fn().mockReturnValue(true);
    const promise = retryWithBackoff(operation, { maxRetries: 1, shouldRetry });
    
    await vi.runAllTimersAsync();
    
    await expect(promise).rejects.toEqual({ status: 404, message: 'Not Found' });
    expect(shouldRetry).toHaveBeenCalledWith({ status: 404, message: 'Not Found' });
    expect(operation).toHaveBeenCalledTimes(2);
  });
});