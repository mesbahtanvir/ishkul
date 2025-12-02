# Roadmap & Future Enhancements

This document outlines planned features, improvements, and architectural enhancements for the Ishkul project.

## Priority Levels

- **P0 - Critical**: Must have for MVP, blocks other features
- **P1 - High**: Important for production readiness
- **P2 - Medium**: Nice to have, improves UX/DX
- **P3 - Low**: Future consideration, not urgent

---

## Learning Engine Enhancements

### Real LLM Integration (P0)

**Current State**: Mock LLM responses with hardcoded lesson data

**Goals**:
- Integrate with Claude API (Anthropic) for dynamic lesson generation
- Personalize content based on user learning history
- Generate adaptive quiz questions
- Create practice exercises dynamically

**Implementation**:
- [ ] Set up Claude API credentials in backend
- [ ] Create LLM service wrapper in `backend/pkg/llm/`
- [ ] Implement prompt templates for lesson generation
- [ ] Cache LLM responses to reduce API costs
- [ ] Add rate limiting and cost tracking
- [ ] Test with various user learning styles

**Estimated Impact**: 🟦🟦🟦🟦 Major - Core feature of platform

---

### Spaced Repetition Algorithm (P1)

**Current State**: Basic linear progression through lessons

**Goals**:
- Implement SM2 or similar spaced repetition algorithm
- Track when user should review previous lessons
- Optimize retention through scientifically-backed scheduling
- Provide statistics on learning progress

**Implementation**:
- [ ] Design interval algorithm in `backend/internal/models/spaced_repetition.go`
- [ ] Store review history in Firestore
- [ ] Implement review scheduling in `frontend/src/services/learningEngine.ts`
- [ ] Add metrics dashboard showing retention curves
- [ ] A/B test against linear progression

**Estimated Impact**: 🟦🟦🟦 High - Improves learning outcomes

---

## Mobile & Platform Support

### iOS/Android Native Builds (P1)

**Current State**: Web and Expo preview only

**Goals**:
- Build and publish to Apple App Store
- Build and publish to Google Play Store
- Handle platform-specific APIs (camera, location, etc.)
- Support offline capabilities

**Implementation**:
- [ ] Set up Apple Developer Account
- [ ] Set up Google Play Console Account
- [ ] Configure EAS Build for Expo
- [ ] Implement app signing and provisioning
- [ ] Add platform-specific features
- [ ] Create app store listings and screenshots
- [ ] Set up app update distribution

**Estimated Impact**: 🟦🟦🟦 High - Expands user reach

---

### Offline Mode (P2)

**Current State**: Requires internet connection

**Goals**:
- Cache lessons for offline access
- Queue operations while offline, sync when online
- Work seamlessly in airplane mode

**Implementation**:
- [ ] Implement local storage with SQLite (`expo-sqlite`)
- [ ] Add sync queue service
- [ ] Implement exponential backoff for failed syncs
- [ ] Add offline indicator in UI
- [ ] Test with various network conditions

**Estimated Impact**: 🟦🟦 Medium - Improves accessibility

---

## Feature Enhancements

### Voice Input & Speech Recognition (P2)

**Current State**: Text-only interaction

**Goals**:
- Record voice input for lessons and answers
- Provide speech-to-text for accessibility
- Support voice-based interactions

**Implementation**:
- [ ] Add `expo-av` for audio recording
- [ ] Integrate speech-to-text API (Google Cloud Speech, Whisper)
- [ ] Process voice input in backend
- [ ] Add audio playback for lesson content
- [ ] Test microphone permissions across platforms

**Estimated Impact**: 🟦🟦 Medium - Accessibility feature

---

### Rich Media Support (P2)

**Current State**: Text and basic formatting only

**Goals**:
- Support images, diagrams, and charts in lessons
- Embed videos and interactive content
- Create visual learning experiences

