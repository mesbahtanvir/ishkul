import { ErrorCodes, ApiError, ErrorCode } from '../api';

describe('ErrorCodes', () => {
  describe('Authentication error codes', () => {
    it('should have INVALID_REQUEST code', () => {
      expect(ErrorCodes.INVALID_REQUEST).toBe('INVALID_REQUEST');
    });

    it('should have INVALID_CREDENTIALS code', () => {
      expect(ErrorCodes.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    });

    it('should have EMAIL_EXISTS code', () => {
      expect(ErrorCodes.EMAIL_EXISTS).toBe('EMAIL_EXISTS');
    });

    it('should have WEAK_PASSWORD code', () => {
      expect(ErrorCodes.WEAK_PASSWORD).toBe('WEAK_PASSWORD');
    });

    it('should have INVALID_EMAIL code', () => {
      expect(ErrorCodes.INVALID_EMAIL).toBe('INVALID_EMAIL');
    });

    it('should have USER_NOT_FOUND code', () => {
      expect(ErrorCodes.USER_NOT_FOUND).toBe('USER_NOT_FOUND');
    });

    it('should have TOO_MANY_REQUESTS code', () => {
      expect(ErrorCodes.TOO_MANY_REQUESTS).toBe('TOO_MANY_REQUESTS');
    });

    it('should have SERVICE_UNAVAILABLE code', () => {
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    });

    it('should have INTERNAL_ERROR code', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    });

    it('should have INVALID_TOKEN code', () => {
      expect(ErrorCodes.INVALID_TOKEN).toBe('INVALID_TOKEN');
    });

    it('should have TOKEN_EXPIRED code', () => {
      expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
    });

    it('should have MISSING_CREDENTIALS code', () => {
      expect(ErrorCodes.MISSING_CREDENTIALS).toBe('MISSING_CREDENTIALS');
    });

    it('should have NETWORK_ERROR code', () => {
      expect(ErrorCodes.NETWORK_ERROR).toBe('NETWORK_ERROR');
    });
  });

  describe('Learning path error codes', () => {
    it('should have COURSE_COMPLETED code', () => {
      expect(ErrorCodes.COURSE_COMPLETED).toBe('COURSE_COMPLETED');
    });

    it('should have COURSE_ARCHIVED code', () => {
      expect(ErrorCodes.COURSE_ARCHIVED).toBe('COURSE_ARCHIVED');
    });

    it('should have COURSE_DELETED code', () => {
      expect(ErrorCodes.COURSE_DELETED).toBe('COURSE_DELETED');
    });

    it('should be used for completed path errors', () => {
      // Verify the code matches the expected backend response
      const completedError = new ApiError(ErrorCodes.COURSE_COMPLETED, 'Path is completed', 400);
      expect(completedError.code).toBe('COURSE_COMPLETED');
      expect(completedError.statusCode).toBe(400);
    });

    it('should be used for archived path errors', () => {
      const archivedError = new ApiError(ErrorCodes.COURSE_ARCHIVED, 'Path is archived', 400);
      expect(archivedError.code).toBe('COURSE_ARCHIVED');
      expect(archivedError.statusCode).toBe(400);
    });

    it('should be used for deleted path errors', () => {
      const deletedError = new ApiError(ErrorCodes.COURSE_DELETED, 'Path is deleted', 404);
      expect(deletedError.code).toBe('COURSE_DELETED');
      expect(deletedError.statusCode).toBe(404);
    });
  });

  describe('ErrorCodes completeness', () => {
    it('should have all expected error codes', () => {
      const expectedCodes = [
        'INVALID_REQUEST',
        'INVALID_CREDENTIALS',
        'EMAIL_EXISTS',
        'WEAK_PASSWORD',
        'INVALID_EMAIL',
        'USER_NOT_FOUND',
        'TOO_MANY_REQUESTS',
        'SERVICE_UNAVAILABLE',
        'INTERNAL_ERROR',
        'INVALID_TOKEN',
        'TOKEN_EXPIRED',
        'MISSING_CREDENTIALS',
        'NETWORK_ERROR',
        'COURSE_COMPLETED',
        'COURSE_ARCHIVED',
        'COURSE_DELETED',
      ];

      const actualCodes = Object.values(ErrorCodes);

      expectedCodes.forEach((code) => {
        expect(actualCodes).toContain(code);
      });
    });

    it('should have 18 total error codes', () => {
      expect(Object.keys(ErrorCodes)).toHaveLength(18);
    });
  });
});

