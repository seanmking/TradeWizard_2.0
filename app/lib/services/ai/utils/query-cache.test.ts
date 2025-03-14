/**
 * Tests for the QueryCache implementation
 */

import { QueryCache } from './query-cache';

describe('QueryCache', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should store and retrieve values', () => {
    const cache = new QueryCache<string>(1000); // 1 second TTL
    
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBeUndefined();
  });

  test('should expire entries after TTL', () => {
    const cache = new QueryCache<string>(1000); // 1 second TTL
    
    cache.set('key1', 'value1');
    
    // Fast-forward time by 500ms (half the TTL)
    jest.advanceTimersByTime(500);
    expect(cache.get('key1')).toBe('value1');
    
    // Fast-forward time by another 600ms (past the TTL)
    jest.advanceTimersByTime(600);
    expect(cache.get('key1')).toBeUndefined();
  });

  test('should use custom TTL when provided', () => {
    const cache = new QueryCache<string>(1000); // Default 1 second TTL
    
    cache.set('key1', 'value1'); // Default TTL
    cache.set('key2', 'value2', 3000); // 3 second TTL
    
    // Fast-forward time by 1.5 seconds
    jest.advanceTimersByTime(1500);
    
    // key1 should be expired, key2 should still be valid
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
    
    // Fast-forward time by another 2 seconds (3.5 seconds total)
    jest.advanceTimersByTime(2000);
    
    // Both should be expired now
    expect(cache.get('key2')).toBeUndefined();
  });

  test('should limit maximum number of entries', () => {
    const cache = new QueryCache<string>(10000, 2); // 10 seconds TTL, max 2 entries
    
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    // Both entries should be in the cache
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    
    // Add a third entry, which should remove the oldest (key1)
    cache.set('key3', 'value3');
    
    // key1 should be gone, key2 and key3 should remain
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
  });

  test('should correctly implement has() method', () => {
    const cache = new QueryCache<string>(1000); // 1 second TTL
    
    cache.set('key1', 'value1');
    
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('key2')).toBe(false);
    
    // Fast-forward time past TTL
    jest.advanceTimersByTime(1100);
    
    // key1 should now be expired
    expect(cache.has('key1')).toBe(false);
  });

  test('should correctly implement delete() method', () => {
    const cache = new QueryCache<string>(1000);
    
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
    
    cache.delete('key1');
    expect(cache.get('key1')).toBeUndefined();
  });

  test('should correctly implement clear() method', () => {
    const cache = new QueryCache<string>(1000);
    
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBe('value2');
    
    cache.clear();
    
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  test('should correctly implement size() method', () => {
    const cache = new QueryCache<string>(1000);
    
    expect(cache.size()).toBe(0);
    
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    
    expect(cache.size()).toBe(2);
    
    cache.delete('key1');
    
    expect(cache.size()).toBe(1);
    
    // Fast-forward time past TTL
    jest.advanceTimersByTime(1100);
    
    // Getting the size should also clean up expired entries
    expect(cache.size()).toBe(0);
  });

  test('should clean up expired entries periodically', () => {
    const cleanupIntervalMs = 5000; // 5 seconds
    const cache = new QueryCache<string>(1000, 1000, cleanupIntervalMs);
    
    cache.set('key1', 'value1');
    
    // Fast-forward time past TTL but before cleanup
    jest.advanceTimersByTime(2000);
    
    // The entry is expired but still in the cache Map (though get() won't return it)
    expect((cache as any).cache.size).toBe(1);
    
    // Fast-forward time to trigger the cleanup
    jest.advanceTimersByTime(4000);
    
    // The cleanup should have removed the expired entry
    expect((cache as any).cache.size).toBe(0);
  });

  test('should clean up resources on destroy', () => {
    const cache = new QueryCache<string>(1000);
    const spy = jest.spyOn(global, 'clearInterval');
    
    cache.set('key1', 'value1');
    expect(cache.size()).toBe(1);
    
    cache.destroy();
    
    expect(spy).toHaveBeenCalled();
    expect(cache.size()).toBe(0);
  });
}); 