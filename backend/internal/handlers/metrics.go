package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/mesbahtanvir/ishkul/backend/pkg/metrics"
)

// GetMetrics returns the current metrics snapshot in JSON format
// This endpoint is useful for debugging and monitoring
func GetMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	collector := metrics.GetCollector()
	snapshot := collector.Snapshot()

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(snapshot); err != nil {
		http.Error(w, "Failed to encode metrics", http.StatusInternalServerError)
		return
	}
}

// GetPrometheusMetrics returns metrics in Prometheus text format
// This endpoint is used by Grafana Cloud Agent for scraping
func GetPrometheusMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	collector := metrics.GetCollector()
	exporter := metrics.NewPrometheusExporter(collector)

	w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
	if err := exporter.WriteMetrics(w); err != nil {
		http.Error(w, "Failed to write metrics", http.StatusInternalServerError)
		return
	}
}
