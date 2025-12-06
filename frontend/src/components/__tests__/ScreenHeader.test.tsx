import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ScreenHeader } from '../ScreenHeader';

// Mock dependencies
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        primary: '#FFFFFF',
      },
      primary: '#0066FF',
      text: {
        primary: '#000000',
      },
    },
    isDark: false,
  }),
}));

describe('ScreenHeader', () => {
  it('should render title', () => {
    const { getByText } = render(<ScreenHeader title="Test Title" />);

    expect(getByText('Test Title')).toBeTruthy();
  });

  it('should render back button when onBack is provided', () => {
    const onBack = jest.fn();
    const { getByText } = render(
      <ScreenHeader title="Test" onBack={onBack} />
    );

    expect(getByText('← Back')).toBeTruthy();
  });

  it('should not render back button when onBack is not provided', () => {
    const { queryByText } = render(<ScreenHeader title="Test" />);

    expect(queryByText('← Back')).toBeNull();
  });

  it('should call onBack when back button is pressed', () => {
    const onBack = jest.fn();
    const { getByText } = render(
      <ScreenHeader title="Test" onBack={onBack} />
    );

    fireEvent.press(getByText('← Back'));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('should render right action when provided', () => {
    const rightAction = <Text>Action</Text>;
    const { getByText } = render(
      <ScreenHeader title="Test" rightAction={rightAction} />
    );

    expect(getByText('Action')).toBeTruthy();
  });

  it('should render without right action placeholder when not provided', () => {
    const { toJSON } = render(<ScreenHeader title="Test" />);

    // Component should still render properly
    expect(toJSON()).toBeTruthy();
  });

  it('should truncate long titles', () => {
    const longTitle = 'This is a very long title that should be truncated';
    const { getByText } = render(<ScreenHeader title={longTitle} />);

    const titleElement = getByText(longTitle);
    expect(titleElement.props.numberOfLines).toBe(1);
  });

  it('should render with both back button and right action', () => {
    const onBack = jest.fn();
    const rightAction = <Text>Save</Text>;
    const { getByText } = render(
      <ScreenHeader title="Edit" onBack={onBack} rightAction={rightAction} />
    );

    expect(getByText('← Back')).toBeTruthy();
    expect(getByText('Edit')).toBeTruthy();
    expect(getByText('Save')).toBeTruthy();
  });
});
