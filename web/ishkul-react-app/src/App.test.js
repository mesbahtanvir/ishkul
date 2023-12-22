import { render, screen } from '@testing-library/react';
import App from './App';

test('renders question bank link', () => {
  render(<App />);
  const linkElement = screen.getByText(/question bank/i);
  expect(linkElement).toBeInTheDocument();
});
