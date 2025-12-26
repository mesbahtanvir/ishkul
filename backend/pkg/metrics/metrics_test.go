package metrics

import (
	"testing"
)

func TestCounter(t *testing.T) {
	c := &Counter{}

	if c.Value() != 0 {
		t.Errorf("Expected initial value 0, got %d", c.Value())
	}

	c.Inc()
	if c.Value() != 1 {
		t.Errorf("Expected value 1 after Inc, got %d", c.Value())
	}

	c.Add(5)
	if c.Value() != 6 {
		t.Errorf("Expected value 6 after Add(5), got %d", c.Value())
	}
}

func TestGauge(t *testing.T) {
	g := &Gauge{}

	if g.Value() != 0 {
		t.Errorf("Expected initial value 0, got %d", g.Value())
	}

	g.Set(10)
	if g.Value() != 10 {
		t.Errorf("Expected value 10 after Set, got %d", g.Value())
	}

	g.Inc()
	if g.Value() != 11 {
		t.Errorf("Expected value 11 after Inc, got %d", g.Value())
	}

	g.Dec()
	if g.Value() != 10 {
		t.Errorf("Expected value 10 after Dec, got %d", g.Value())
	}
}

func TestHistogram(t *testing.T) {
	h := NewHistogram()

	// Observe some values
	h.Observe(100)
	h.Observe(200)
	h.Observe(300)
	h.Observe(400)
	h.Observe(500)

	summary := h.Summary()

	if summary.Count != 5 {
		t.Errorf("Expected count 5, got %d", summary.Count)
	}

	if summary.Sum != 1500 {
		t.Errorf("Expected sum 1500, got %d", summary.Sum)
	}

	if summary.Min != 100 {
		t.Errorf("Expected min 100, got %d", summary.Min)
	}

	if summary.Max != 500 {
		t.Errorf("Expected max 500, got %d", summary.Max)
	}

	expectedAvg := 300.0
	if summary.Avg != expectedAvg {
		t.Errorf("Expected avg %f, got %f", expectedAvg, summary.Avg)
	}
}

func TestCollector(t *testing.T) {
	// Get collector (singleton)
	c := GetCollector()

	// Test counter
	counter := c.Counter("test.counter")
	counter.Inc()
	counter.Inc()

	if counter.Value() != 2 {
		t.Errorf("Expected counter value 2, got %d", counter.Value())
	}

	// Get same counter again
	sameCounter := c.Counter("test.counter")
	if sameCounter.Value() != 2 {
		t.Errorf("Expected same counter value 2, got %d", sameCounter.Value())
	}

	// Test gauge
	gauge := c.Gauge("test.gauge")
	gauge.Set(42)

	if gauge.Value() != 42 {
		t.Errorf("Expected gauge value 42, got %d", gauge.Value())
	}

	// Test histogram
	hist := c.Histogram("test.histogram")
	hist.Observe(100)
	hist.Observe(200)

	summary := hist.Summary()
	if summary.Count != 2 {
		t.Errorf("Expected histogram count 2, got %d", summary.Count)
	}

	// Test snapshot
	snap := c.Snapshot()

	if snap.Counters["test.counter"] != 2 {
		t.Errorf("Expected snapshot counter 2, got %d", snap.Counters["test.counter"])
	}

	if snap.Gauges["test.gauge"] != 42 {
		t.Errorf("Expected snapshot gauge 42, got %d", snap.Gauges["test.gauge"])
	}

	if snap.Histograms["test.histogram"].Count != 2 {
		t.Errorf("Expected snapshot histogram count 2, got %d", snap.Histograms["test.histogram"].Count)
	}
}

func TestTimer(t *testing.T) {
	hist := NewHistogram()
	timer := NewTimer(hist)

	// Simulate some work (just need non-zero duration)
	for i := 0; i < 1000; i++ {
		_ = i * i
	}

	duration := timer.ObserveDuration()

	if duration <= 0 {
		t.Error("Expected non-zero duration from timer")
	}

	summary := hist.Summary()
	if summary.Count != 1 {
		t.Errorf("Expected histogram count 1 after timer, got %d", summary.Count)
	}
}

func TestHistogramPercentiles(t *testing.T) {
	h := NewHistogram()

	// Add 100 values from 1 to 100
	for i := int64(1); i <= 100; i++ {
		h.Observe(i)
	}

	summary := h.Summary()

	// P50 should be around 50
	if summary.P50 < 45 || summary.P50 > 55 {
		t.Errorf("Expected P50 around 50, got %d", summary.P50)
	}

	// P90 should be around 90
	if summary.P90 < 85 || summary.P90 > 95 {
		t.Errorf("Expected P90 around 90, got %d", summary.P90)
	}

	// P99 should be around 99
	if summary.P99 < 95 || summary.P99 > 100 {
		t.Errorf("Expected P99 around 99, got %d", summary.P99)
	}
}
