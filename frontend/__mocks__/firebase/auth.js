// Mock firebase/auth
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
  getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
};

module.exports = {
  getAuth: jest.fn(() => ({
    currentUser: mockUser,
  })),
  signInWithCustomToken: jest.fn().mockResolvedValue({ user: mockUser }),
  signOut: jest.fn().mockResolvedValue(undefined),
  onAuthStateChanged: jest.fn((auth, callback) => {
    callback(mockUser);
    return jest.fn(); // unsubscribe
  }),
};
