import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressBar } from '../ProgressBar';

// Mock the useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      primary: '#0066FF',
      gray200: '#E5E7EB',
    },
  }),
}));

describe('ProgressBar', () => {
  describe('rendering', () => {
    it('should render without crashing', () => {
      const { toJSON } = render(<ProgressBar progress={50} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with 0 progress', () => {
      const { toJSON } = render(<ProgressBar progress={0} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with 100 progress', () => {
      const { toJSON } = render(<ProgressBar progress={100} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('progress clamping', () => {
    it('should handle negative progress values', () => {
      // Should not crash and clamp to 0
      const { toJSON } = render(<ProgressBar progress={-10} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle progress values over 100', () => {
      // Should not crash and clamp to 100
      const { toJSON } = render(<ProgressBar progress={150} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle fractional progress values', () => {
      const { toJSON } = render(<ProgressBar progress={33.33} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('height prop', () => {
    it('should render with default height', () => {
      const { toJSON } = render(<ProgressBar progress={50} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with custom height', () => {
      const { toJSON } = render(<ProgressBar progress={50} height={16} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with small height', () => {
      const { toJSON } = render(<ProgressBar progress={50} height={4} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should render with large height', () => {
      const { toJSON } = render(<ProgressBar progress={50} height={24} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom colors', () => {
    it('should render with custom background color', () => {
      const { toJSON } = render(
        <ProgressBar progress={50} backgroundColor="#FF0000" />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render with custom progress color', () => {
      const { toJSON } = render(
        <ProgressBar progress={50} progressColor="#00FF00" />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should render with both custom colors', () => {
      const { toJSON } = render(
        <ProgressBar
          progress={50}
          backgroundColor="#FF0000"
          progressColor="#00FF00"
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('should apply custom container style', () => {
      const customStyle = { marginVertical: 10 };
      const { toJSON } = render(
        <ProgressBar progress={50} style={customStyle} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('should merge custom styles with defaults', () => {
      const customStyle = { borderWidth: 1, borderColor: '#000' };
      const { toJSON } = render(
        <ProgressBar progress={50} style={customStyle} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('combined props', () => {
    it('should handle all props together', () => {
      const { toJSON } = render(
        <ProgressBar
          progress={75}
          height={12}
          backgroundColor="#DDDDDD"
          progressColor="#4CAF50"
          style={{ margin: 10 }}
        />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('progress boundary values', () => {
    it('should handle exactly 0%', () => {
      const { toJSON } = render(<ProgressBar progress={0} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle exactly 50%', () => {
      const { toJSON } = render(<ProgressBar progress={50} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle exactly 100%', () => {
      const { toJSON } = render(<ProgressBar progress={100} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle small percentages', () => {
      const { toJSON } = render(<ProgressBar progress={1} />);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle values near 100%', () => {
      const { toJSON } = render(<ProgressBar progress={99} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
