package metrics

import (
	"bytes"
	"strings"
	"testing"
)

func TestPrometheusExporter(t *testing.T) {
	// Create a fresh collector for testing
	c := &Collector{
		counters:   make(map[string]*Counter),
		gauges:     make(map[string]*Gauge),
		histograms: make(map[string]*Histogram),
	}

	// Add some test metrics
	counter := c.Counter("test.counter")
	counter.Inc()
	counter.Inc()

	gauge := c.Gauge("test.gauge")
	gauge.Set(42)

	hist := c.Histogram("test.latency")
	hist.Observe(100)
	hist.Observe(200)
	hist.Observe(300)

	// Export to Prometheus format
	exporter := NewPrometheusExporter(c)
	var buf bytes.Buffer
	if err := exporter.WriteMetrics(&buf); err != nil {
		t.Fatalf("Failed to write metrics: %v", err)
	}

	output := buf.String()

	// Verify output contains expected metrics
	expectedMetrics := []string{
		"ishkul_test_counter",
		"ishkul_test_gauge",
		"ishkul_test_latency",
		"# TYPE ishkul_test_counter counter",
		"# TYPE ishkul_test_gauge gauge",
		"# TYPE ishkul_test_latency histogram",
	}

	for _, expected := range expectedMetrics {
		if !strings.Contains(output, expected) {
			t.Errorf("Output missing expected metric: %s\nOutput:\n%s", expected, output)
		}
	}

	// Verify counter value
	if !strings.Contains(output, "ishkul_test_counter 2") {
		t.Errorf("Counter value incorrect. Output:\n%s", output)
	}

	// Verify gauge value
	if !strings.Contains(output, "ishkul_test_gauge 42") {
		t.Errorf("Gauge value incorrect. Output:\n%s", output)
	}

	// Verify histogram has sum and count
	if !strings.Contains(output, "ishkul_test_latency_sum") {
		t.Errorf("Histogram missing _sum. Output:\n%s", output)
	}
	if !strings.Contains(output, "ishkul_test_latency_count") {
		t.Errorf("Histogram missing _count. Output:\n%s", output)
	}

	// Verify histogram has percentiles as quantiles
	if !strings.Contains(output, "quantile=\"0.5\"") {
		t.Errorf("Histogram missing P50 quantile. Output:\n%s", output)
	}
	if !strings.Contains(output, "quantile=\"0.9\"") {
		t.Errorf("Histogram missing P90 quantile. Output:\n%s", output)
	}
	if !strings.Contains(output, "quantile=\"0.99\"") {
		t.Errorf("Histogram missing P99 quantile. Output:\n%s", output)
	}
}

func TestSanitizeMetricName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"queue.tasks.enqueued", "ishkul_queue_tasks_enqueued"},
		{"llm.latency_ms", "ishkul_llm_latency_ms"},
		{"test.counter", "ishkul_test_counter"},
		{"ishkul_already_prefixed", "ishkul_already_prefixed"},
	}

	for _, tt := range tests {
		result := sanitizeMetricName(tt.input)
		if result != tt.expected {
			t.Errorf("sanitizeMetricName(%q) = %q, want %q", tt.input, result, tt.expected)
		}
	}
}

func TestPrometheusExporterEmpty(t *testing.T) {
	// Create empty collector
	c := &Collector{
		counters:   make(map[string]*Counter),
		gauges:     make(map[string]*Gauge),
		histograms: make(map[string]*Histogram),
	}

	exporter := NewPrometheusExporter(c)
	var buf bytes.Buffer
	if err := exporter.WriteMetrics(&buf); err != nil {
		t.Fatalf("Failed to write metrics: %v", err)
	}

	output := buf.String()

	// Should still have header and uptime
	if !strings.Contains(output, "# Ishkul Backend Metrics") {
		t.Errorf("Missing header in output: %s", output)
	}
	if !strings.Contains(output, "ishkul_uptime_seconds") {
		t.Errorf("Missing uptime metric in output: %s", output)
	}
}

func TestPrometheusExporterWithQueueMetrics(t *testing.T) {
	// Create collector with realistic queue metrics
	c := &Collector{
		counters:   make(map[string]*Counter),
		gauges:     make(map[string]*Gauge),
		histograms: make(map[string]*Histogram),
	}

	// Simulate queue operations
	c.Counter(MetricQueueTasksEnqueued).Add(10)
	c.Counter(MetricQueueTasksClaimed).Add(8)
	c.Counter(MetricQueueTasksCompleted).Add(7)
	c.Counter(MetricQueueTasksFailed).Add(1)

	c.Gauge(MetricQueueWorkersActive).Set(3)
	c.Gauge(MetricQueueTasksPending).Set(2)

	hist := c.Histogram(MetricQueueTaskDuration)
	hist.Observe(1000)
	hist.Observe(1500)
	hist.Observe(2000)

	// Export
	exporter := NewPrometheusExporter(c)
	var buf bytes.Buffer
	if err := exporter.WriteMetrics(&buf); err != nil {
		t.Fatalf("Failed to write metrics: %v", err)
	}

	output := buf.String()

	// Verify queue metrics are present
	expectedMetrics := []string{
		"ishkul_queue_tasks_enqueued 10",
		"ishkul_queue_tasks_claimed 8",
		"ishkul_queue_tasks_completed 7",
		"ishkul_queue_tasks_failed 1",
		"ishkul_queue_workers_active 3",
		"ishkul_queue_tasks_pending 2",
		"ishkul_queue_task_duration_ms",
	}

	for _, expected := range expectedMetrics {
		if !strings.Contains(output, expected) {
			t.Errorf("Output missing expected metric: %s\nOutput:\n%s", expected, output)
		}
	}
}
