# DDoS Protection Guide

This document describes the multi-layered DDoS (Distributed Denial of Service) protection system implemented in the Ishkul backend.

## Overview

The DDoS protection system consists of five layers of defense:

1. **IP Blocking** - Temporary banning of IPs after repeated violations
2. **Circuit Breaker** - Global throughput protection against system overload
3. **Connection Limiting** - TCP connection limits to prevent connection exhaustion
4. **Tiered Rate Limiting** - Endpoint-specific rate limits based on operation cost
5. **Request Fingerprinting** - Detection of distributed attacks from botnets

## Architecture

```
                    ┌─────────────────────────────────────────┐
                    │           Incoming Request              │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │         1. IP Block Check               │
                    │     (Reject blocked IPs immediately)    │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │         2. Circuit Breaker              │
                    │    (Global load protection - 503)       │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │       3. Request Fingerprinting         │
                    │   (Detect distributed attack patterns)  │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │       4. Tiered Rate Limiting           │
                    │     (Per-IP, endpoint-specific - 429)   │
                    └─────────────────┬───────────────────────┘
                                      │
                    ┌─────────────────▼───────────────────────┐
                    │          Application Handler            │
                    └─────────────────────────────────────────┘
```

## Layer 1: IP Blocking

Automatically blocks IPs that repeatedly violate rate limits.

### How It Works
- Tracks violation count per IP within a configurable time window
- When violations exceed threshold, IP is blocked for a configurable duration
- Blocked IPs receive HTTP 403 Forbidden immediately

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `IP_BLOCK_MAX_VIOLATIONS` | 10 | Number of violations before blocking |
| `IP_BLOCK_DURATION_MINUTES` | 15 | How long to block (minutes) |
| `IP_BLOCK_VIOLATION_WINDOW_MINUTES` | 5 | Time window for counting violations |

### Response Headers

When blocked:
- `Retry-After`: Seconds until block expires
- `X-Block-Reason`: `rate-limit-violation`

## Layer 2: Circuit Breaker

Protects against global system overload from distributed attacks.

### How It Works
- Monitors concurrent requests and requests per second globally
- When thresholds exceeded, "trips" the circuit (opens)
- Open circuit returns 503 immediately, preventing system overload
- After timeout, enters "half-open" state to test recovery
- Successful requests close the circuit (normal operation resumes)

### States

