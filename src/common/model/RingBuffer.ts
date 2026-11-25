/**
 * RingBuffer.ts
 *
 * Fixed-capacity circular buffer of samples for strip charts.
 */

/** Push-only ring of numbers; oldest samples drop when full. */
export class RingBuffer {
  private readonly data: Float64Array;
  private writeIndex = 0;
  private filled = 0;

  public constructor(capacity: number) {
    this.data = new Float64Array(Math.max(1, capacity));
  }

  public get capacity(): number {
    return this.data.length;
  }

  public get length(): number {
    return this.filled;
  }

  /** Push a sample; overwrites the oldest when full. */
  public push(value: number): void {
    this.data[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.data.length;
    if (this.filled < this.data.length) {
      this.filled += 1;
    }
  }

  /**
   * Sample at age `age` (0 = newest). Returns 0 when the buffer is shorter.
   */
  public atAge(age: number): number {
    if (age < 0 || age >= this.filled) {
      return 0;
    }
    const index = (this.writeIndex - 1 - age + this.data.length) % this.data.length;
    return this.data[index] ?? 0;
  }

  public clear(): void {
    this.writeIndex = 0;
    this.filled = 0;
    this.data.fill(0);
  }
}
