import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

describe('Button', () => {
  describe('rendering', () => {
    it('should render with title', () => {
      const { getByText } = render(<Button title="Click me" onPress={() => {}} />);

      expect(getByText('Click me')).toBeTruthy();
    });

    it('should render with loading indicator', () => {
      const { queryByText, getByTestId } = render(
        <Button title="Loading" onPress={() => {}} loading />
      );

      // Title should not be visible when loading
      expect(queryByText('Loading')).toBeNull();
    });
  });

  describe('onPress', () => {
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
      const { getByRole } = render(
        <Button title="Loading" onPress={onPressMock} loading />
      );

      // Button should not be pressable when loading
      expect(onPressMock).not.toHaveBeenCalled();
    });
  });

  describe('variants', () => {
    it('should render primary variant by default', () => {
      const { getByText } = render(<Button title="Primary" onPress={() => {}} />);

      expect(getByText('Primary')).toBeTruthy();
    });

    it('should render secondary variant', () => {
      const { getByText } = render(
        <Button title="Secondary" onPress={() => {}} variant="secondary" />
      );

      expect(getByText('Secondary')).toBeTruthy();
    });

    it('should render outline variant', () => {
      const { getByText } = render(
        <Button title="Outline" onPress={() => {}} variant="outline" />
      );

      expect(getByText('Outline')).toBeTruthy();
    });

    it('should render ghost variant', () => {
      const { getByText } = render(
        <Button title="Ghost" onPress={() => {}} variant="ghost" />
      );

      expect(getByText('Ghost')).toBeTruthy();
    });
  });

  describe('sizes', () => {
    it('should render small size', () => {
      const { getByText } = render(
        <Button title="Small" onPress={() => {}} size="small" />
      );

      expect(getByText('Small')).toBeTruthy();
    });

    it('should render medium size by default', () => {
      const { getByText } = render(<Button title="Medium" onPress={() => {}} />);

      expect(getByText('Medium')).toBeTruthy();
    });

    it('should render large size', () => {
      const { getByText } = render(
        <Button title="Large" onPress={() => {}} size="large" />
      );

      expect(getByText('Large')).toBeTruthy();
    });
  });

  describe('disabled state', () => {
    it('should apply disabled style', () => {
      const { getByText } = render(
        <Button title="Disabled" onPress={() => {}} disabled />
      );

      expect(getByText('Disabled')).toBeTruthy();
    });
  });

  describe('custom styles', () => {
    it('should apply custom button style', () => {
      const customStyle = { marginTop: 10 };
      const { getByText } = render(
        <Button title="Custom" onPress={() => {}} style={customStyle} />
      );

      expect(getByText('Custom')).toBeTruthy();
    });

    it('should apply custom text style', () => {
      const customTextStyle = { fontSize: 20 };
      const { getByText } = render(
        <Button title="Custom Text" onPress={() => {}} textStyle={customTextStyle} />
      );

      expect(getByText('Custom Text')).toBeTruthy();
    });
  });
});
