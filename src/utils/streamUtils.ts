

/**
 * Safely converts a stream ID to string or number
 */
export function safeStreamId(id: string | number | undefined): string | number {
  if (id === undefined) {
    throw new Error('Stream ID cannot be undefined');
  }
  return id;
} 