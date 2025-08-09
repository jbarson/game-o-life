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
  
  // Use a more specific approach to find squares
  // eslint-disable-next-line testing-library/no-node-access
  const squares = gridElement.children
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

  // After randomization, check if there are any squares with 'active' class
  // Use a more Testing Library friendly approach
  // eslint-disable-next-line testing-library/no-node-access
  const activeSquares = Array.from(gridElement.children).filter(child => 
    child.classList.contains('active')
  )

  // Since randomization has 50% chance per cell, with 2500 cells, 
  // it's extremely unlikely to have 0 active cells
  expect(activeSquares.length).toBeGreaterThan(0)
})
