import { render, screen } from '@testing-library/react';
import App from './App';

test('renders roster guardian header', () => {
  render(<App />);
  const headerElement = screen.getByText(/Roster Guardian/i);
  expect(headerElement).toBeInTheDocument();
});
