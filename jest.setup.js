// Add any global test setup here
global.fetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
}); 