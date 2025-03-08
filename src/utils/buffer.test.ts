import { CircularBuffer } from './buffer.js';

describe('CircularBuffer', () => {
  describe('constructor', () => {
    it('should create a buffer with the specified capacity', () => {
      const buffer = new CircularBuffer<number>(5);
      expect(buffer.getCapacity()).toBe(5);
      expect(buffer.getSize()).toBe(0);
    });
  });

  describe('push', () => {
    it('should add items to the buffer', () => {
      const buffer = new CircularBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      expect(buffer.getSize()).toBe(2);
      expect(buffer.getAll()).toEqual([1, 2]);
    });

    it('should overwrite old items when full', () => {
      const buffer = new CircularBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4);
      expect(buffer.getSize()).toBe(3);
      expect(buffer.getAll()).toEqual([2, 3, 4]);
    });
  });

  describe('getAll', () => {
    it('should return all items in order', () => {
      const buffer = new CircularBuffer<string>(5);
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');
      expect(buffer.getAll()).toEqual(['a', 'b', 'c']);
    });

    it('should return an empty array for an empty buffer', () => {
      const buffer = new CircularBuffer<string>(5);
      expect(buffer.getAll()).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all items from the buffer', () => {
      const buffer = new CircularBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.clear();
      expect(buffer.getSize()).toBe(0);
      expect(buffer.getAll()).toEqual([]);
    });
  });
}); 