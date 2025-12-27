// Package metrics provides thread-safe metrics collection for the application.
// It tracks counters, gauges, and histograms for queue operations, LLM calls, and more.
package metrics

import (
	"context"
	"log/slog"
	"sort"
	"sync"
	"sync/atomic"
	"time"

	"github.com/mesbahtanvir/ishkul/backend/pkg/logger"
)

// MetricType represents the type of metric
type MetricType string

const (
	MetricTypeCounter   MetricType = "counter"
	MetricTypeGauge     MetricType = "gauge"
	MetricTypeHistogram MetricType = "histogram"
)

// Labels is a map of string key-value pairs for metric labels
type Labels map[string]string

// Counter represents a monotonically increasing counter
type Counter struct {
	value int64
}

// Inc increments the counter by 1
func (c *Counter) Inc() {
	atomic.AddInt64(&c.value, 1)
}

// Add adds the given value to the counter
func (c *Counter) Add(delta int64) {
	atomic.AddInt64(&c.value, delta)
}

// Value returns the current counter value
func (c *Counter) Value() int64 {
	return atomic.LoadInt64(&c.value)
}

// Gauge represents a value that can go up or down
type Gauge struct {
	value int64
}

// Set sets the gauge to the given value
func (g *Gauge) Set(value int64) {
	atomic.StoreInt64(&g.value, value)
}

// Inc increments the gauge by 1
func (g *Gauge) Inc() {
	atomic.AddInt64(&g.value, 1)
}

// Dec decrements the gauge by 1
func (g *Gauge) Dec() {
	atomic.AddInt64(&g.value, -1)
}

// Value returns the current gauge value
func (g *Gauge) Value() int64 {
	return atomic.LoadInt64(&g.value)
}

// HistogramBucket represents a histogram bucket
type HistogramBucket struct {
	UpperBound int64
	Count      int64
}

// Histogram tracks the distribution of values
type Histogram struct {
	mu         sync.RWMutex
	buckets    []int64 // bucket upper bounds in ms
	counts     []int64 // counts per bucket
	sum        int64   // sum of all observed values
	count      int64   // total number of observations
	min        int64   // minimum observed value
	max        int64   // maximum observed value
	recentVals []int64 // recent values for percentile calculation (circular buffer)
	recentIdx  int     // current index in circular buffer
	recentSize int     // size of circular buffer
}

// NewHistogram creates a new histogram with default latency buckets (in milliseconds)
func NewHistogram() *Histogram {
	return NewHistogramWithBuckets([]int64{10, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 30000, 60000})
}

// NewHistogramWithBuckets creates a histogram with custom bucket boundaries
func NewHistogramWithBuckets(buckets []int64) *Histogram {
	sort.Slice(buckets, func(i, j int) bool { return buckets[i] < buckets[j] })
	return &Histogram{
		buckets:    buckets,
		counts:     make([]int64, len(buckets)+1), // +1 for overflow bucket
		min:        int64(^uint64(0) >> 1),        // max int64
		max:        0,
		recentVals: make([]int64, 1000), // keep last 1000 values for percentiles
		recentSize: 1000,
	}
}

// Observe records a value in the histogram
func (h *Histogram) Observe(value int64) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.sum += value
	h.count++

	if value < h.min {
		h.min = value
	}
	if value > h.max {
		h.max = value
	}

	// Store in circular buffer for percentiles
	h.recentVals[h.recentIdx] = value
	h.recentIdx = (h.recentIdx + 1) % h.recentSize

	// Increment appropriate bucket
	for i, bound := range h.buckets {
		if value <= bound {
			h.counts[i]++
			return
		}
	}
	// Value exceeds all buckets, goes in overflow bucket
	h.counts[len(h.buckets)]++
}

// Summary returns histogram summary statistics
type HistogramSummary struct {
	Count int64   `json:"count"`
	Sum   int64   `json:"sum_ms"`
	Min   int64   `json:"min_ms"`
	Max   int64   `json:"max_ms"`
	Avg   float64 `json:"avg_ms"`
	P50   int64   `json:"p50_ms"`
	P90   int64   `json:"p90_ms"`
	P99   int64   `json:"p99_ms"`
}

