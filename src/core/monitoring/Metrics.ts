/**
 * Types of metrics
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram',
  SUMMARY = 'summary'
}

/**
 * Interface for a metric
 */
export interface Metric {
  /**
   * Name of the metric
   */
  name: string;
  
  /**
   * Description of the metric
   */
  description: string;
  
  /**
   * Type of the metric
   */
  type: MetricType;
  
  /**
   * Labels for the metric
   */
  labels: string[];
  
  /**
   * Get the current value of the metric
   * @param labelValues Values for the labels
   * @returns The current value
   */
  getValue(labelValues?: Record<string, string>): number | Record<string, number>;
  
  /**
   * Reset the metric
   */
  reset(): void;
}

/**
 * Counter metric that only increases
 */
export class Counter implements Metric {
  name: string;
  description: string;
  type: MetricType = MetricType.COUNTER;
  labels: string[];
  private values: Map<string, number> = new Map();
  
  constructor(name: string, description: string, labels: string[] = []) {
    this.name = name;
    this.description = description;
    this.labels = labels;
  }
  
  /**
   * Increment the counter
   * @param value Amount to increment by (default: 1)
   * @param labelValues Values for the labels
   */
  inc(value: number = 1, labelValues: Record<string, string> = {}): void {
    const key = this.getLabelKey(labelValues);
    const currentValue = this.values.get(key) || 0;
    this.values.set(key, currentValue + value);
  }
  
  /**
   * Get the current value of the counter
   * @param labelValues Values for the labels
   * @returns The current value
   */
  getValue(labelValues: Record<string, string> = {}): number | Record<string, number> {
    if (this.labels.length === 0) {
      return this.values.get('') || 0;
    }
    
    if (Object.keys(labelValues).length > 0) {
      const key = this.getLabelKey(labelValues);
      return this.values.get(key) || 0;
    }
    
    // Return all values
    const result: Record<string, number> = {};
    for (const [key, value] of this.values.entries()) {
      result[key] = value;
    }
    return result;
  }
  
  /**
   * Reset the counter
   */
  reset(): void {
    this.values.clear();
  }
  
  /**
   * Get a key for the label values
   * @param labelValues Values for the labels
   * @returns A key for the label values
   */
  private getLabelKey(labelValues: Record<string, string>): string {
    if (this.labels.length === 0) {
      return '';
    }
    
    return this.labels
      .map(label => `${label}=${labelValues[label] || ''}`)
      .join(',');
  }
}

/**
 * Gauge metric that can increase and decrease
 */
export class Gauge implements Metric {
  name: string;
  description: string;
  type: MetricType = MetricType.GAUGE;
  labels: string[];
  private values: Map<string, number> = new Map();
  
  constructor(name: string, description: string, labels: string[] = []) {
    this.name = name;
    this.description = description;
    this.labels = labels;
  }
  
  /**
   * Set the gauge value
   * @param value The value to set
   * @param labelValues Values for the labels
   */
  set(value: number, labelValues: Record<string, string> = {}): void {
    const key = this.getLabelKey(labelValues);
    this.values.set(key, value);
  }
  
  /**
   * Increment the gauge
   * @param value Amount to increment by (default: 1)
   * @param labelValues Values for the labels
   */
  inc(value: number = 1, labelValues: Record<string, string> = {}): void {
    const key = this.getLabelKey(labelValues);
    const currentValue = this.values.get(key) || 0;
    this.values.set(key, currentValue + value);
  }
  
  /**
   * Decrement the gauge
   * @param value Amount to decrement by (default: 1)
   * @param labelValues Values for the labels
   */
  dec(value: number = 1, labelValues: Record<string, string> = {}): void {
    const key = this.getLabelKey(labelValues);
    const currentValue = this.values.get(key) || 0;
    this.values.set(key, currentValue - value);
  }
  
  /**
   * Get the current value of the gauge
   * @param labelValues Values for the labels
   * @returns The current value
   */
  getValue(labelValues: Record<string, string> = {}): number | Record<string, number> {
    if (this.labels.length === 0) {
      return this.values.get('') || 0;
    }
    
    if (Object.keys(labelValues).length > 0) {
      const key = this.getLabelKey(labelValues);
      return this.values.get(key) || 0;
    }
    
    // Return all values
    const result: Record<string, number> = {};
    for (const [key, value] of this.values.entries()) {
      result[key] = value;
    }
    return result;
  }
  
  /**
   * Reset the gauge
   */
  reset(): void {
    this.values.clear();
  }
  
  /**
   * Get a key for the label values
   * @param labelValues Values for the labels
   * @returns A key for the label values
   */
  private getLabelKey(labelValues: Record<string, string>): string {
    if (this.labels.length === 0) {
      return '';
    }
    
    return this.labels
      .map(label => `${label}=${labelValues[label] || ''}`)
      .join(',');
  }
}

/**
 * Histogram metric for measuring distributions
 */
export class Histogram implements Metric {
  name: string;
  description: string;
  type: MetricType = MetricType.HISTOGRAM;
  labels: string[];
  private buckets: number[];
  private counts: Map<string, number[]> = new Map();
  private sums: Map<string, number> = new Map();
  private counts_total: Map<string, number> = new Map();
  
  constructor(
    name: string,
    description: string,
    buckets: number[] = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    labels: string[] = []
  ) {
    this.name = name;
    this.description = description;
    this.buckets = buckets.sort((a, b) => a - b);
    this.labels = labels;
  }
  
  /**
   * Observe a value
   * @param value The value to observe
   * @param labelValues Values for the labels
   */
  observe(value: number, labelValues: Record<string, string> = {}): void {
    const key = this.getLabelKey(labelValues);
    
    // Initialize if not exists
    if (!this.counts.has(key)) {
      this.counts.set(key, new Array(this.buckets.length).fill(0));
      this.sums.set(key, 0);
      this.counts_total.set(key, 0);
    }
    
    // Update counts
    const counts = this.counts.get(key)!;
    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]) {
        counts[i]++;
      }
    }
    
    // Update sum and count
    this.sums.set(key, (this.sums.get(key) || 0) + value);
    this.counts_total.set(key, (this.counts_total.get(key) || 0) + 1);
  }
  
  /**
   * Get the current value of the histogram
   * @param labelValues Values for the labels
   * @returns The current value
   */
  getValue(labelValues: Record<string, string> = {}): Record<string, number> {
    const key = this.getLabelKey(labelValues);
    
    if (!this.counts.has(key)) {
      return {
        sum: 0,
        count: 0,
        ...this.buckets.reduce((acc, bucket, i) => {
          acc[`le_${bucket}`] = 0;
          return acc;
        }, {} as Record<string, number>)
      };
    }
    
    const counts = this.counts.get(key)!;
    const sum = this.sums.get(key) || 0;
    const count = this.counts_total.get(key) || 0;
    
    return {
      sum,
      count,
      ...this.buckets.reduce((acc, bucket, i) => {
        acc[`le_${bucket}`] = counts[i];
        return acc;
      }, {} as Record<string, number>)
    };
  }
  
  /**
   * Reset the histogram
   */
  reset(): void {
    this.counts.clear();
    this.sums.clear();
    this.counts_total.clear();
  }
  
  /**
   * Get a key for the label values
   * @param labelValues Values for the labels
   * @returns A key for the label values
   */
  private getLabelKey(labelValues: Record<string, string>): string {
    if (this.labels.length === 0) {
      return '';
    }
    
    return this.labels
      .map(label => `${label}=${labelValues[label] || ''}`)
      .join(',');
  }
}