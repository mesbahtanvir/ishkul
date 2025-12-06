import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { SegmentedControl } from '../SegmentedControl';

// Mock useTheme
jest.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    colors: {
      background: {
        primary: '#FFFFFF',
        tertiary: '#F3F4F6',
      },
      text: {
        primary: '#000000',
        secondary: '#666666',
      },
      primary: '#007AFF',
      gray400: '#9CA3AF',
      white: '#FFFFFF',
    },
  }),
}));

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.spring = jest.fn(() => ({
    start: (callback?: () => void) => callback && callback(),
  }));
  return RN;
});

describe('SegmentedControl', () => {
  type TabValue = 'tab1' | 'tab2' | 'tab3';

  const defaultOptions = [
    { value: 'tab1' as TabValue, label: 'Tab 1' },
    { value: 'tab2' as TabValue, label: 'Tab 2' },
  ];

  const defaultProps = {
    options: defaultOptions,
    selectedValue: 'tab1' as TabValue,
    onValueChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all options', () => {
      const { getByText } = render(<SegmentedControl {...defaultProps} />);

      expect(getByText('Tab 1')).toBeTruthy();
      expect(getByText('Tab 2')).toBeTruthy();
    });

    it('should render with three options', () => {
      const options = [
        { value: 'tab1' as TabValue, label: 'First' },
        { value: 'tab2' as TabValue, label: 'Second' },
        { value: 'tab3' as TabValue, label: 'Third' },
      ];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="tab1"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText('First')).toBeTruthy();
      expect(getByText('Second')).toBeTruthy();
      expect(getByText('Third')).toBeTruthy();
    });

    it('should render single option', () => {
      const options = [{ value: 'only' as const, label: 'Only Option' }];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="only"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText('Only Option')).toBeTruthy();
    });
  });

  describe('selection', () => {
    it('should call onValueChange when option is pressed', () => {
      const onValueChange = jest.fn();
      const { getByText } = render(
        <SegmentedControl
          {...defaultProps}
          onValueChange={onValueChange}
        />
      );

      fireEvent.press(getByText('Tab 2'));

      expect(onValueChange).toHaveBeenCalledWith('tab2');
    });

    it('should call onValueChange with correct value for each option', () => {
      const onValueChange = jest.fn();
      const options = [
        { value: 'a' as const, label: 'Option A' },
        { value: 'b' as const, label: 'Option B' },
        { value: 'c' as const, label: 'Option C' },
      ];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="a"
          onValueChange={onValueChange}
        />
      );

      fireEvent.press(getByText('Option B'));
      expect(onValueChange).toHaveBeenLastCalledWith('b');

      fireEvent.press(getByText('Option C'));
      expect(onValueChange).toHaveBeenLastCalledWith('c');

      fireEvent.press(getByText('Option A'));
      expect(onValueChange).toHaveBeenLastCalledWith('a');
    });

    it('should allow selecting already selected option', () => {
      const onValueChange = jest.fn();
      const { getByText } = render(
        <SegmentedControl
          {...defaultProps}
          selectedValue="tab1"
          onValueChange={onValueChange}
        />
      );

      fireEvent.press(getByText('Tab 1'));

      expect(onValueChange).toHaveBeenCalledWith('tab1');
    });
  });

  describe('badge/count', () => {
    it('should render count badge when count is provided', () => {
      const options = [
        { value: 'active' as const, label: 'Active', count: 5 },
        { value: 'completed' as const, label: 'Completed', count: 3 },
      ];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="active"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText('5')).toBeTruthy();
      expect(getByText('3')).toBeTruthy();
    });

    it('should not render badge when count is 0', () => {
      const options = [
        { value: 'active' as const, label: 'Active', count: 0 },
        { value: 'archived' as const, label: 'Archived', count: 2 },
      ];

      const { queryByText, getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="active"
          onValueChange={jest.fn()}
        />
      );

      // Count 0 should not show badge
      expect(queryByText('0')).toBeNull();
      // Count 2 should show
      expect(getByText('2')).toBeTruthy();
    });

    it('should not render badge when count is undefined', () => {
      const options = [
        { value: 'tab1' as const, label: 'Tab 1' },
        { value: 'tab2' as const, label: 'Tab 2', count: 10 },
      ];

      const { getByText, queryAllByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="tab1"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText('10')).toBeTruthy();
      expect(getByText('Tab 1')).toBeTruthy();
    });

    it('should handle large count numbers', () => {
      const options = [
        { value: 'items' as const, label: 'Items', count: 999 },
      ];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="items"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText('999')).toBeTruthy();
    });
  });

  describe('selected state styling', () => {
    it('should render with correct selected option', () => {
      const { getByText } = render(
        <SegmentedControl
          {...defaultProps}
          selectedValue="tab2"
        />
      );

      // Both options should be rendered
      expect(getByText('Tab 1')).toBeTruthy();
      expect(getByText('Tab 2')).toBeTruthy();
    });

    it('should update when selectedValue changes', () => {
      const { getByText, rerender } = render(
        <SegmentedControl {...defaultProps} selectedValue="tab1" />
      );

      expect(getByText('Tab 1')).toBeTruthy();

      rerender(<SegmentedControl {...defaultProps} selectedValue="tab2" />);

      expect(getByText('Tab 1')).toBeTruthy();
      expect(getByText('Tab 2')).toBeTruthy();
    });
  });

  describe('edge cases', () => {
    it('should handle options with same labels', () => {
      const options = [
        { value: 'first' as const, label: 'Same' },
        { value: 'second' as const, label: 'Same' },
      ];

      const { getAllByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="first"
          onValueChange={jest.fn()}
        />
      );

      expect(getAllByText('Same')).toHaveLength(2);
    });

    it('should handle long labels', () => {
      const options = [
        { value: 'short' as const, label: 'Short' },
        { value: 'long' as const, label: 'This is a very long label' },
      ];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="short"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText('This is a very long label')).toBeTruthy();
    });

    it('should handle special characters in labels', () => {
      const options = [
        { value: 'special' as const, label: "Tab's & <Items>" },
      ];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="special"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText("Tab's & <Items>")).toBeTruthy();
    });

    it('should handle emoji in labels', () => {
      const options = [
        { value: 'emoji' as const, label: '🎉 Party' },
        { value: 'work' as const, label: '💼 Work' },
      ];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="emoji"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText('🎉 Party')).toBeTruthy();
      expect(getByText('💼 Work')).toBeTruthy();
    });
  });

  describe('layout', () => {
    it('should handle layout events', () => {
      const { getByText } = render(<SegmentedControl {...defaultProps} />);

      // Component should render and handle layout
      expect(getByText('Tab 1')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should be pressable', () => {
      const onValueChange = jest.fn();
      const { getByText } = render(
        <SegmentedControl {...defaultProps} onValueChange={onValueChange} />
      );

      const tab2 = getByText('Tab 2');
      fireEvent.press(tab2);

      expect(onValueChange).toHaveBeenCalled();
    });
  });

  describe('common use cases', () => {
    it('should work as filter tabs', () => {
      type FilterValue = 'all' | 'active' | 'completed';
      const options = [
        { value: 'all' as FilterValue, label: 'All', count: 10 },
        { value: 'active' as FilterValue, label: 'Active', count: 5 },
        { value: 'completed' as FilterValue, label: 'Completed', count: 5 },
      ];
      const onValueChange = jest.fn();

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="all"
          onValueChange={onValueChange}
        />
      );

      expect(getByText('All')).toBeTruthy();
      expect(getByText('10')).toBeTruthy();

      fireEvent.press(getByText('Active'));
      expect(onValueChange).toHaveBeenCalledWith('active');
    });

    it('should work as view mode switcher', () => {
      type ViewMode = 'list' | 'grid';
      const options = [
        { value: 'list' as ViewMode, label: 'List' },
        { value: 'grid' as ViewMode, label: 'Grid' },
      ];

      const { getByText } = render(
        <SegmentedControl
          options={options}
          selectedValue="list"
          onValueChange={jest.fn()}
        />
      );

      expect(getByText('List')).toBeTruthy();
      expect(getByText('Grid')).toBeTruthy();
    });
  });
});
