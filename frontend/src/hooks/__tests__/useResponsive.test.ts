import { renderHook } from '@testing-library/react-native';
import { useResponsive } from '../useResponsive';

// Mock useWindowDimensions
jest.mock('react-native', () => ({
  useWindowDimensions: jest.fn(),
}));

const { useWindowDimensions } = require('react-native');

describe('useResponsive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('device type detection', () => {
    it('should detect small phone (width < 390)', () => {
      useWindowDimensions.mockReturnValue({ width: 320, height: 568 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isSmallPhone).toBe(true);
      expect(result.current.isStandardPhone).toBe(false);
      expect(result.current.isLargePhone).toBe(false);
      expect(result.current.isTablet).toBe(false);
    });

    it('should detect standard phone (390 <= width < 430)', () => {
      useWindowDimensions.mockReturnValue({ width: 390, height: 844 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isSmallPhone).toBe(false);
      expect(result.current.isStandardPhone).toBe(true);
      expect(result.current.isLargePhone).toBe(false);
      expect(result.current.isTablet).toBe(false);
    });

    it('should detect large phone (430 <= width < 768)', () => {
      useWindowDimensions.mockReturnValue({ width: 430, height: 932 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isSmallPhone).toBe(false);
      expect(result.current.isStandardPhone).toBe(false);
      expect(result.current.isLargePhone).toBe(true);
      expect(result.current.isTablet).toBe(false);
    });

    it('should detect tablet (width >= 768)', () => {
      useWindowDimensions.mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isSmallPhone).toBe(false);
      expect(result.current.isStandardPhone).toBe(false);
      expect(result.current.isLargePhone).toBe(false);
      expect(result.current.isTablet).toBe(true);
    });

    it('should detect large tablet', () => {
      useWindowDimensions.mockReturnValue({ width: 1024, height: 1366 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isTablet).toBe(true);
    });
  });

  describe('orientation detection', () => {
    it('should detect portrait orientation', () => {
      useWindowDimensions.mockReturnValue({ width: 390, height: 844 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isPortrait).toBe(true);
      expect(result.current.isLandscape).toBe(false);
    });

    it('should detect landscape orientation', () => {
      useWindowDimensions.mockReturnValue({ width: 844, height: 390 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isPortrait).toBe(false);
      expect(result.current.isLandscape).toBe(true);
    });

    it('should handle square dimensions as portrait', () => {
      useWindowDimensions.mockReturnValue({ width: 500, height: 500 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isPortrait).toBe(true);
      expect(result.current.isLandscape).toBe(false);
    });
  });

  describe('isMobile flag', () => {
    it('should be true for phones', () => {
      useWindowDimensions.mockReturnValue({ width: 390, height: 844 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isMobile).toBe(true);
    });

    it('should be false for tablets', () => {
      useWindowDimensions.mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isMobile).toBe(false);
    });
  });

  describe('dimensions', () => {
    it('should return correct width and height', () => {
      useWindowDimensions.mockReturnValue({ width: 414, height: 896 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.width).toBe(414);
      expect(result.current.height).toBe(896);
    });
  });

  describe('fontScale', () => {
    it('should be smaller (0.9) for small phones', () => {
      useWindowDimensions.mockReturnValue({ width: 320, height: 568 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.fontScale).toBe(0.9);
    });

    it('should be normal (1) for standard phones', () => {
      useWindowDimensions.mockReturnValue({ width: 390, height: 844 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.fontScale).toBe(1);
    });

    it('should be larger (1.1) for tablets', () => {
      useWindowDimensions.mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.fontScale).toBe(1.1);
    });
  });

  describe('spacingScale', () => {
    it('should be smaller (0.85) for small phones', () => {
      useWindowDimensions.mockReturnValue({ width: 320, height: 568 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.spacingScale).toBe(0.85);
    });

    it('should be normal (1) for standard phones', () => {
      useWindowDimensions.mockReturnValue({ width: 390, height: 844 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.spacingScale).toBe(1);
    });

    it('should be larger (1.15) for tablets', () => {
      useWindowDimensions.mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.spacingScale).toBe(1.15);
    });
  });

  describe('responsive helper function', () => {
    it('should return small value for small phones', () => {
      useWindowDimensions.mockReturnValue({ width: 320, height: 568 });

      const { result } = renderHook(() => useResponsive());

      const value = result.current.responsive('small', 'standard', 'large', 'tablet');
      expect(value).toBe('small');
    });

    it('should return standard value for standard phones', () => {
      useWindowDimensions.mockReturnValue({ width: 390, height: 844 });

      const { result } = renderHook(() => useResponsive());

      const value = result.current.responsive('small', 'standard', 'large', 'tablet');
      expect(value).toBe('standard');
    });

    it('should return large value for large phones', () => {
      useWindowDimensions.mockReturnValue({ width: 430, height: 932 });

      const { result } = renderHook(() => useResponsive());

      const value = result.current.responsive('small', 'standard', 'large', 'tablet');
      expect(value).toBe('large');
    });

    it('should return tablet value for tablets', () => {
      useWindowDimensions.mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      const value = result.current.responsive('small', 'standard', 'large', 'tablet');
      expect(value).toBe('tablet');
    });

    it('should fallback to standard when large is not provided', () => {
      useWindowDimensions.mockReturnValue({ width: 430, height: 932 });

      const { result } = renderHook(() => useResponsive());

      const value = result.current.responsive('small', 'standard');
      expect(value).toBe('standard');
    });

    it('should fallback to standard when tablet is not provided', () => {
      useWindowDimensions.mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      const value = result.current.responsive('small', 'standard', 'large');
      expect(value).toBe('standard');
    });

    it('should work with number values', () => {
      useWindowDimensions.mockReturnValue({ width: 320, height: 568 });

      const { result } = renderHook(() => useResponsive());

      const value = result.current.responsive(12, 14, 16, 18);
      expect(value).toBe(12);
    });

    it('should work with object values', () => {
      useWindowDimensions.mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      const value = result.current.responsive(
        { padding: 8 },
        { padding: 12 },
        { padding: 16 },
        { padding: 24 }
      );
      expect(value).toEqual({ padding: 24 });
    });
  });

  describe('edge cases', () => {
    it('should handle exactly 390 width as standard phone', () => {
      useWindowDimensions.mockReturnValue({ width: 390, height: 844 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isSmallPhone).toBe(false);
      expect(result.current.isStandardPhone).toBe(true);
    });

    it('should handle exactly 430 width as large phone', () => {
      useWindowDimensions.mockReturnValue({ width: 430, height: 932 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isStandardPhone).toBe(false);
      expect(result.current.isLargePhone).toBe(true);
    });

    it('should handle exactly 768 width as tablet', () => {
      useWindowDimensions.mockReturnValue({ width: 768, height: 1024 });

      const { result } = renderHook(() => useResponsive());

      expect(result.current.isLargePhone).toBe(false);
      expect(result.current.isTablet).toBe(true);
    });
  });
});
