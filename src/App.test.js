import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the grid component', () => {
  render(<App />);
  const gridElement = screen.getByRole('grid');
  expect(gridElement).toBeInTheDocument();
});

