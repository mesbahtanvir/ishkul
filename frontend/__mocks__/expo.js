// Mock for expo module to avoid winter runtime issues in Jest
module.exports = {
  registerRootComponent: jest.fn(),
};
