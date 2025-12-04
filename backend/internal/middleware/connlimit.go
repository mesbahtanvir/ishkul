package middleware

import (
	"log"
	"net"
	"sync/atomic"
	"time"
)

// ConnLimiter wraps a net.Listener to limit concurrent connections
type ConnLimiter struct {
	net.Listener
	maxConnections int64
	currentConns   int64
	totalAccepted  int64
	totalRejected  int64
	semaphore      chan struct{}
}

// NewConnLimiter creates a connection-limited listener
func NewConnLimiter(listener net.Listener, maxConnections int) *ConnLimiter {
	if maxConnections <= 0 {
		maxConnections = 1000 // Default to 1000 concurrent connections
	}

	log.Printf("Connection limiter configured: max connections=%d", maxConnections)

	return &ConnLimiter{
		Listener:       listener,
		maxConnections: int64(maxConnections),
		semaphore:      make(chan struct{}, maxConnections),
	}
}

// Accept waits for and returns the next connection, respecting the limit
func (cl *ConnLimiter) Accept() (net.Conn, error) {
	// Try to acquire a slot with timeout
	select {
	case cl.semaphore <- struct{}{}:
		// Got a slot, accept the connection
		conn, err := cl.Listener.Accept()
		if err != nil {
			<-cl.semaphore // Release the slot on error
			return nil, err
		}

		atomic.AddInt64(&cl.currentConns, 1)
		atomic.AddInt64(&cl.totalAccepted, 1)

		return &limitedConn{
			Conn:    conn,
			limiter: cl,
		}, nil

	case <-time.After(5 * time.Second):
		// Timeout waiting for a slot, but we still need to accept the connection to reject it properly
		conn, err := cl.Listener.Accept()
		if err != nil {
			return nil, err
		}
		// Close the connection immediately - we're at capacity
		atomic.AddInt64(&cl.totalRejected, 1)
		conn.Close()
		return cl.Accept() // Try again
	}
}

// Stats returns connection limiter statistics
func (cl *ConnLimiter) Stats() map[string]int64 {
	return map[string]int64{
		"current":  atomic.LoadInt64(&cl.currentConns),
		"max":      cl.maxConnections,
		"accepted": atomic.LoadInt64(&cl.totalAccepted),
		"rejected": atomic.LoadInt64(&cl.totalRejected),
	}
}

// CurrentConnections returns the current number of active connections
func (cl *ConnLimiter) CurrentConnections() int64 {
	return atomic.LoadInt64(&cl.currentConns)
}

// limitedConn wraps a net.Conn to track when it's closed
type limitedConn struct {
	net.Conn
	limiter *ConnLimiter
	closed  int32
}

// Close releases the connection slot back to the limiter
func (c *limitedConn) Close() error {
	if atomic.CompareAndSwapInt32(&c.closed, 0, 1) {
		atomic.AddInt64(&c.limiter.currentConns, -1)
		<-c.limiter.semaphore // Release the semaphore slot
	}
	return c.Conn.Close()
}

// DefaultMaxConnections returns the default max connections from environment
func DefaultMaxConnections() int {
	return getEnvInt("MAX_CONNECTIONS", 1000)
}
