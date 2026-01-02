---
name: test-generator
description: Generates comprehensive tests for Ishkul code including state transition tests that catch React Rules of Hooks violations. Creates tests for frontend screens/components (Jest + RTL) and backend handlers (Go testing + testify). Use when creating new code or adding test coverage.
---

# Test Generator

Generates comprehensive tests for Ishkul's React Native frontend and Go backend.

## Tech Stack

- **Frontend**: Jest, React Testing Library, React Native Testing Library
- **Backend**: Go testing, testify (assert/require)
- **E2E**: Playwright (web), Maestro (mobile), Newman (API)

## Frontend Test Generation

### Test File Locations

```
frontend/src/
├── screens/__tests__/ScreenName.test.tsx
├── components/__tests__/ComponentName.test.tsx
├── hooks/__tests__/useHookName.test.ts
└── utils/__tests__/utilName.test.ts
```

### Screen Test Template

Generate tests for screens with all states and transitions:

```typescript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { ScreenName } from '../ScreenName';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#0066FF',
      background: '#FFFFFF',
      text: '#1A1A1A',
      error: '#DC2626',
    },
  }),
}));

jest.mock('../../state/lessonStore', () => ({
  useLessonStore: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: { id: 'test-id' },
  }),
}));

import { useLessonStore } from '../../state/lessonStore';

const mockUseLessonStore = useLessonStore as jest.MockedFunction<typeof useLessonStore>;

describe('ScreenName', () => {
  const defaultProps = {
    navigation: { navigate: jest.fn(), goBack: jest.fn() },
    route: { params: { id: 'test-id' } },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('should display loading indicator when loading', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: true,
        error: null,
      });

      const { getByTestId, queryByText } = render(<ScreenName {...defaultProps} />);

      expect(getByTestId('loading-indicator')).toBeTruthy();
      expect(queryByText(/error/i)).toBeNull();
    });

    it('should not display content while loading', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: true,
        error: null,
      });

      const { queryByTestId } = render(<ScreenName {...defaultProps} />);

      expect(queryByTestId('content-container')).toBeNull();
    });
  });

  describe('Error State', () => {
    it('should display error message when error occurs', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: false,
        error: 'Failed to load lesson',
      });

      const { getByText } = render(<ScreenName {...defaultProps} />);

      expect(getByText(/failed to load/i)).toBeTruthy();
    });

    it('should display retry button on error', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: false,
        error: 'Network error',
      });

      const { getByText } = render(<ScreenName {...defaultProps} />);

      expect(getByText(/retry/i)).toBeTruthy();
    });

    it('should call refetch when retry pressed', () => {
      const mockFetch = jest.fn();
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: false,
        error: 'Error',
        fetchLesson: mockFetch,
      });

      const { getByText } = render(<ScreenName {...defaultProps} />);
      fireEvent.press(getByText(/retry/i));

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    it('should display empty message when no data', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: false,
        error: null,
      });

      const { getByText } = render(<ScreenName {...defaultProps} />);

      expect(getByText(/no lesson found/i)).toBeTruthy();
    });
  });

  describe('Success State', () => {
    const mockLesson = {
      id: 'lesson-1',
      title: 'Test Lesson',
      blocks: [{ id: 'block-1', type: 'text', title: 'Block 1' }],
    };

    it('should display lesson content when loaded', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: mockLesson,
        lessonLoading: false,
        error: null,
      });

      const { getByText } = render(<ScreenName {...defaultProps} />);

      expect(getByText('Test Lesson')).toBeTruthy();
    });

    it('should display all blocks', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: mockLesson,
        lessonLoading: false,
        error: null,
      });

      const { getByText } = render(<ScreenName {...defaultProps} />);

      expect(getByText('Block 1')).toBeTruthy();
    });
  });

  // CRITICAL: State Transition Tests (Prevents React Hooks Violations)
  describe('State Transitions (Rules of Hooks)', () => {
    it('should handle transition from loading to success without crashing', () => {
      // Start with loading state
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: true,
        error: null,
      });

      const { rerender, getByTestId, getByText } = render(<ScreenName {...defaultProps} />);

      // Verify loading state
      expect(getByTestId('loading-indicator')).toBeTruthy();

      // Transition to success state
      mockUseLessonStore.mockReturnValue({
        currentLesson: { id: '1', title: 'Loaded Lesson', blocks: [] },
        lessonLoading: false,
        error: null,
      });

      // Should NOT crash on rerender
      expect(() => rerender(<ScreenName {...defaultProps} />)).not.toThrow();

      // Verify success state
      expect(getByText('Loaded Lesson')).toBeTruthy();
    });

    it('should handle transition from loading to error without crashing', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: true,
        error: null,
      });

      const { rerender, getByTestId, getByText } = render(<ScreenName {...defaultProps} />);

      expect(getByTestId('loading-indicator')).toBeTruthy();

      // Transition to error state
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: false,
        error: 'Network error',
      });

      expect(() => rerender(<ScreenName {...defaultProps} />)).not.toThrow();
      expect(getByText(/network error/i)).toBeTruthy();
    });

    it('should handle transition from error to loading (retry)', () => {
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: false,
        error: 'Error',
      });

      const { rerender, getByText, getByTestId } = render(<ScreenName {...defaultProps} />);

      expect(getByText(/error/i)).toBeTruthy();

      // User triggers retry
      mockUseLessonStore.mockReturnValue({
        currentLesson: null,
        lessonLoading: true,
        error: null,
      });

      expect(() => rerender(<ScreenName {...defaultProps} />)).not.toThrow();
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('should handle rapid state changes without crashing', async () => {
      const states = [
        { currentLesson: null, lessonLoading: true, error: null },
        { currentLesson: null, lessonLoading: false, error: 'Error' },
        { currentLesson: null, lessonLoading: true, error: null },
        { currentLesson: { id: '1', title: 'Lesson', blocks: [] }, lessonLoading: false, error: null },
      ];

      mockUseLessonStore.mockReturnValue(states[0]);
      const { rerender } = render(<ScreenName {...defaultProps} />);

      for (const state of states.slice(1)) {
        mockUseLessonStore.mockReturnValue(state);
        expect(() => rerender(<ScreenName {...defaultProps} />)).not.toThrow();
      }
    });
  });

  describe('User Interactions', () => {
    it('should navigate back when back button pressed', () => {
      const mockGoBack = jest.fn();
      const props = {
        ...defaultProps,
        navigation: { ...defaultProps.navigation, goBack: mockGoBack },
      };

      mockUseLessonStore.mockReturnValue({
        currentLesson: { id: '1', title: 'Lesson', blocks: [] },
        lessonLoading: false,
        error: null,
      });

      const { getByTestId } = render(<ScreenName {...props} />);
      fireEvent.press(getByTestId('back-button'));

      expect(mockGoBack).toHaveBeenCalled();
    });
  });
});
```

