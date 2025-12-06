package middleware

import (
	"net"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// =============================================================================
// Mock Listener for Testing
// =============================================================================

type mockListener struct {
	connections chan net.Conn
	closed      bool
	mu          sync.Mutex
}

func newMockListener() *mockListener {
	return &mockListener{
		connections: make(chan net.Conn, 100),
	}
}

func (l *mockListener) Accept() (net.Conn, error) {
	conn := <-l.connections
	if conn == nil {
		return nil, net.ErrClosed
	}
	return conn, nil
}

func (l *mockListener) Close() error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if !l.closed {
		l.closed = true
		close(l.connections)
	}
	return nil
}

func (l *mockListener) Addr() net.Addr {
	return &net.TCPAddr{IP: net.IPv4(127, 0, 0, 1), Port: 8080}
}

func (l *mockListener) addConnection(conn net.Conn) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if !l.closed {
		l.connections <- conn
	}
}

// =============================================================================
// Mock Connection for Testing
// =============================================================================

type mockConn struct {
	closed int32
}

func (c *mockConn) Read(b []byte) (n int, err error)   { return 0, nil }
func (c *mockConn) Write(b []byte) (n int, err error)  { return len(b), nil }
func (c *mockConn) Close() error                       { atomic.StoreInt32(&c.closed, 1); return nil }
func (c *mockConn) LocalAddr() net.Addr                { return &net.TCPAddr{} }
func (c *mockConn) RemoteAddr() net.Addr               { return &net.TCPAddr{} }
func (c *mockConn) SetDeadline(t time.Time) error      { return nil }
func (c *mockConn) SetReadDeadline(t time.Time) error  { return nil }
func (c *mockConn) SetWriteDeadline(t time.Time) error { return nil }
func (c *mockConn) isClosed() bool                     { return atomic.LoadInt32(&c.closed) == 1 }

// =============================================================================
// NewConnLimiter Tests
// =============================================================================

func TestNewConnLimiter(t *testing.T) {
	t.Run("creates limiter with specified max connections", func(t *testing.T) {
		listener := newMockListener()
		defer listener.Close()

		limiter := NewConnLimiter(listener, 100)

		require.NotNil(t, limiter)
		assert.Equal(t, int64(100), limiter.maxConnections)
		assert.Equal(t, int64(0), limiter.currentConns)
	})

	t.Run("defaults to 1000 when max is zero", func(t *testing.T) {
		listener := newMockListener()
		defer listener.Close()

		limiter := NewConnLimiter(listener, 0)

		assert.Equal(t, int64(1000), limiter.maxConnections)
	})

	t.Run("defaults to 1000 when max is negative", func(t *testing.T) {
		listener := newMockListener()
		defer listener.Close()

		limiter := NewConnLimiter(listener, -5)

		assert.Equal(t, int64(1000), limiter.maxConnections)
	})

	t.Run("wraps the underlying listener", func(t *testing.T) {
		listener := newMockListener()
		defer listener.Close()

		limiter := NewConnLimiter(listener, 100)

		assert.Equal(t, listener.Addr(), limiter.Addr())
	})
}

// =============================================================================
// ConnLimiter Stats Tests
// =============================================================================

func TestConnLimiter_Stats(t *testing.T) {
	t.Run("returns initial stats", func(t *testing.T) {
		listener := newMockListener()
		defer listener.Close()

		limiter := NewConnLimiter(listener, 100)
		stats := limiter.Stats()

		assert.Equal(t, int64(0), stats["current"])
		assert.Equal(t, int64(100), stats["max"])
		assert.Equal(t, int64(0), stats["accepted"])
		assert.Equal(t, int64(0), stats["rejected"])
	})

	t.Run("tracks accepted connections", func(t *testing.T) {
		listener := newMockListener()
		limiter := NewConnLimiter(listener, 100)

		// Simulate accepting connections
		go func() {
			for i := 0; i < 3; i++ {
				listener.addConnection(&mockConn{})
			}
		}()

		// Accept connections
		for i := 0; i < 3; i++ {
			conn, err := limiter.Accept()
			require.NoError(t, err)
			defer conn.Close()
		}

		stats := limiter.Stats()
		assert.Equal(t, int64(3), stats["current"])
		assert.Equal(t, int64(3), stats["accepted"])
	})
}

// =============================================================================
// ConnLimiter CurrentConnections Tests
// =============================================================================