// Summary returns summary statistics for the histogram
func (h *Histogram) Summary() HistogramSummary {
	h.mu.RLock()
	defer h.mu.RUnlock()

	if h.count == 0 {
		return HistogramSummary{}
	}

	// Calculate average
	avg := float64(h.sum) / float64(h.count)

	// Calculate percentiles from recent values
	numRecent := h.count
	if numRecent > int64(h.recentSize) {
		numRecent = int64(h.recentSize)
	}

	// Copy and sort recent values
	vals := make([]int64, numRecent)
	copy(vals, h.recentVals[:numRecent])
	sort.Slice(vals, func(i, j int) bool { return vals[i] < vals[j] })

	p50 := vals[int(float64(numRecent)*0.50)]
	p90 := vals[int(float64(numRecent)*0.90)]
	p99Idx := int(float64(numRecent) * 0.99)
	if p99Idx >= int(numRecent) {
		p99Idx = int(numRecent) - 1
	}
	p99 := vals[p99Idx]

	return HistogramSummary{
		Count: h.count,
		Sum:   h.sum,
		Min:   h.min,
		Max:   h.max,
		Avg:   avg,
		P50:   p50,
		P90:   p90,
		P99:   p99,
	}
}

// Collector manages all metrics in the application
type Collector struct {
	mu         sync.RWMutex
	counters   map[string]*Counter
	gauges     map[string]*Gauge
	histograms map[string]*Histogram
	logger     *slog.Logger
	startTime  time.Time
}

// Global collector instance
var globalCollector *Collector
var once sync.Once

// GetCollector returns the global metrics collector (singleton)
func GetCollector() *Collector {
	once.Do(func() {
		globalCollector = &Collector{
			counters:   make(map[string]*Counter),
			gauges:     make(map[string]*Gauge),
			histograms: make(map[string]*Histogram),
			startTime:  time.Now(),
		}
	})
	return globalCollector
}

// SetLogger sets the logger for metrics reporting
func (c *Collector) SetLogger(l *slog.Logger) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.logger = l
}

// Counter returns or creates a counter with the given name
func (c *Collector) Counter(name string) *Counter {
	c.mu.Lock()
	defer c.mu.Unlock()

	if counter, ok := c.counters[name]; ok {
		return counter
	}

	counter := &Counter{}
	c.counters[name] = counter
	return counter
}

// Gauge returns or creates a gauge with the given name
func (c *Collector) Gauge(name string) *Gauge {
	c.mu.Lock()
	defer c.mu.Unlock()

	if gauge, ok := c.gauges[name]; ok {
		return gauge
	}

	gauge := &Gauge{}
	c.gauges[name] = gauge
	return gauge
}

// Histogram returns or creates a histogram with the given name
func (c *Collector) Histogram(name string) *Histogram {
	c.mu.Lock()
	defer c.mu.Unlock()

	if hist, ok := c.histograms[name]; ok {
		return hist
	}

	hist := NewHistogram()
	c.histograms[name] = hist
	return hist
}

// Snapshot represents a point-in-time snapshot of all metrics
type Snapshot struct {
	Timestamp  time.Time                   `json:"timestamp"`
	Uptime     string                      `json:"uptime"`
	Counters   map[string]int64            `json:"counters"`
	Gauges     map[string]int64            `json:"gauges"`
	Histograms map[string]HistogramSummary `json:"histograms"`
}

// Snapshot returns a point-in-time snapshot of all metrics
func (c *Collector) Snapshot() Snapshot {
	c.mu.RLock()
	defer c.mu.RUnlock()

	snap := Snapshot{
		Timestamp:  time.Now(),
		Uptime:     time.Since(c.startTime).String(),
		Counters:   make(map[string]int64, len(c.counters)),
		Gauges:     make(map[string]int64, len(c.gauges)),
		Histograms: make(map[string]HistogramSummary, len(c.histograms)),
	}

	for name, counter := range c.counters {
		snap.Counters[name] = counter.Value()
	}

	for name, gauge := range c.gauges {
		snap.Gauges[name] = gauge.Value()
	}

	for name, hist := range c.histograms {
		snap.Histograms[name] = hist.Summary()
	}

	return snap
}

