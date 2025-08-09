import { render, screen } from '@testing-library/react'
import App from './App'

test('renders game of life controls', () => {
  render(<App />)
  const startButton = screen.getByText(/start/i)
  const randomButton = screen.getByText(/random/i)
  expect(startButton).toBeInTheDocument()
  expect(randomButton).toBeInTheDocument()
})
