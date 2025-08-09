import { render, screen, fireEvent } from '@testing-library/react'
import Grid from './Grid'

test('renders the grid', () => {
  render(<Grid />)
  const gridElement = screen.getByRole('grid')
  expect(gridElement).toBeInTheDocument()
})

test('toggles cell state on click', () => {
  render(<Grid />)
  const gridElement = screen.getByRole('grid')
  const squares = gridElement.querySelectorAll('.square')
  const firstSquare = squares[0]

  expect(firstSquare).not.toHaveClass('active')
  fireEvent.click(firstSquare)
  expect(firstSquare).toHaveClass('active')
})

test('starts and stops the simulation', () => {
  render(<Grid />)
  const startButton = screen.getByText(/start/i)
  fireEvent.click(startButton)
  expect(startButton).toHaveTextContent(/pause/i)
  fireEvent.click(startButton)
  expect(startButton).toHaveTextContent(/start/i)
})

test('randomizes the grid', () => {
  render(<Grid />)
  const gridElement = screen.getByRole('grid')
  const randomizeButton = screen.getByText(/random/i)

  fireEvent.click(randomizeButton)

  // After randomization, there should be some active squares (with high probability)
  const squaresAfter = gridElement.querySelectorAll('.square.active').length

  // Since randomization has 50% chance per cell, with 2500 cells, 
  // it's extremely unlikely to have 0 active cells
  expect(squaresAfter).toBeGreaterThan(0)
})