// LogSnapshot logs the current metrics snapshot
func (c *Collector) LogSnapshot(ctx context.Context) {
	c.mu.RLock()
	l := c.logger
	c.mu.RUnlock()

	if l == nil {
		return
	}

	snap := c.Snapshot()

	// Log counters
	for name, value := range snap.Counters {
		logger.Info(l, ctx, "metrics_counter",
			slog.String("name", name),
			slog.Int64("value", value),
		)
	}

	// Log gauges
	for name, value := range snap.Gauges {
		logger.Info(l, ctx, "metrics_gauge",
			slog.String("name", name),
			slog.Int64("value", value),
		)
	}

	// Log histograms
	for name, summary := range snap.Histograms {
		logger.Info(l, ctx, "metrics_histogram",
			slog.String("name", name),
			slog.Int64("count", summary.Count),
			slog.Float64("avg_ms", summary.Avg),
			slog.Int64("min_ms", summary.Min),
			slog.Int64("max_ms", summary.Max),
			slog.Int64("p50_ms", summary.P50),
			slog.Int64("p90_ms", summary.P90),
			slog.Int64("p99_ms", summary.P99),
		)
	}
}

// Well-known metric names for the queue system
const (
	// Queue counters
	MetricQueueTasksEnqueued   = "queue.tasks.enqueued"
	MetricQueueTasksClaimed    = "queue.tasks.claimed"
	MetricQueueTasksCompleted  = "queue.tasks.completed"
	MetricQueueTasksFailed     = "queue.tasks.failed"
	MetricQueueTasksRecovered  = "queue.tasks.recovered"
	MetricQueueTasksTokenLimit = "queue.tasks.token_limit"

	// Queue gauges
	MetricQueueWorkersActive = "queue.workers.active"
	MetricQueueTasksPending  = "queue.tasks.pending"

	// Queue histograms
	MetricQueueTaskDuration     = "queue.task.duration_ms"
	MetricQueueClaimDuration    = "queue.claim.duration_ms"
	MetricQueueFirestoreLatency = "queue.firestore.latency_ms"

	// LLM counters
	MetricLLMCallsTotal   = "llm.calls.total"
	MetricLLMCallsSuccess = "llm.calls.success"
	MetricLLMCallsError   = "llm.calls.error"
	MetricLLMTokensInput  = "llm.tokens.input"
	MetricLLMTokensOutput = "llm.tokens.output"

	// LLM histograms
	MetricLLMLatency = "llm.latency_ms"

	// Generation counters
	MetricGenerationOutlineTotal    = "generation.outline.total"
	MetricGenerationSkeletonTotal   = "generation.skeleton.total"
	MetricGenerationContentTotal    = "generation.content.total"
	MetricGenerationOutlineSuccess  = "generation.outline.success"
	MetricGenerationSkeletonSuccess = "generation.skeleton.success"
	MetricGenerationContentSuccess  = "generation.content.success"

	// Handler metrics
	MetricHandlerRequestsTotal  = "handler.requests.total"
	MetricHandlerRequestsErrors = "handler.requests.errors"
	MetricHandlerDuration       = "handler.duration_ms"

	// Firestore operation metrics
	MetricFirestoreQueryTotal    = "firestore.query.total"
	MetricFirestoreQueryErrors   = "firestore.query.errors"
	MetricFirestoreQueryDuration = "firestore.query.duration_ms"
	MetricFirestoreQueryDocs     = "firestore.query.docs_scanned"
	MetricFirestoreWriteTotal    = "firestore.write.total"
	MetricFirestoreWriteErrors   = "firestore.write.errors"
	MetricFirestoreWriteDuration = "firestore.write.duration_ms"
	MetricFirestoreTxTotal       = "firestore.transaction.total"
	MetricFirestoreTxErrors      = "firestore.transaction.errors"
	MetricFirestoreTxDuration    = "firestore.transaction.duration_ms"
)

// Timer is a helper for measuring durations
type Timer struct {
	start time.Time
	hist  *Histogram
}

// NewTimer starts a new timer that will record to the given histogram
func NewTimer(hist *Histogram) *Timer {
	return &Timer{
		start: time.Now(),
		hist:  hist,
	}
}

// ObserveDuration records the elapsed time since the timer was created
func (t *Timer) ObserveDuration() time.Duration {
	d := time.Since(t.start)
	if t.hist != nil {
		t.hist.Observe(d.Milliseconds())
	}
	return d
}
