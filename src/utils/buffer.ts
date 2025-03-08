/**
 * A circular buffer implementation for storing log lines with a fixed capacity
 */
export class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private tail: number = 0;
  private size: number = 0;
  private readonly capacity: number;

  /**
   * Create a new circular buffer
   * @param capacity Maximum number of items the buffer can hold
   */
  constructor(capacity: number) {
    this.buffer = new Array<T>(capacity);
    this.capacity = capacity;
  }

  /**
   * Add an item to the buffer, overwriting the oldest item if full
   * @param item Item to add to the buffer
   */
  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;

    if (this.size < this.capacity) {
      this.size++;
    } else {
      // Buffer is full, move tail forward
      this.tail = (this.tail + 1) % this.capacity;
    }
  }

  /**
   * Get all items currently in the buffer in order of insertion
   * @returns Array of items in order of insertion (oldest to newest)
   */
  getAll(): T[] {
    const result: T[] = [];
    let current = this.tail;

    for (let i = 0; i < this.size; i++) {
      result.push(this.buffer[current]);
      current = (current + 1) % this.capacity;
    }

    return result;
  }

  /**
   * Get the number of items in the buffer
   */
  getSize(): number {
    return this.size;
  }

  /**
   * Get the capacity of the buffer
   */
  getCapacity(): number {
    return this.capacity;
  }

  /**
   * Clear all items from the buffer
   */
  clear(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
  }
} 