### Component Test Template

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: { primary: '#0066FF', text: '#1A1A1A' },
  }),
}));

describe('Button', () => {
  describe('Rendering', () => {
    it('should render with title', () => {
      const { getByText } = render(<Button title="Click me" onPress={() => {}} />);
      expect(getByText('Click me')).toBeTruthy();
    });

    it('should render loading indicator when loading', () => {
      const { queryByText, getByTestId } = render(
        <Button title="Submit" onPress={() => {}} loading />
      );
      expect(queryByText('Submit')).toBeNull();
      expect(getByTestId('loading-indicator')).toBeTruthy();
    });
  });

  describe('Variants', () => {
    const variants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;

    variants.forEach((variant) => {
      it(`should render ${variant} variant`, () => {
        const { getByText } = render(
          <Button title={variant} onPress={() => {}} variant={variant} />
        );
        expect(getByText(variant)).toBeTruthy();
      });
    });
  });

  describe('Sizes', () => {
    const sizes = ['small', 'medium', 'large'] as const;

    sizes.forEach((size) => {
      it(`should render ${size} size`, () => {
        const { getByText } = render(
          <Button title={size} onPress={() => {}} size={size} />
        );
        expect(getByText(size)).toBeTruthy();
      });
    });
  });

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(<Button title="Press me" onPress={onPressMock} />);

      fireEvent.press(getByText('Press me'));

      expect(onPressMock).toHaveBeenCalledTimes(1);
    });

    it('should not call onPress when disabled', () => {
      const onPressMock = jest.fn();
      const { getByText } = render(
        <Button title="Disabled" onPress={onPressMock} disabled />
      );

      fireEvent.press(getByText('Disabled'));

      expect(onPressMock).not.toHaveBeenCalled();
    });

    it('should not call onPress when loading', () => {
      const onPressMock = jest.fn();
      const { getByTestId } = render(
        <Button title="Loading" onPress={onPressMock} loading />
      );

      fireEvent.press(getByTestId('loading-indicator'));

      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty title', () => {
      const { container } = render(<Button title="" onPress={() => {}} />);
      expect(container).toBeTruthy();
    });

    it('should handle very long title', () => {
      const longTitle = 'A'.repeat(100);
      const { getByText } = render(<Button title={longTitle} onPress={() => {}} />);
      expect(getByText(longTitle)).toBeTruthy();
    });
  });
});
```

## Backend Test Generation

### Test File Location

```
backend/internal/handlers/handler_name_test.go
```

### Handler Test Template

```go
package handlers

