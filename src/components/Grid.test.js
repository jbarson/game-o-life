import { render, screen, fireEvent } from '@testing-library/react';
import Grid from './Grid';

test('renders the grid', () => {
  render(<Grid />);
  const gridElement = screen.getByRole('grid');
  expect(gridElement).toBeInTheDocument();
});

test('toggles cell state on click', () => {
  render(<Grid />);
  const square = screen.getAllByRole('cell')[0];
  fireEvent.click(square);
  expect(square).toHaveClass('active');
});

test('starts and stops the simulation', () => {
  render(<Grid />);
  const startButton = screen.getByText(/start/i);
  fireEvent.click(startButton);
  expect(startButton).toHaveTextContent(/pause/i);
  fireEvent.click(startButton);
  expect(startButton).toHaveTextContent(/start/i);
});

test('randomizes the grid', () => {
  render(<Grid />);
  const randomizeButton = screen.getByText(/random/i);
  fireEvent.click(randomizeButton);
  // Hard to test the exact state, but we can check if there are active cells
  const activeSquares = screen.getAllByRole('cell').filter(el => el.classList.contains('active'));
  expect(activeSquares.length).toBeGreaterThan(0);
});
