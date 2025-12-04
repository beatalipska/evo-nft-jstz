// Type declarations for Jstz runtime globals

declare global {
  /**
   * Jstz key-value store for persistent storage
   */
  const Kv: {
    /**
     * Get a value from the key-value store
     * @param key The key to retrieve
     * @returns The value associated with the key, or null if not found
     */
    get<T = unknown>(key: string): T | null;
    
    /**
     * Set a value in the key-value store
     * @param key The key to store the value under
     * @param value The value to store (must be JSON-serializable)
     */
    set(key: string, value: unknown): void;
  };
}

export {};