import (
    "bytes"
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"

    "github.com/mesbahtanvir/ishkul/backend/internal/middleware"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

// Helper to create authenticated request
func createRequest(method, path string, body interface{}, userID, email string) *http.Request {
    var req *http.Request

    if body != nil {
        bodyBytes, _ := json.Marshal(body)
        req = httptest.NewRequest(method, path, bytes.NewBuffer(bodyBytes))
        req.Header.Set("Content-Type", "application/json")
    } else {
        req = httptest.NewRequest(method, path, nil)
    }

    if userID != "" {
        ctx := context.WithValue(req.Context(), middleware.UserIDKey, userID)
        ctx = context.WithValue(ctx, middleware.UserEmailKey, email)
        req = req.WithContext(ctx)
    }

    return req
}

func TestHandlerName(t *testing.T) {
    t.Run("Method Validation", func(t *testing.T) {
        unsupportedMethods := []string{http.MethodGet, http.MethodPut, http.MethodDelete}

        for _, method := range unsupportedMethods {
            t.Run(method+" should be rejected", func(t *testing.T) {
                req := createRequest(method, "/api/resource", nil, "user123", "test@example.com")
                rr := httptest.NewRecorder()

                HandlerName(rr, req)

                assert.Equal(t, http.StatusMethodNotAllowed, rr.Code)
            })
        }
    })

    t.Run("Authentication", func(t *testing.T) {
        t.Run("should reject unauthenticated request", func(t *testing.T) {
            req := createRequest(http.MethodPost, "/api/resource", nil, "", "")
            rr := httptest.NewRecorder()

            HandlerName(rr, req)

            assert.Equal(t, http.StatusUnauthorized, rr.Code)
        })
    })

    t.Run("Input Validation", func(t *testing.T) {
        t.Run("should reject empty body", func(t *testing.T) {
            req := httptest.NewRequest(http.MethodPost, "/api/resource", nil)
            ctx := context.WithValue(req.Context(), middleware.UserIDKey, "user123")
            req = req.WithContext(ctx)
            rr := httptest.NewRecorder()

            HandlerName(rr, req)

            assert.Equal(t, http.StatusBadRequest, rr.Code)

            var response ErrorResponse
            json.Unmarshal(rr.Body.Bytes(), &response)
            assert.Equal(t, ErrCodeInvalidRequest, response.Code)
        })

        t.Run("should reject invalid JSON", func(t *testing.T) {
            req := createRequest(http.MethodPost, "/api/resource", nil, "user123", "test@example.com")
            req.Body = io.NopCloser(bytes.NewBufferString("{invalid json"))
            rr := httptest.NewRecorder()

            HandlerName(rr, req)

            assert.Equal(t, http.StatusBadRequest, rr.Code)
        })

        t.Run("should reject missing required field", func(t *testing.T) {
            body := map[string]interface{}{
                "optionalField": "value",
                // missing "requiredField"
            }
            req := createRequest(http.MethodPost, "/api/resource", body, "user123", "test@example.com")
            rr := httptest.NewRecorder()

            HandlerName(rr, req)

            assert.Equal(t, http.StatusBadRequest, rr.Code)
        })
    })

    t.Run("Success Cases", func(t *testing.T) {
        t.Run("should create resource successfully", func(t *testing.T) {
            body := map[string]interface{}{
                "requiredField": "value",
            }
            req := createRequest(http.MethodPost, "/api/resource", body, "user123", "test@example.com")
            rr := httptest.NewRecorder()

            HandlerName(rr, req)

            require.Equal(t, http.StatusCreated, rr.Code)

            var response map[string]interface{}
            err := json.Unmarshal(rr.Body.Bytes(), &response)
            require.NoError(t, err)

            assert.NotEmpty(t, response["id"])
        })
    })

    t.Run("Edge Cases", func(t *testing.T) {
        t.Run("should handle very long input", func(t *testing.T) {
            body := map[string]interface{}{
                "requiredField": string(make([]byte, 10000)),
            }
            req := createRequest(http.MethodPost, "/api/resource", body, "user123", "test@example.com")
            rr := httptest.NewRecorder()

            HandlerName(rr, req)

            // Should either accept or reject gracefully (not panic)
            assert.Contains(t, []int{http.StatusCreated, http.StatusBadRequest}, rr.Code)
        })

        t.Run("should handle special characters in input", func(t *testing.T) {
            body := map[string]interface{}{
                "requiredField": "Test <script>alert('xss')</script>",
            }
            req := createRequest(http.MethodPost, "/api/resource", body, "user123", "test@example.com")
            rr := httptest.NewRecorder()

            HandlerName(rr, req)

            // Should handle without crashing
            assert.NotEqual(t, http.StatusInternalServerError, rr.Code)
        })
    })
}
```

## When to Use

- When creating new screens in `frontend/src/screens/`
- When creating new components in `frontend/src/components/`
- When creating new handlers in `backend/internal/handlers/`
- When adding coverage to existing code
- When fixing bugs (add regression tests)

## Output

Generate the complete test file with:
- All required imports and mocks
- Tests for all states (loading, error, success)
- State transition tests (critical!)
- User interaction tests
- Edge case tests

Place the generated file in the correct `__tests__` directory.
