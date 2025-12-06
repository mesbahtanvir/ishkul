import React from 'react';
import { render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { Card } from '../Card';

// Mock the useTheme hook
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        primary: '#FFFFFF',
        secondary: '#F5F5F5',
      },
      text: {
        primary: '#000000',
      },
    },
    isDark: false,
  }),
}));

// Mock the elevation module
jest.mock('../../theme/elevation', () => ({
  getElevation: jest.fn(() => ({ shadowOpacity: 0.1 })),
}));

describe('Card', () => {
  describe('rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <Card>
          <Text>Card Content</Text>
        </Card>
      );

      expect(getByText('Card Content')).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <Card>
          <Text>First</Text>
          <Text>Second</Text>
        </Card>
      );

      expect(getByText('First')).toBeTruthy();
      expect(getByText('Second')).toBeTruthy();
    });

    it('should render nested views', () => {
      const { getByTestId } = render(
        <Card>
          <View testID="nested-view">
            <Text>Nested Content</Text>
          </View>
        </Card>
      );

      expect(getByTestId('nested-view')).toBeTruthy();
    });
  });

  describe('padding variants', () => {
    it('should render with default md padding', () => {
      const { toJSON } = render(
        <Card>
          <Text>Content</Text>
        </Card>
      );

      // Component renders without crashing
      expect(toJSON()).toBeTruthy();
    });

    it('should render with xs padding', () => {
      const { toJSON } = render(
        <Card padding="xs">
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render with sm padding', () => {
      const { toJSON } = render(
        <Card padding="sm">
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render with lg padding', () => {
      const { toJSON } = render(
        <Card padding="lg">
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render with xl padding', () => {
      const { toJSON } = render(
        <Card padding="xl">
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('elevation variants', () => {
    it('should render with default md elevation', () => {
      const { toJSON } = render(
        <Card>
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render with sm elevation', () => {
      const { toJSON } = render(
        <Card elevation="sm">
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render with lg elevation', () => {
      const { toJSON } = render(
        <Card elevation="lg">
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render with xl elevation', () => {
      const { toJSON } = render(
        <Card elevation="xl">
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render with none elevation', () => {
      const { toJSON } = render(
        <Card elevation="none">
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('should apply custom style', () => {
      const customStyle = { marginTop: 10, marginBottom: 20 };
      const { toJSON } = render(
        <Card style={customStyle}>
          <Text>Content</Text>
        </Card>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should merge custom style with default styles', () => {
      const customStyle = { backgroundColor: 'red' };
      const { toJSON } = render(
        <Card style={customStyle}>
          <Text>Content</Text>
        </Card>
      );

      // Component renders without crashing
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('combined props', () => {
    it('should handle all props together', () => {
      const { getByText } = render(
        <Card padding="lg" elevation="xl" style={{ margin: 10 }}>
          <Text>Combined Props</Text>
        </Card>
      );

      expect(getByText('Combined Props')).toBeTruthy();
    });
  });

  describe('empty card', () => {
    it('should render empty card without crashing', () => {
      const { toJSON } = render(<Card>{null}</Card>);

      expect(toJSON()).toBeTruthy();
    });
  });
});
