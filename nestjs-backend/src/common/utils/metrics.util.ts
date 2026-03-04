/**
 * @file metrics.util.ts
 * @description CloudWatch Embedded Metric Format (EMF) emitter.
 *
 * Writes a single-line JSON object to stdout.  In AWS Lambda, the CloudWatch
 * Logs agent automatically extracts any log line that conforms to the EMF
 * specification into CloudWatch custom metrics — no extra IAM permissions or
 * SDK calls required.
 *
 * In local development the JSON is harmlessly printed to the terminal.
 *
 * EMF specification:
 *   https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
 */

export interface EmfMetric {
  /** CloudWatch metric name. */
  name: string;
  /** Numeric value to record. */
  value: number;
  /**
   * CloudWatch unit.  Common values: 'Count', 'Milliseconds', 'Seconds',
   * 'Percent', 'Bytes', 'None'.  Defaults to 'None'.
   */
  unit?: string;
}

/**
 * Emits one CloudWatch EMF log line.
 *
 * @param namespace   CloudWatch metric namespace (e.g. `'SkillBridge/RAG'`).
 * @param dimensions  Key-value pairs used as CloudWatch dimensions AND as
 *                    top-level properties in the EMF JSON.
 * @param metrics     Array of metric name/value/unit triples to record.
 *
 * @example
 * emitEMF('SkillBridge/RAG', { Service: 'RagService' }, [
 *   { name: 'RagQueryLatencyMs', value: 320, unit: 'Milliseconds' },
 *   { name: 'RagChunksReturned', value: 3,   unit: 'Count' },
 * ]);
 */
export function emitEMF(
  namespace: string,
  dimensions: Record<string, string>,
  metrics: EmfMetric[],
): void {
  const entry: Record<string, unknown> = {
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: namespace,
          Dimensions: [Object.keys(dimensions)],
          Metrics: metrics.map(({ name, unit = 'None' }) => ({
            Name: name,
            Unit: unit,
          })),
        },
      ],
    },
    ...dimensions,
    ...Object.fromEntries(metrics.map(({ name, value }) => [name, value])),
  };

  process.stdout.write(JSON.stringify(entry) + '\n');
}
