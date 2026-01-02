// Mock firebase/firestore
module.exports = {
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), // returns unsubscribe
  DocumentSnapshot: jest.fn(),
  QuerySnapshot: jest.fn(),
};
