package metrics

import (
	"fmt"
	"io"
	"sort"
	"strings"
	"time"
)

// PrometheusExporter exports metrics in Prometheus text format
type PrometheusExporter struct {
	collector *Collector
}

// NewPrometheusExporter creates a new Prometheus exporter
func NewPrometheusExporter(collector *Collector) *PrometheusExporter {
	return &PrometheusExporter{collector: collector}
}

// WriteMetrics writes all metrics in Prometheus text format to the writer
func (e *PrometheusExporter) WriteMetrics(w io.Writer) error {
	snapshot := e.collector.Snapshot()

	// Write header comment
	fmt.Fprintf(w, "# Ishkul Backend Metrics\n")
	fmt.Fprintf(w, "# Timestamp: %s\n", snapshot.Timestamp.Format(time.RFC3339))
	fmt.Fprintf(w, "# Uptime: %s\n\n", snapshot.Uptime)

	// Write uptime as a gauge (in seconds)
	uptime := time.Since(e.collector.startTime).Seconds()
	fmt.Fprintf(w, "# HELP ishkul_uptime_seconds Application uptime in seconds\n")
	fmt.Fprintf(w, "# TYPE ishkul_uptime_seconds gauge\n")
	fmt.Fprintf(w, "ishkul_uptime_seconds %f\n\n", uptime)

	// Write counters
	if len(snapshot.Counters) > 0 {
		// Sort counter names for consistent output
		counterNames := make([]string, 0, len(snapshot.Counters))
		for name := range snapshot.Counters {
			counterNames = append(counterNames, name)
		}
		sort.Strings(counterNames)

		for _, name := range counterNames {
			value := snapshot.Counters[name]
			promName := sanitizeMetricName(name)

			fmt.Fprintf(w, "# HELP %s Counter metric\n", promName)
			fmt.Fprintf(w, "# TYPE %s counter\n", promName)
			fmt.Fprintf(w, "%s %d\n\n", promName, value)
		}
	}

	// Write gauges
	if len(snapshot.Gauges) > 0 {
		// Sort gauge names
		gaugeNames := make([]string, 0, len(snapshot.Gauges))
		for name := range snapshot.Gauges {
			gaugeNames = append(gaugeNames, name)
		}
		sort.Strings(gaugeNames)

		for _, name := range gaugeNames {
			value := snapshot.Gauges[name]
			promName := sanitizeMetricName(name)

			fmt.Fprintf(w, "# HELP %s Gauge metric\n", promName)
			fmt.Fprintf(w, "# TYPE %s gauge\n", promName)
			fmt.Fprintf(w, "%s %d\n\n", promName, value)
		}
	}

	// Write histograms
	if len(snapshot.Histograms) > 0 {
		// Sort histogram names
		histNames := make([]string, 0, len(snapshot.Histograms))
		for name := range snapshot.Histograms {
			histNames = append(histNames, name)
		}
		sort.Strings(histNames)

		for _, name := range histNames {
			summary := snapshot.Histograms[name]
			promName := sanitizeMetricName(name)

			// Prometheus histogram format includes _count, _sum, and _bucket
			fmt.Fprintf(w, "# HELP %s Histogram metric\n", promName)
			fmt.Fprintf(w, "# TYPE %s histogram\n", promName)

			// Write sum and count
			fmt.Fprintf(w, "%s_sum %d\n", promName, summary.Sum)
			fmt.Fprintf(w, "%s_count %d\n", promName, summary.Count)

			// Write min, max, avg as separate metrics
			fmt.Fprintf(w, "%s_min %d\n", promName, summary.Min)
			fmt.Fprintf(w, "%s_max %d\n", promName, summary.Max)
			fmt.Fprintf(w, "%s_avg %f\n", promName, summary.Avg)

			// Write percentiles as quantiles
			fmt.Fprintf(w, "%s{quantile=\"0.5\"} %d\n", promName, summary.P50)
			fmt.Fprintf(w, "%s{quantile=\"0.9\"} %d\n", promName, summary.P90)
			fmt.Fprintf(w, "%s{quantile=\"0.99\"} %d\n\n", promName, summary.P99)
		}
	}

	return nil
}

// sanitizeMetricName converts metric names to Prometheus format
// Replaces dots with underscores and ensures it starts with a letter
func sanitizeMetricName(name string) string {
	// Replace dots with underscores
	name = strings.ReplaceAll(name, ".", "_")

	// Ensure it starts with ishkul prefix for namespace
	if !strings.HasPrefix(name, "ishkul_") {
		name = "ishkul_" + name
	}

	return name
}