**Implementation**:
- [ ] Extend lesson schema to support media
- [ ] Implement image upload to Firebase Storage
- [ ] Add image compression and optimization
- [ ] Create rich text editor component
- [ ] Add media player components
- [ ] Implement CDN for fast delivery

**Estimated Impact**: 🟦🟦 Medium - Improves content quality

---

### Social Features (P3)

**Current State**: Solo learning experience

**Goals**:
- Study groups and collaborative learning
- Leaderboards and achievements
- Share progress with friends/teachers
- Comments and discussions

**Implementation**:
- [ ] Design social data models
- [ ] Implement friend system
- [ ] Create group functionality
- [ ] Build leaderboard service
- [ ] Add comment system
- [ ] Implement notifications for social activities

**Estimated Impact**: 🟦 Low - Future enhancement

---

### Dark Mode (P2)

**Current State**: Light theme only

**Goals**:
- Support system dark mode preference
- Provide toggle for manual switching
- Maintain accessibility in both modes

**Implementation**:
- [ ] Extend theme system to support dark colors
- [ ] Add theme toggle in Settings screen
- [ ] Persist user preference to local storage
- [ ] Test contrast ratios for accessibility
- [ ] Update all components for dark mode

**Estimated Impact**: 🟦 Low - UX improvement

---

### Push Notifications (P2)

**Current State**: No notifications

**Goals**:
- Remind users to practice lessons
- Notify about study streak achievements
- Alert when review is due (spaced repetition)

**Implementation**:
- [ ] Set up FCM (Firebase Cloud Messaging)
- [ ] Implement notification scheduling
- [ ] Create notification templates
- [ ] Handle notification permissions
- [ ] Track notification engagement

**Estimated Impact**: 🟦🟦 Medium - Engagement feature

---

## Infrastructure & Performance

### Database Optimization (P1)

**Current State**: Basic Firestore queries

**Goals**:
- Add composite indexes for complex queries
- Implement query caching
- Reduce read/write costs
- Profile and optimize hot paths

**Implementation**:
- [ ] Analyze current query patterns
- [ ] Create composite indexes for slow queries
- [ ] Implement caching layer (Redis)
- [ ] Monitor Firestore costs
- [ ] Batch operations where possible

**Estimated Impact**: 🟦🟦🟦 High - Improves performance & reduces costs

---

### CDN for Static Assets (P2)

**Current State**: Direct Cloud Run serving

**Goals**:
- Reduce latency for global users
- Lower bandwidth costs
- Improve page load times

**Implementation**:
- [ ] Set up Cloud CDN
- [ ] Configure cache policies
- [ ] Implement cache busting for updates
- [ ] Monitor cache hit rates
- [ ] Set up geo-location based routing

**Estimated Impact**: 🟦🟦 Medium - Performance improvement

---

### Database Migrations (P1)

**Current State**: Manual schema changes

**Goals**:
- Automated, reversible schema migrations
- Version control for database structure
- Zero-downtime deploys

**Implementation**:
- [ ] Choose migration tool (Alembic, Migrate, custom)
- [ ] Document current schema
- [ ] Create migration workflow
- [ ] Test rollback procedures
- [ ] Automate in CI/CD pipeline

**Estimated Impact**: 🟦🟦🟦 High - Development velocity

---

## DevOps & Monitoring

### Comprehensive Logging (P1)

**Current State**: Basic Cloud Logging

**Goals**:
- Structured logging (JSON format)
- Log aggregation and analysis
- Better debugging capabilities

**Implementation**:
- [ ] Implement structured logging in Go
- [ ] Add request/response IDs for tracing
- [ ] Set up log sampling for high-traffic routes
- [ ] Create log analysis dashboard
- [ ] Implement log retention policies

**Estimated Impact**: 🟦🟦🟦 High - Debugging & monitoring

---

### Distributed Tracing (P2)

**Current State**: No tracing

