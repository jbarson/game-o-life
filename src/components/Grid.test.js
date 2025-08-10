import { render, screen, fireEvent, act } from '@testing-library/react'
import Grid from './Grid'

function createMockCtx() {
  const calls = []
  const ctx = {
    calls,
    fillStyle: '#000',
    fillRect: jest.fn(function (x, y, w, h) {
      calls.push({ type: 'fillRect', x, y, w, h, fillStyle: this.fillStyle })
    }),
    clearRect: jest.fn(),
    get callsByFill() {
      return calls
    }
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

test('renders the grid', () => {
  render(<Grid />)
  const gridElement = screen.getByRole('grid')
  expect(gridElement).toBeInTheDocument()
})

test('toggles cell state on canvas click (top-left cell)', () => {
  render(<Grid />)
  const canvas = screen.getByTestId('grid-canvas')
  // reset recorded calls to focus on post-click draw
  const ctx = canvas.getContext('2d')
  ctx.calls.length = 0
  fireEvent.click(canvas, { clientX: 5, clientY: 5 })
  // expect a black fill at cell (0,0)
  const blackAt00 = ctx.calls.find(c => c.type === 'fillRect' && c.x === 0 && c.y === 0 && c.fillStyle === '#000')
  expect(blackAt00).toBeTruthy()
})

test('starts and stops the simulation', () => {
  render(<Grid />)
  const startButton = screen.getByText(/start/i)
  fireEvent.click(startButton)
  expect(startButton).toHaveTextContent(/pause/i)
  fireEvent.click(startButton)
  expect(startButton).toHaveTextContent(/start/i)
})

test('randomizes the grid draws some active cells', () => {
  render(<Grid />)
  const randomizeButton = screen.getByText(/random/i)
  const canvas = screen.getByTestId('grid-canvas')
  const ctx = canvas.getContext('2d')
  ctx.calls.length = 0
  fireEvent.click(randomizeButton)
  const hasBlack = ctx.calls.some(c => c.type === 'fillRect' && c.fillStyle === '#000')
  expect(hasBlack).toBe(true)
})

// Helpers for stability tests
function clickCell(canvas, row, col, cellSize = 10, cellGap = 1) {
  const x = col * (cellSize + cellGap) + 1
  const y = row * (cellSize + cellGap) + 1
  fireEvent.click(canvas, { clientX: x, clientY: y })
}

test('pauses and shows modal on still-life (block) detection', async () => {
  // Force fallback (no worker)
  // eslint-disable-next-line no-global-assign
  global.Worker = undefined

  render(<Grid />)
  const canvas = screen.getByTestId('grid-canvas')

  // Create a 2x2 block at (0,0)-(1,1)
  clickCell(canvas, 0, 0)
  clickCell(canvas, 0, 1)
  clickCell(canvas, 1, 0)
  clickCell(canvas, 1, 1)

  // Mock rAF
  let rafCb = null
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    rafCb = cb
    return 1
  })

  const startBtn = screen.getByText(/start/i)
  fireEvent.click(startBtn)

  await act(async () => {
    rafCb(1)
  })
  await act(async () => {
    rafCb(200)
  })

  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  expect(await screen.findByText(/Grid stable after 1 generations/i)).toBeInTheDocument()
  expect(screen.getByText(/start/i)).toBeInTheDocument()
})

test('pauses and shows modal on period-2 (blinker) detection', async () => {
  // Force fallback (no worker)
  // eslint-disable-next-line no-global-assign
  global.Worker = undefined

  render(<Grid />)
  const canvas = screen.getByTestId('grid-canvas')

  // Blinker
  const r = 3
  clickCell(canvas, r, 3)
  clickCell(canvas, r, 4)
  clickCell(canvas, r, 5)

  let rafCb = null
  jest.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => {
    rafCb = cb
    return 1
  })

  const startBtn = screen.getByText(/start/i)
  fireEvent.click(startBtn)

  await act(async () => { rafCb(1) })
  await act(async () => { rafCb(200) })
  await act(async () => { rafCb(400) })

  expect(await screen.findByRole('dialog')).toBeInTheDocument()
  expect(await screen.findByText(/Grid stable after 2 generations/i)).toBeInTheDocument()
  expect(screen.getByText(/start/i)).toBeInTheDocument()
})
