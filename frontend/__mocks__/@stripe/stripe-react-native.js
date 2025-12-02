/**
 * Mock for @stripe/stripe-react-native
 * Used in Jest tests since the native module is not available in test environment
 */

const React = require('react');

// Mock StripeProvider component
const StripeProvider = ({ children }) => children;

// Mock hook functions
const initPaymentSheet = jest.fn().mockResolvedValue({ error: null });
const presentPaymentSheet = jest.fn().mockResolvedValue({ error: null });
const useStripe = jest.fn().mockReturnValue({
  initPaymentSheet,
  presentPaymentSheet,
  confirmPayment: jest.fn().mockResolvedValue({ error: null }),
  confirmSetupIntent: jest.fn().mockResolvedValue({ error: null }),
  retrievePaymentIntent: jest.fn().mockResolvedValue({}),
  retrieveSetupIntent: jest.fn().mockResolvedValue({}),
  handleURLCallback: jest.fn().mockResolvedValue(false),
});

// Mock CardField component
const CardField = (props) => null;

module.exports = {
  StripeProvider,
  CardField,
  useStripe,
  initPaymentSheet,
  presentPaymentSheet,
};