**Goals**:
- Track requests across services
- Identify performance bottlenecks
- Debug multi-service issues

**Implementation**:
- [ ] Set up Cloud Trace or Jaeger
- [ ] Add trace instrumentation to Go code
- [ ] Instrument Firestore operations
- [ ] Create trace analysis dashboard
- [ ] Set performance alerts

**Estimated Impact**: 🟦🟦 Medium - Operations visibility

---

### Automated Testing (P1)

**Current State**: Limited test coverage

**Goals**:
- Increase unit test coverage to 80%+
- Add integration tests for API endpoints
- End-to-end tests for critical flows
- Performance testing

**Implementation**:
- [ ] Set up test infrastructure
- [ ] Write unit tests for core logic
- [ ] Create integration tests
- [ ] Implement E2E tests with Playwright
- [ ] Add load testing with k6
- [ ] Set coverage thresholds in CI

**Estimated Impact**: 🟦🟦🟦 High - Code quality & reliability

---

### Security Hardening (P1)

**Current State**: Basic security

**Goals**:
- Regular security audits
- Vulnerability scanning
- Penetration testing
- Security best practices

**Implementation**:
- [ ] Set up dependency vulnerability scanning (Snyk, Dependabot)
- [ ] Implement secrets rotation
- [ ] Add rate limiting and DDoS protection
- [ ] Security audit by third party
- [ ] Implement security headers
- [ ] Add input validation everywhere

**Estimated Impact**: 🟦🟦🟦 High - Security & compliance

---

## Analytics & Insights

> 📖 **See detailed strategy**: [ANALYTICS.md](ANALYTICS.md)

### Phase 1: Firebase Analytics (P1) 🔄 IN PROGRESS

**Current State**: No analytics - Strategy documented, ready for implementation

**Goals**:
- Track user engagement metrics (DAU/MAU, session duration)
- Monitor learning performance (quiz scores, completion rates)
- Measure AI performance (response times, error rates)
- Identify drop-off points in funnels

**Implementation**:
- [ ] Set up Firebase Analytics in React Native
- [ ] Create type-safe analytics service
- [ ] Implement Tier 1 events (auth, learning, session)
- [ ] Add active time tracking (not just elapsed time)
- [ ] Implement offline event queue
- [ ] Configure Firebase dashboards
- [ ] Set up BigQuery export

**Key Events** (21 Tier 1 events):
- Auth: `sign_up`, `login`, `logout`
- Learning: `step_started`, `step_completed`, `quiz_question_answered`
- AI: `next_step_generated`, `ai_error`
- Session: `app_open`, `session_start`, `session_end`

**Estimated Impact**: 🟦🟦🟦 High - Foundation for all product decisions

---

### Phase 2: Advanced Analytics (P2)

**Current State**: Planned after Firebase baseline

**Goals**:
- Deep behavioral analysis with cohorts
- Advanced retention curves
- A/B testing infrastructure
- User journey mapping

**Implementation**:
- [ ] Evaluate Mixpanel vs Amplitude
- [ ] Integrate chosen platform
- [ ] Set up cohort analysis
- [ ] Implement retention tracking
- [ ] Create A/B test framework

**Estimated Impact**: 🟦🟦 Medium - Advanced insights

---

### Phase 3: Error Tracking (P2)

**Current State**: Basic Cloud Logging only

**Goals**:
- Detailed error context with stack traces
- Session replay for debugging
- Performance monitoring
- Release health tracking

**Implementation**:
- [ ] Integrate Sentry
- [ ] Configure error grouping
- [ ] Set up session replay
- [ ] Create alerting rules
- [ ] Monitor release health

**Estimated Impact**: 🟦🟦 Medium - Debugging & reliability

---

### Learning Effectiveness Metrics (P2)

**Current State**: No learning outcome tracking

**Goals**:
- Measure retention rates by topic
- Track quiz performance trends
- Identify difficult topics
- Show learning velocity

