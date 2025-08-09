import { useState, useCallback, useEffect, useMemo, useRef } from "react"

const SIMULATION_INTERVAL = 100 // milliseconds between generations
const CELL_SIZE = 10 // canvas pixels per cell (match CSS .square)
const CELL_GAP = 1 // pixels between cells (match CSS .grid gap)
const NEIGHBOR_OFFSETS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]

const findNeighbours = (grid, row, col) => {
  let numNeighbours = 0
  const rows = grid.length
  const cols = grid[0].length
  for (let i = 0; i < NEIGHBOR_OFFSETS.length; i++) {
    const dx = NEIGHBOR_OFFSETS[i][0]
    const dy = NEIGHBOR_OFFSETS[i][1]
    const r = row + dx
    const c = col + dy
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c]) numNeighbours++
  }
  return numNeighbours
}

function Grid() {
  const squareGrid = {
    rows: 50,
    cols: 50
  }

  const initialGrid = () => {
    // Use a 2D array for better performance
    return Array.from({ length: squareGrid.rows }, () =>
      Array.from({ length: squareGrid.cols }, () => false)
    )
  }

  const [running, setRunning] = useState(false)
  const [grid, setGrid] = useState(initialGrid)
  const [generation, setgeneration] = useState(0)

  const toggleCellState = useCallback((cell) => {
    setGrid(prev => {
      const next = prev.map(row => row.slice())
      next[cell.row][cell.col] = !next[cell.row][cell.col]
      return next
    })
  }, [])

  const toggleGame = () => {
    if (running) {
      setRunning(false)
    } else {
      setRunning(true)
    }
  }

  const randomize = () => {
    setGrid(() =>
      Array.from({ length: squareGrid.rows }, () =>
        Array.from({ length: squareGrid.cols }, () => Math.random() > 0.5)
      )
    )
  }

  const workerRef = useRef(null)
  const runningRef = useRef(false)
  const gridRef = useRef(grid)
  const inFlightRef = useRef(false)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const lastTimeRef = useRef(0)
  const accRef = useRef(0)

  // Keep refs in sync with state
  useEffect(() => { gridRef.current = grid }, [grid])
  useEffect(() => { runningRef.current = running }, [running])

  // Worker message handler (stable)
  const handleWorkerMessage = useCallback((e) => {
    setGrid(e.data)
    setgeneration(g => g + 1)
    inFlightRef.current = false
  }, [])

  // Initialize worker lazily (stable)
  const getWorker = useCallback(() => {
    if (workerRef.current) return workerRef.current
    try {
      // Use public folder worker to avoid bundler/test complications
      const url = `${process.env.PUBLIC_URL || ''}/lifeWorker.js`
      const w = new Worker(url)
      w.onmessage = handleWorkerMessage
      workerRef.current = w
      return w
    } catch (_e) {
      return null
    }
  }, [handleWorkerMessage])

  // Draw current grid state to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const prev = gridRef.current
    const rows = prev.length
    const cols = prev[0].length
    const pitchX = CELL_SIZE + CELL_GAP
    const pitchY = CELL_SIZE + CELL_GAP
    const width = cols * CELL_SIZE + (cols - 1) * CELL_GAP
    const height = rows * CELL_SIZE + (rows - 1) * CELL_GAP
    // ensure canvas size
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    // background as gridline color (#eee)
    ctx.fillStyle = '#eee'
    ctx.fillRect(0, 0, width, height)
    // draw cells (inactive white, active black)
    for (let r = 0; r < rows; r++) {
      const row = prev[r]
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = row[c] ? '#000' : '#fff'
        ctx.fillRect(c * pitchX, r * pitchY, CELL_SIZE, CELL_SIZE)
      }
    }
  }, [])

  // One simulation step, either via worker or synchronously
  const step = useCallback(() => {
    if (inFlightRef.current) return
    const worker = getWorker()
    if (worker) {
      inFlightRef.current = true
      worker.postMessage(gridRef.current)
      return
    }
    // Fallback synchronous compute
    const prev = gridRef.current
    const rows = prev.length
    const cols = prev[0].length
    const next = Array.from({ length: rows }, () => Array(cols))
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const n = findNeighbours(prev, r, c)
        next[r][c] = prev[r][c] ? (n === 2 || n === 3) : (n === 3)
      }
    }
    setGrid(next)
    setgeneration(g => g + 1)
  }, [getWorker])

  // Animation loop driven by requestAnimationFrame
  const animate = useCallback((ts) => {
    if (!runningRef.current) return
    if (!lastTimeRef.current) lastTimeRef.current = ts
    const dt = ts - lastTimeRef.current
    lastTimeRef.current = ts
    accRef.current += dt
    if (accRef.current >= SIMULATION_INTERVAL) {
      // step once per interval to avoid piling up
      step()
      accRef.current -= SIMULATION_INTERVAL
    }
    draw()
    rafRef.current = requestAnimationFrame(animate)
  }, [draw, step])

  // Start/stop loop when running changes
  useEffect(() => {
    if (running) {
      const w = getWorker()
      if (w) w.onmessage = handleWorkerMessage
      lastTimeRef.current = 0
      accRef.current = 0
      rafRef.current = requestAnimationFrame(animate)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, animate])

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  // Accessible hidden grid for tests and keyboard/screen reader users
  const a11yGrid = useMemo(() => (
    grid.map((row, rowIndex) =>
      row.map((active, colIndex) => (
        <div
          key={`${rowIndex}-${colIndex}`}
          role="gridcell"
          aria-selected={active}
          className={active ? 'active' : ''}
          onClick={() => toggleCellState({ row: rowIndex, col: colIndex })}
          style={{ position: 'absolute', left: '-99999px', width: 1, height: 1, overflow: 'hidden' }}
          data-testid={`cell-${rowIndex}-${colIndex}`}
        />
      ))
    )
  ), [grid, toggleCellState])

  // Toggle by clicking on canvas (for actual UI use)
  const onCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const col = Math.floor(x / CELL_SIZE)
    const row = Math.floor(y / CELL_SIZE)
    if (row >= 0 && row < gridRef.current.length && col >= 0 && col < gridRef.current[0].length) {
      toggleCellState({ row, col })
    }
  }, [toggleCellState])

  return (
    <>
      <button onClick={toggleGame}>{running ? "Pause" : "Start"}</button>
      <span>Generation: {generation}</span>
      <button onClick={randomize}>Random</button>
      <div className="grid" role="grid">
        <canvas ref={canvasRef} onClick={onCanvasClick} />
        {a11yGrid}
      </div>
    </>
  )
}

export default Grid