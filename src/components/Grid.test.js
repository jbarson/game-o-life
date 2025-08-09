import { render, screen, fireEvent, within } from '@testing-library/react'
import Grid from './Grid'

test('renders the grid', () => {
  render(<Grid />)
  const gridElement = screen.getByRole('grid')
  expect(gridElement).toBeInTheDocument()
})

test('toggles cell state on click', () => {
  render(<Grid />)
  const grid = screen.getByRole('grid')
  const { getAllByRole } = within(grid)
  const cells = getAllByRole('gridcell')
  const first = cells[0]

  expect(first).not.toHaveClass('active')
  fireEvent.click(first)
  expect(first).toHaveClass('active')
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
  const grid = screen.getByRole('grid')
  const randomizeButton = screen.getByText(/random/i)

  fireEvent.click(randomizeButton)

  const { getAllByRole } = within(grid)
  const cells = getAllByRole('gridcell')
  const activeCells = cells.filter(cell => cell.classList.contains('active'))
  expect(activeCells.length).toBeGreaterThan(0)
})