| State | Description |
|-------|-------------|
| **Closed** | Normal operation, requests pass through |
| **Open** | System overloaded, all requests rejected with 503 |
| **Half-Open** | Testing recovery, limited requests allowed |

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CIRCUIT_MAX_CONCURRENT` | 100 | Maximum concurrent requests |
| `CIRCUIT_MAX_RPS` | 500 | Maximum requests per second (global) |
| `CIRCUIT_OPEN_TIMEOUT_SECONDS` | 30 | Time before testing recovery |

### Response Headers

When circuit is open:
- `Retry-After`: 5 seconds
- `X-Circuit-State`: `open` or `half-open`

## Layer 3: Connection Limiting

Limits TCP connections to prevent connection exhaustion attacks.

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `MAX_CONNECTIONS` | 1000 | Maximum concurrent TCP connections |

## Layer 4: Tiered Rate Limiting

Different rate limits for different endpoint types based on resource cost.

### Endpoint Tiers

| Tier | Endpoints | Default RPS | Burst | Purpose |
|------|-----------|-------------|-------|---------|
| **Health** | `/health` | Unlimited | - | Health checks bypass limits |
| **Auth** | `/api/auth/*` | 5 | 10 | Prevent brute force attacks |
| **Standard** | Most API endpoints | 10 | 20 | General API protection |
| **Expensive** | `/api/me/next-step`, `/api/learning-paths/*` | 2 | 5 | LLM operations (high cost) |
| **Webhook** | `/api/webhooks/*` | 20 | 50 | Third-party services |

### Configuration

**Standard Endpoints:**
- `RATE_LIMIT_STANDARD_RPS` (default: 10.0)
- `RATE_LIMIT_STANDARD_BURST` (default: 20)

**Auth Endpoints:**
- `RATE_LIMIT_AUTH_RPS` (default: 5.0)
- `RATE_LIMIT_AUTH_BURST` (default: 10)

**Expensive Endpoints:**
- `RATE_LIMIT_EXPENSIVE_RPS` (default: 2.0)
- `RATE_LIMIT_EXPENSIVE_BURST` (default: 5)

**Webhook Endpoints:**
- `RATE_LIMIT_WEBHOOK_RPS` (default: 20.0)
- `RATE_LIMIT_WEBHOOK_BURST` (default: 50)

### Response Headers

When rate limited:
- `Retry-After`: 1 second
- `X-RateLimit-Limit`: Configured limit
- `X-RateLimit-Remaining`: 0
- `X-RateLimit-Tier`: `standard`, `auth`, `expensive`, or `webhook`

## Layer 5: Request Fingerprinting

Detects distributed attacks where many IPs send identical requests.

### How It Works
- Generates fingerprint from request characteristics (User-Agent, headers, etc.)
- Tracks unique IPs per fingerprint
- Flags as suspicious when many different IPs share the same fingerprint
- Can block known attack tool User-Agents

### Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `FINGERPRINT_MAX_REQUESTS` | 100 | Max requests per fingerprint |
| `FINGERPRINT_WINDOW_MINUTES` | 5 | Time window for tracking |
| `FINGERPRINT_SUSPICIOUS_THRESHOLD` | 10 | IPs with same fingerprint = suspicious |
| `BLOCK_SUSPICIOUS_AGENTS` | false | Block known attack tools |

### Suspicious User-Agents

The following User-Agent patterns are considered suspicious:
- Empty/missing User-Agent
- `python-requests`, `python-urllib`, `curl`, `wget`
- `bot`, `crawler`, `spider`, `scraper`
- Security tools: `sqlmap`, `nikto`, `nmap`, `burp`, `acunetix`

### Response Headers

On all requests:
- `X-Request-Fingerprint`: Short fingerprint ID (for debugging)

## HTTP Server Hardening

In addition to the middleware, the HTTP server is configured with these security settings:

| Setting | Value | Purpose |
|---------|-------|---------|
| `ReadTimeout` | 15s | Max time to read request (prevents slowloris) |
| `ReadHeaderTimeout` | 5s | Max time to read headers (prevents slow header attacks) |
| `WriteTimeout` | 15s | Max time to write response |
| `IdleTimeout` | 30s | Keep-alive timeout (enables connection turnover) |
| `MaxHeaderBytes` | 1 MB | Prevents header-based DoS |

## Cloud Run Integration

When deployed on Cloud Run, these additional protections are available:

- **Auto-scaling**: Handles traffic spikes automatically
- **Load balancing**: Distributes traffic across instances
- **Cloud Armor** (optional): WAF with DDoS protection

### Recommended Cloud Armor Rules

For enhanced protection, consider enabling Cloud Armor with:
1. Rate limiting rules
2. Geographic blocking (if applicable)
3. Known bad IP lists
4. SQL injection / XSS protection

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Rate limit rejections** (429 responses)
2. **Blocked IPs count**
3. **Circuit breaker state changes**
4. **Suspicious fingerprint detections**
5. **Request latency percentiles**

### Log Events

The system logs these security events:
- `IP <ip> blocked for <duration> after <count> violations`
- `Circuit breaker opened: <reason>`
- `Circuit breaker transitioned to half-open state`
- `Distributed attack detected: fingerprint=<fp> from IP <ip>`
- `Blocked suspicious User-Agent: <ua> from IP <ip>`

## Testing DDoS Protection

### Local Testing

```bash
# Test rate limiting
for i in {1..20}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/auth/login; done

# Test IP blocking (after rate limit violations)
# After enough 429 responses, should see 403

# Test circuit breaker (concurrent requests)
for i in {1..200}; do curl -s http://localhost:8080/api/me & done
```

### Load Testing Tools

- **hey**: `hey -n 1000 -c 50 http://localhost:8080/health`
- **ab**: `ab -n 1000 -c 50 http://localhost:8080/health`
- **wrk**: `wrk -t4 -c100 -d30s http://localhost:8080/health`

## Tuning Guidelines

### Low Traffic Applications
```env
CIRCUIT_MAX_CONCURRENT=50
CIRCUIT_MAX_RPS=100
RATE_LIMIT_STANDARD_RPS=5.0
IP_BLOCK_MAX_VIOLATIONS=5
```

### High Traffic Applications
```env
CIRCUIT_MAX_CONCURRENT=500
CIRCUIT_MAX_RPS=2000
RATE_LIMIT_STANDARD_RPS=50.0
IP_BLOCK_MAX_VIOLATIONS=20
```

### API-Heavy Applications
```env
RATE_LIMIT_EXPENSIVE_RPS=5.0
RATE_LIMIT_EXPENSIVE_BURST=10
FINGERPRINT_SUSPICIOUS_THRESHOLD=20
```

## Troubleshooting

### "Too many requests" (429) errors
1. Check if rate limits are too strict for your traffic
2. Increase `RATE_LIMIT_*_RPS` and `RATE_LIMIT_*_BURST`
3. Consider if the client is behaving correctly

### "Your IP has been blocked" (403) errors
1. Check logs for violation count
2. Increase `IP_BLOCK_MAX_VIOLATIONS` if legitimate users are affected
3. Consider implementing user-based rate limiting instead of IP-based

### "Service temporarily unavailable" (503) errors
1. Circuit breaker has tripped
2. Check system load and scale up if needed
3. Increase `CIRCUIT_MAX_CONCURRENT` or `CIRCUIT_MAX_RPS`

### False positives in fingerprinting
1. Increase `FINGERPRINT_SUSPICIOUS_THRESHOLD`
2. Check if legitimate services share User-Agent patterns
3. Add exceptions for known good patterns

## Security Considerations

1. **Don't expose internal metrics**: Stats endpoints should be protected
2. **Log rotation**: Security logs can grow large during attacks
3. **Alerting**: Set up alerts for unusual patterns
4. **Backup plan**: Have runbooks for manual IP blocking if needed
5. **Rate limit by user ID**: For authenticated endpoints, consider user-based limits instead of IP

## References

- [OWASP DDoS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [Cloud Run Best Practices](https://cloud.google.com/run/docs/tips/general)
- [Token Bucket Algorithm](https://en.wikipedia.org/wiki/Token_bucket)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
