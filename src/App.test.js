import { render, screen } from '@testing-library/react'
import App from './App'

function createMockCtx() {
  const calls = []
  const ctx = {
    calls,
    fillStyle: '#000',
    fillRect: jest.fn(function (x, y, w, h) {
      calls.push({ type: 'fillRect', x, y, w, h, fillStyle: this.fillStyle })
    }),
    clearRect: jest.fn(),
  }
  return ctx
}

beforeEach(() => {
  const mockCtx = createMockCtx()
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => mockCtx)
  jest.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ left: 0, top: 0, width: 500, height: 500 }))
})

afterEach(() => {
  jest.restoreAllMocks()
})

test('renders the grid component', () => {
  render(<App />)
  const gridElement = screen.getByRole('grid')
  expect(gridElement).toBeInTheDocument()
})