describe('ApiError', () => {
  it('should create error with code and message', () => {
    const error = new ApiError(ErrorCodes.COURSE_COMPLETED, 'Path is completed');

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ApiError');
    expect(error.code).toBe('COURSE_COMPLETED');
    expect(error.message).toBe('Path is completed');
  });

  it('should create error with statusCode', () => {
    const error = new ApiError(ErrorCodes.COURSE_COMPLETED, 'Path is completed', 400);

    expect(error.statusCode).toBe(400);
  });

  it('should allow type checking error code', () => {
    const error = new ApiError(ErrorCodes.COURSE_COMPLETED, 'Path is completed', 400);

    // Type guard style check
    const isPathCompletedError = error.code === ErrorCodes.COURSE_COMPLETED;
    expect(isPathCompletedError).toBe(true);
  });

  it('should work with different error codes', () => {
    const errors: ApiError[] = [
      new ApiError(ErrorCodes.COURSE_COMPLETED, 'Completed', 400),
      new ApiError(ErrorCodes.COURSE_ARCHIVED, 'Archived', 400),
      new ApiError(ErrorCodes.COURSE_DELETED, 'Deleted', 404),
      new ApiError(ErrorCodes.NETWORK_ERROR, 'Network error'),
    ];

    expect(errors[0].code).toBe('COURSE_COMPLETED');
    expect(errors[1].code).toBe('COURSE_ARCHIVED');
    expect(errors[2].code).toBe('COURSE_DELETED');
    expect(errors[3].code).toBe('NETWORK_ERROR');
  });
});

describe('ErrorCode type', () => {
  it('should accept valid error codes', () => {
    const code1: ErrorCode = 'COURSE_COMPLETED';
    const code2: ErrorCode = 'COURSE_ARCHIVED';
    const code3: ErrorCode = 'NETWORK_ERROR';

    expect(code1).toBe('COURSE_COMPLETED');
    expect(code2).toBe('COURSE_ARCHIVED');
    expect(code3).toBe('NETWORK_ERROR');
  });
});

describe('Error handling patterns', () => {
  it('should support error code checking in catch blocks', () => {
    const handleError = (error: unknown): string => {
      if (error instanceof ApiError) {
        switch (error.code) {
          case ErrorCodes.COURSE_COMPLETED:
            return 'This path is already completed';
          case ErrorCodes.COURSE_ARCHIVED:
            return 'This path is archived';
          case ErrorCodes.COURSE_DELETED:
            return 'This path was deleted';
          default:
            return 'An error occurred';
        }
      }
      return 'Unknown error';
    };

    const completedError = new ApiError(ErrorCodes.COURSE_COMPLETED, 'Completed', 400);
    const archivedError = new ApiError(ErrorCodes.COURSE_ARCHIVED, 'Archived', 400);
    const deletedError = new ApiError(ErrorCodes.COURSE_DELETED, 'Deleted', 404);

    expect(handleError(completedError)).toBe('This path is already completed');
    expect(handleError(archivedError)).toBe('This path is archived');
    expect(handleError(deletedError)).toBe('This path was deleted');
  });

  it('should support checking error codes for learning path status', () => {
    const pathStatusCodes: string[] = [
      ErrorCodes.COURSE_COMPLETED,
      ErrorCodes.COURSE_ARCHIVED,
      ErrorCodes.COURSE_DELETED,
    ];

    const isCourseStatusError = (error: unknown): boolean => {
      if (error instanceof ApiError) {
        return pathStatusCodes.includes(error.code);
      }
      return false;
    };

    expect(isCourseStatusError(new ApiError(ErrorCodes.COURSE_COMPLETED, 'msg', 400))).toBe(true);
    expect(isCourseStatusError(new ApiError(ErrorCodes.COURSE_ARCHIVED, 'msg', 400))).toBe(true);
    expect(isCourseStatusError(new ApiError(ErrorCodes.COURSE_DELETED, 'msg', 404))).toBe(true);
    expect(isCourseStatusError(new ApiError(ErrorCodes.NETWORK_ERROR, 'msg'))).toBe(false);
    expect(isCourseStatusError(new Error('regular error'))).toBe(false);
  });
});
