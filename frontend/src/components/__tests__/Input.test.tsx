import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Input } from '../Input';

describe('Input', () => {
  describe('rendering', () => {
    it('should render without label', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Enter text" />
      );

      expect(getByPlaceholderText('Enter text')).toBeTruthy();
    });

    it('should render with label', () => {
      const { getByText, getByPlaceholderText } = render(
        <Input label="Username" placeholder="Enter username" />
      );

      expect(getByText('Username')).toBeTruthy();
      expect(getByPlaceholderText('Enter username')).toBeTruthy();
    });

    it('should render with error message', () => {
      const { getByText } = render(
        <Input label="Email" error="Invalid email address" />
      );

      expect(getByText('Invalid email address')).toBeTruthy();
    });

    it('should render with hint text', () => {
      const { getByText } = render(
        <Input label="Password" hint="Must be at least 8 characters" />
      );

      expect(getByText('Must be at least 8 characters')).toBeTruthy();
    });

    it('should show error instead of hint when both provided', () => {
      const { getByText, queryByText } = render(
        <Input label="Field" error="Error message" hint="Hint message" />
      );

      expect(getByText('Error message')).toBeTruthy();
      expect(queryByText('Hint message')).toBeNull();
    });
  });

  describe('text input', () => {
    it('should call onChangeText when text changes', () => {
      const onChangeTextMock = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Type here" onChangeText={onChangeTextMock} />
      );

      fireEvent.changeText(getByPlaceholderText('Type here'), 'New text');

      expect(onChangeTextMock).toHaveBeenCalledWith('New text');
    });

    it('should display value', () => {
      const { getByDisplayValue } = render(
        <Input value="Test value" />
      );

      expect(getByDisplayValue('Test value')).toBeTruthy();
    });
  });

  describe('props passthrough', () => {
    it('should pass secureTextEntry prop', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Password" secureTextEntry />
      );

      const input = getByPlaceholderText('Password');
      expect(input.props.secureTextEntry).toBe(true);
    });

    it('should pass editable prop', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Disabled" editable={false} />
      );

      const input = getByPlaceholderText('Disabled');
      expect(input.props.editable).toBe(false);
    });

    it('should pass multiline prop', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Multiline" multiline />
      );

      const input = getByPlaceholderText('Multiline');
      expect(input.props.multiline).toBe(true);
    });

    it('should pass keyboardType prop', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Email" keyboardType="email-address" />
      );

      const input = getByPlaceholderText('Email');
      expect(input.props.keyboardType).toBe('email-address');
    });

    it('should pass autoCapitalize prop', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Name" autoCapitalize="words" />
      );

      const input = getByPlaceholderText('Name');
      expect(input.props.autoCapitalize).toBe('words');
    });
  });

  describe('custom styles', () => {
    it('should apply containerStyle', () => {
      const customStyle = { marginBottom: 20 };
      const { getByPlaceholderText } = render(
        <Input placeholder="Styled" containerStyle={customStyle} />
      );

      expect(getByPlaceholderText('Styled')).toBeTruthy();
    });
  });

  describe('accessibility', () => {
    it('should be accessible by placeholder', () => {
      const { getByPlaceholderText } = render(
        <Input placeholder="Accessible input" />
      );

      expect(getByPlaceholderText('Accessible input')).toBeTruthy();
    });
  });

  describe('focus behavior', () => {
    it('should call onFocus when focused', () => {
      const onFocusMock = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Focus me" onFocus={onFocusMock} />
      );

      fireEvent(getByPlaceholderText('Focus me'), 'focus');

      expect(onFocusMock).toHaveBeenCalled();
    });

    it('should call onBlur when blurred', () => {
      const onBlurMock = jest.fn();
      const { getByPlaceholderText } = render(
        <Input placeholder="Blur me" onBlur={onBlurMock} />
      );

      fireEvent(getByPlaceholderText('Blur me'), 'blur');

      expect(onBlurMock).toHaveBeenCalled();
    });
  });
});