**Implementation**:
- [ ] Design topic performance schema
- [ ] Aggregate quiz data in BigQuery
- [ ] Create learning analytics dashboard
- [ ] Generate student progress reports
- [ ] A/B test learning methods

**Estimated Impact**: 🟦🟦 Medium - Instructional improvement

---

## Team & Collaboration

### Admin Dashboard (P2)

**Current State**: No admin interface

**Goals**:
- Manage users and courses
- View analytics
- Moderate user-generated content
- Configure system settings

**Implementation**:
- [ ] Design admin UI
- [ ] Implement admin role/permissions
- [ ] Create user management interface
- [ ] Build analytics dashboard
- [ ] Add content moderation tools

**Estimated Impact**: 🟦🟦 Medium - Platform management

---

### Teacher/Instructor Tools (P3)

**Current State**: Single learner focus

**Goals**:
- Class management
- Create custom lesson plans
- Monitor student progress
- Generate reports

**Implementation**:
- [ ] Design teacher workflow
- [ ] Implement class creation
- [ ] Build progress tracking
- [ ] Create report generation
- [ ] Add assignment system

**Estimated Impact**: 🟦 Low - Future expansion

---

## Technical Debt

### Code Refactoring (P2)

**Current Issues**:
- Some components are too large
- Duplicate code in services
- Inconsistent error handling

**Goals**:
- Modularize large components
- Extract shared utilities
- Standardize error handling

**Implementation**:
- [ ] Identify code smell metrics
- [ ] Plan refactoring by module
- [ ] Add tests before refactoring
- [ ] Review and merge incrementally

**Estimated Impact**: 🟦🟦 Medium - Maintainability

---

### Dependencies Update (P2)

**Current State**: Dependencies locked to specific versions

**Goals**:
- Regular dependency updates
- Security patch management
- Major version upgrades

**Implementation**:
- [ ] Set up Dependabot for automated PRs
- [ ] Review and test updates monthly
- [ ] Upgrade major versions quarterly
- [ ] Remove unused dependencies

**Estimated Impact**: 🟦🟦 Medium - Security & stability

---

### Documentation (P1)

**Current Issues**:
- Some features undocumented
- Architecture not fully documented
- API endpoints need better docs

**Goals**:
- Comprehensive API documentation
- Architecture decision records
- Runbooks for common tasks

**Implementation**:
- [ ] Generate API docs from code (Swagger/OpenAPI)
- [ ] Create architecture documentation
- [ ] Write runbooks for operations
- [ ] Video tutorials for users

**Estimated Impact**: 🟦🟦🟦 High - Developer experience

---

## Timeline & Milestones

### Q1 2025 (Near-term)
- [ ] Real LLM integration (P0)
- [ ] Increase test coverage (P1)
- [ ] Database optimization (P1)
- [ ] Security audit (P1)

### Q2 2025 (Medium-term)
- [ ] Spaced repetition algorithm (P1)
- [ ] Native iOS/Android builds (P1)
- [ ] Push notifications (P2)
- [ ] Distributed tracing (P2)

### Q3 2025 (Medium-term)
- [ ] Offline mode (P2)
- [ ] Voice input (P2)
- [ ] Rich media support (P2)
- [ ] Admin dashboard (P2)

### Q4 2025 (Future)
- [ ] Dark mode (P2)
- [ ] Social features (P3)
- [ ] Teacher tools (P3)
- [ ] Analytics & reporting (P2)

---

## Success Metrics

- **Adoption**: 10k+ active users
- **Retention**: 40%+ monthly retention
- **Learning**: 80%+ quiz pass rate
- **Performance**: <500ms API response time
- **Reliability**: 99.9% uptime
- **Security**: Zero critical vulnerabilities

---

## Related Documentation

- [CLAUDE.md](CLAUDE.md) - Development guidelines
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) - Deployment & scaling
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - Common issues
