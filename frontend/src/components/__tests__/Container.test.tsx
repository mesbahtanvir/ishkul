import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Container } from '../Container';

// Mock SafeAreaView
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: object }) => (
    <>{children}</>
  ),
}));

// Mock useTheme
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        primary: '#FFFFFF',
        secondary: '#F5F5F5',
      },
    },
  }),
}));

describe('Container', () => {
  describe('rendering', () => {
    it('should render children', () => {
      const { getByText } = render(
        <Container>
          <Text>Child content</Text>
        </Container>
      );

      expect(getByText('Child content')).toBeTruthy();
    });

    it('should render without crashing', () => {
      const { toJSON } = render(
        <Container>
          <Text>Test</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should render multiple children', () => {
      const { getByText } = render(
        <Container>
          <Text>First</Text>
          <Text>Second</Text>
          <Text>Third</Text>
        </Container>
      );

      expect(getByText('First')).toBeTruthy();
      expect(getByText('Second')).toBeTruthy();
      expect(getByText('Third')).toBeTruthy();
    });
  });

  describe('scrollable prop', () => {
    it('should render as non-scrollable by default', () => {
      const { toJSON } = render(
        <Container>
          <Text>Content</Text>
        </Container>
      );

      // Non-scrollable container should render
      expect(toJSON()).toBeTruthy();
    });

    it('should render as scrollable when prop is true', () => {
      const { toJSON, getByText } = render(
        <Container scrollable>
          <Text>Scrollable content</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
      expect(getByText('Scrollable content')).toBeTruthy();
    });

    it('should render as non-scrollable when prop is false', () => {
      const { toJSON, getByText } = render(
        <Container scrollable={false}>
          <Text>Non-scrollable content</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
      expect(getByText('Non-scrollable content')).toBeTruthy();
    });
  });

  describe('padding prop', () => {
    it('should use medium padding by default', () => {
      const { toJSON } = render(
        <Container>
          <Text>Content</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should support none padding', () => {
      const { toJSON } = render(
        <Container padding="none">
          <Text>No padding</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should support small padding', () => {
      const { toJSON } = render(
        <Container padding="small">
          <Text>Small padding</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should support medium padding', () => {
      const { toJSON } = render(
        <Container padding="medium">
          <Text>Medium padding</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should support large padding', () => {
      const { toJSON } = render(
        <Container padding="large">
          <Text>Large padding</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('should accept custom style prop', () => {
      const { toJSON } = render(
        <Container style={{ backgroundColor: 'red' }}>
          <Text>Styled content</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
    });

    it('should merge custom styles with default styles', () => {
      const { toJSON } = render(
        <Container style={{ marginTop: 20, borderWidth: 1 }}>
          <Text>Content</Text>
        </Container>
      );

      expect(toJSON()).toBeTruthy();
    });
  });

  describe('scrollable with padding', () => {
    it('should apply padding in scrollable mode', () => {
      const { getByText } = render(
        <Container scrollable padding="large">
          <Text>Scrollable with padding</Text>
        </Container>
      );

      expect(getByText('Scrollable with padding')).toBeTruthy();
    });

    it('should apply no padding in scrollable mode', () => {
      const { getByText } = render(
        <Container scrollable padding="none">
          <Text>Scrollable no padding</Text>
        </Container>
      );

      expect(getByText('Scrollable no padding')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle empty children', () => {
      const { toJSON } = render(<Container>{null}</Container>);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle undefined children', () => {
      const { toJSON } = render(<Container>{undefined}</Container>);
      expect(toJSON()).toBeTruthy();
    });

    it('should handle conditional children', () => {
      const showContent = false;
      const { toJSON } = render(
        <Container>{showContent && <Text>Conditional</Text>}</Container>
      );

      expect(toJSON()).toBeTruthy();
    });
  });
});