func TestConnLimiter_CurrentConnections(t *testing.T) {
	t.Run("returns zero initially", func(t *testing.T) {
		listener := newMockListener()
		defer listener.Close()

		limiter := NewConnLimiter(listener, 100)

		assert.Equal(t, int64(0), limiter.CurrentConnections())
	})

	t.Run("increments on accept", func(t *testing.T) {
		listener := newMockListener()
		limiter := NewConnLimiter(listener, 100)

		go func() {
			listener.addConnection(&mockConn{})
		}()

		conn, err := limiter.Accept()
		require.NoError(t, err)
		defer conn.Close()

		assert.Equal(t, int64(1), limiter.CurrentConnections())
	})

	t.Run("decrements on close", func(t *testing.T) {
		listener := newMockListener()
		limiter := NewConnLimiter(listener, 100)

		go func() {
			listener.addConnection(&mockConn{})
		}()

		conn, err := limiter.Accept()
		require.NoError(t, err)

		assert.Equal(t, int64(1), limiter.CurrentConnections())

		conn.Close()

		assert.Equal(t, int64(0), limiter.CurrentConnections())
	})
}

// =============================================================================
// LimitedConn Tests
// =============================================================================

func TestLimitedConn_Close(t *testing.T) {
	t.Run("releases semaphore on close", func(t *testing.T) {
		listener := newMockListener()
		limiter := NewConnLimiter(listener, 100)

		go func() {
			listener.addConnection(&mockConn{})
		}()

		conn, err := limiter.Accept()
		require.NoError(t, err)

		// Before close
		assert.Equal(t, int64(1), limiter.CurrentConnections())

		err = conn.Close()
		assert.NoError(t, err)

		// After close
		assert.Equal(t, int64(0), limiter.CurrentConnections())
	})

	t.Run("is idempotent (double close)", func(t *testing.T) {
		listener := newMockListener()
		limiter := NewConnLimiter(listener, 100)

		go func() {
			listener.addConnection(&mockConn{})
		}()

		conn, err := limiter.Accept()
		require.NoError(t, err)

		// Close twice - should not panic or double-decrement
		err1 := conn.Close()
		err2 := conn.Close()

		assert.NoError(t, err1)
		assert.NoError(t, err2)
		assert.Equal(t, int64(0), limiter.CurrentConnections())
	})

	t.Run("closes underlying connection", func(t *testing.T) {
		listener := newMockListener()
		limiter := NewConnLimiter(listener, 100)

		mockC := &mockConn{}
		go func() {
			listener.addConnection(mockC)
		}()

		conn, err := limiter.Accept()
		require.NoError(t, err)

		conn.Close()

		assert.True(t, mockC.isClosed())
	})
}

// =============================================================================
// Concurrency Tests
// =============================================================================

func TestConnLimiter_Concurrency(t *testing.T) {
	t.Run("handles concurrent accepts", func(t *testing.T) {
		listener := newMockListener()
		limiter := NewConnLimiter(listener, 50)

		var wg sync.WaitGroup
		connections := make([]net.Conn, 0, 20)
		var connMu sync.Mutex

		// Add connections
		go func() {
			for i := 0; i < 20; i++ {
				listener.addConnection(&mockConn{})
			}
		}()

		// Accept concurrently
		for i := 0; i < 20; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				conn, err := limiter.Accept()
				if err == nil {
					connMu.Lock()
					connections = append(connections, conn)
					connMu.Unlock()
				}
			}()
		}

		wg.Wait()

		assert.Equal(t, 20, len(connections))
		assert.Equal(t, int64(20), limiter.CurrentConnections())

		// Close all
		for _, conn := range connections {
			conn.Close()
		}

		assert.Equal(t, int64(0), limiter.CurrentConnections())
	})

	t.Run("handles concurrent closes", func(t *testing.T) {
		listener := newMockListener()
		limiter := NewConnLimiter(listener, 50)

		connections := make([]net.Conn, 10)

		// Add and accept connections
		go func() {
			for i := 0; i < 10; i++ {
				listener.addConnection(&mockConn{})
			}
		}()

		for i := 0; i < 10; i++ {
			conn, err := limiter.Accept()
			require.NoError(t, err)
			connections[i] = conn
		}

		assert.Equal(t, int64(10), limiter.CurrentConnections())

		// Close concurrently
		var wg sync.WaitGroup
		for _, conn := range connections {
			wg.Add(1)
			go func(c net.Conn) {
				defer wg.Done()
				c.Close()
			}(conn)
		}

		wg.Wait()

		assert.Equal(t, int64(0), limiter.CurrentConnections())
	})
}

// =============================================================================
// DefaultMaxConnections Tests
// =============================================================================

func TestDefaultMaxConnections(t *testing.T) {
	t.Run("returns default value", func(t *testing.T) {
		// The default should be 1000 based on the implementation
		max := DefaultMaxConnections()
		assert.Equal(t, 1000, max)
	})
}
