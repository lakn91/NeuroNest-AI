import { Metric, Counter, Gauge, Histogram, MetricType } from './Metrics';

/**
 * Registry for managing metrics
 */
export class MetricsRegistry {
  private static instance: MetricsRegistry;
  private metrics: Map<string, Metric> = new Map();
  
  /**
   * Get the singleton instance of the registry
   */
  public static getInstance(): MetricsRegistry {
    if (!MetricsRegistry.instance) {
      MetricsRegistry.instance = new MetricsRegistry();
    }
    return MetricsRegistry.instance;
  }
  
  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {
    // Initialize default metrics
    this.createDefaultMetrics();
  }
  
  /**
   * Create default metrics
   */
  private createDefaultMetrics(): void {
    // System metrics
    this.registerMetric(
      new Gauge('system_memory_usage', 'Memory usage in bytes')
    );
    
    this.registerMetric(
      new Gauge('system_cpu_usage', 'CPU usage percentage')
    );
    
    // API metrics
    this.registerMetric(
      new Counter('api_requests_total', 'Total number of API requests', ['method', 'path', 'status'])
    );
    
    this.registerMetric(
      new Histogram('api_request_duration_seconds', 'API request duration in seconds', undefined, ['method', 'path'])
    );
    
    // LLM metrics
    this.registerMetric(
      new Counter('llm_requests_total', 'Total number of LLM requests', ['provider', 'model'])
    );
    
    this.registerMetric(
      new Histogram('llm_request_duration_seconds', 'LLM request duration in seconds', undefined, ['provider', 'model'])
    );
    
    this.registerMetric(
      new Counter('llm_token_usage_total', 'Total number of tokens used', ['provider', 'model', 'type'])
    );
    
    // Agent metrics
    this.registerMetric(
      new Counter('agent_actions_total', 'Total number of agent actions', ['agent_id', 'action_type'])
    );
    
    this.registerMetric(
      new Gauge('active_agents', 'Number of active agents')
    );
    
    // Task metrics
    this.registerMetric(
      new Counter('tasks_total', 'Total number of tasks', ['status'])
    );
    
    this.registerMetric(
      new Gauge('active_tasks', 'Number of active tasks')
    );
    
    this.registerMetric(
      new Histogram('task_duration_seconds', 'Task duration in seconds', undefined, ['task_type'])
    );
  }
  
  /**
   * Register a metric
   * @param metric The metric to register
   */
  registerMetric(metric: Metric): void {
    this.metrics.set(metric.name, metric);
  }
  
  /**
   * Get a metric by name
   * @param name The name of the metric
   * @returns The metric, or undefined if not found
   */
  getMetric(name: string): Metric | undefined {
    return this.metrics.get(name);
  }
  
  /**
   * Get all metrics
   * @returns Array of all metrics
   */
  getAllMetrics(): Metric[] {
    return Array.from(this.metrics.values());
  }
  
  /**
   * Get metrics by type
   * @param type The type of metrics to get
   * @returns Array of metrics of the specified type
   */
  getMetricsByType(type: MetricType): Metric[] {
    return this.getAllMetrics().filter(metric => metric.type === type);
  }
  
  /**
   * Create a counter metric
   * @param name The name of the counter
   * @param description The description of the counter
   * @param labels Labels for the counter
   * @returns The created counter
   */
  createCounter(name: string, description: string, labels: string[] = []): Counter {
    const counter = new Counter(name, description, labels);
    this.registerMetric(counter);
    return counter;
  }
  
  /**
   * Create a gauge metric
   * @param name The name of the gauge
   * @param description The description of the gauge
   * @param labels Labels for the gauge
   * @returns The created gauge
   */
  createGauge(name: string, description: string, labels: string[] = []): Gauge {
    const gauge = new Gauge(name, description, labels);
    this.registerMetric(gauge);
    return gauge;
  }
  
  /**
   * Create a histogram metric
   * @param name The name of the histogram
   * @param description The description of the histogram
   * @param buckets Buckets for the histogram
   * @param labels Labels for the histogram
   * @returns The created histogram
   */
  createHistogram(
    name: string,
    description: string,
    buckets?: number[],
    labels: string[] = []
  ): Histogram {
    const histogram = new Histogram(name, description, buckets, labels);
    this.registerMetric(histogram);
    return histogram;
  }
  
  /**
   * Remove a metric
   * @param name The name of the metric to remove
   */
  removeMetric(name: string): void {
    this.metrics.delete(name);
  }
  
  /**
   * Reset all metrics
   */
  resetAllMetrics(): void {
    for (const metric of this.metrics.values()) {
      metric.reset();
    }
  }
  
  /**
   * Get metrics data in Prometheus format
   * @returns Metrics data in Prometheus format
   */
  getPrometheusMetrics(): string {
    const lines: string[] = [];
    
    for (const metric of this.metrics.values()) {
      lines.push(`# HELP ${metric.name} ${metric.description}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);
      
      const value = metric.getValue();
      
      if (typeof value === 'number') {
        lines.push(`${metric.name} ${value}`);
      } else {
        for (const [key, val] of Object.entries(value)) {
          if (key === '') {
            lines.push(`${metric.name} ${val}`);
          } else if (metric.type === MetricType.HISTOGRAM) {
            if (key === 'sum') {
              lines.push(`${metric.name}_sum ${val}`);
            } else if (key === 'count') {
              lines.push(`${metric.name}_count ${val}`);
            } else if (key.startsWith('le_')) {
              const bucket = key.substring(3);
              lines.push(`${metric.name}_bucket{le="${bucket}"} ${val}`);
            }
          } else {
            const labels = key.split(',').map(label => {
              const [name, value] = label.split('=');
              return `${name}="${value}"`;
            }).join(',');
            
            lines.push(`${metric.name}{${labels}} ${val}`);
          }
        }
      }
    }
    
    return lines.join('\n');
  }
}