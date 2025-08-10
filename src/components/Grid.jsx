import { useState, useCallback, useEffect, useRef } from "react"

const SIMULATION_INTERVAL = 100 // milliseconds between generations
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
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [cellSize, setCellSize] = useState(10)
  const [cellGap, setCellGap] = useState(1)

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
  const last1GridRef = useRef(null)
  const last2GridRef = useRef(null)
  const iterStartRef = useRef(0)
  const timesRef = useRef([])
  const framesInBatchRef = useRef(0)
  const [perfStats, setPerfStats] = useState(null)
  const fpsEwmaRef = useRef(0)
  const computeEwmaRef = useRef(0)
  const lastFpsUiRef = useRef(0)
  const [liveStats, setLiveStats] = useState({ fps: null, computeEwma: null })
  const [showStableModal, setShowStableModal] = useState(false)
  const [stableGen, setStableGen] = useState(0)

  // Sync CSS variables for sizes and grid dims
  useEffect(() => {
    const root = document.documentElement
    // read sizes
    const csRaw = getComputedStyle(root).getPropertyValue('--cell-size').trim()
    const cgRaw = getComputedStyle(root).getPropertyValue('--cell-gap').trim()
    const cs = parseFloat(csRaw || '10') || 10
    const cg = parseFloat(cgRaw || '1') || 1
    setCellSize(cs)
    setCellGap(cg)
    // set grid dims for CSS grid (if used)
    root.style.setProperty('--grid-rows', String(squareGrid.rows))
    root.style.setProperty('--grid-cols', String(squareGrid.cols))
  }, [squareGrid.rows, squareGrid.cols])

  // Manage drawer-open class for non-occluding toggle position
  useEffect(() => {
    const root = document.documentElement
    if (drawerOpen) root.classList.add('drawer-open')
    else root.classList.remove('drawer-open')
  }, [drawerOpen])

  // Record iteration duration and update stats every 100 frames
  const recordDuration = useCallback((ms) => {
    // Update compute-time EWMA (alpha=0.1)
    const alpha = 0.1
    const prev = computeEwmaRef.current || ms
    computeEwmaRef.current = prev + alpha * (ms - prev)
    setLiveStats(s => ({ ...s, computeEwma: computeEwmaRef.current }))
    timesRef.current.push(ms)
    framesInBatchRef.current += 1
    if (framesInBatchRef.current >= 100) {
      const arr = timesRef.current.slice().sort((a, b) => a - b)
      const min = arr[0]
      const max = arr[arr.length - 1]
      const mid = Math.floor(arr.length / 2)
      const median = arr.length % 2 === 0 ? (arr[mid - 1] + arr[mid]) / 2 : arr[mid]
      setPerfStats({ min, median, max })
      timesRef.current = []
      framesInBatchRef.current = 0
    }
  }, [])

  // Keep refs in sync with state
  useEffect(() => { gridRef.current = grid }, [grid])
  useEffect(() => { runningRef.current = running }, [running])

  // Worker message handler (stable)
  const handleWorkerMessage = useCallback((e) => {
    // measure worker compute time
    const t1 = performance.now()
    const ms = iterStartRef.current ? (t1 - iterStartRef.current) : 0
    if (ms > 0) recordDuration(ms)
    const next = e.data
    // detect period-2 cycle using two-ago BEFORE shifting
    const twoAgo = last2GridRef.current
    const isPeriod2 = !!twoAgo && gridsEqual(next, twoAgo)
    // shift history: set two-ago to current before commit
    last2GridRef.current = gridRef.current
    last1GridRef.current = next
    setGrid(next)
    setgeneration(g => {
      const newGen = g + 1
      if (isPeriod2 && runningRef.current) {
        setStableGen(newGen)
        setShowStableModal(true)
        setRunning(false)
      }
      return newGen
    })
    inFlightRef.current = false
  }, [recordDuration])

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
    const pitchX = cellSize + cellGap
    const pitchY = cellSize + cellGap
    const width = cols * cellSize + (cols - 1) * cellGap
    const height = rows * cellSize + (rows - 1) * cellGap
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
        ctx.fillRect(c * pitchX, r * pitchY, cellSize, cellSize)
      }
    }
  }, [cellSize, cellGap])

  // One simulation step, either via worker or synchronously
  const step = useCallback(() => {
    if (inFlightRef.current) return
    const worker = getWorker()
    if (worker) {
      inFlightRef.current = true
      iterStartRef.current = performance.now()
      worker.postMessage(gridRef.current)
      return
    }
    // Fallback synchronous compute
    const t0 = performance.now()
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
    const t1 = performance.now()
    recordDuration(t1 - t0)
    const twoAgo = last2GridRef.current
    const isPeriod2 = !!twoAgo && gridsEqual(next, twoAgo)
    // shift history: set two-ago to current before commit
    last2GridRef.current = gridRef.current
    last1GridRef.current = next
    setGrid(next)
    setgeneration(g => {
      const newGen = g + 1
      if (isPeriod2 && runningRef.current) {
        setStableGen(newGen)
        setShowStableModal(true)
        setRunning(false)
      }
      return newGen
    })
  }, [getWorker, recordDuration])

  // Animation loop driven by requestAnimationFrame
  const animate = useCallback((ts) => {
    if (!runningRef.current) return
    if (!lastTimeRef.current) lastTimeRef.current = ts
    const dt = ts - lastTimeRef.current
    lastTimeRef.current = ts
    // FPS EWMA update (alpha=0.1), throttle UI to ~4Hz
    if (dt > 0) {
      const fps = 1000 / dt
      const alpha = 0.1
      const prev = fpsEwmaRef.current || fps
      fpsEwmaRef.current = prev + alpha * (fps - prev)
      if (!lastFpsUiRef.current) lastFpsUiRef.current = ts
      if (ts - lastFpsUiRef.current > 250) {
        setLiveStats(s => ({ ...s, fps: fpsEwmaRef.current }))
        lastFpsUiRef.current = ts
      }
    }
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

  // Redraw when grid changes (also covers paused state toggles)
  useEffect(() => {
    draw()
  }, [grid, draw])

  // Toggle by clicking on canvas (for actual UI use)
  const onCanvasClick = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pitchX = cellSize + cellGap
    const pitchY = cellSize + cellGap
    const col = Math.floor(x / pitchX)
    const row = Math.floor(y / pitchY)
    // ignore clicks in the gap between cells
    const inCellX = (x % pitchX) < cellSize
    const inCellY = (y % pitchY) < cellSize
    if (!inCellX || !inCellY) return
    if (row >= 0 && row < gridRef.current.length && col >= 0 && col < gridRef.current[0].length) {
      toggleCellState({ row, col })
    }
  }, [toggleCellState, cellSize, cellGap])

  // helper: deep equality for 2D boolean arrays
  function gridsEqual(a, b) {
    if (!a || !b) return false
    if (a.length !== b.length) return false
    if (a.length === 0) return true
    if (a[0].length !== b[0].length) return false
    for (let r = 0; r < a.length; r++) {
      const ra = a[r]
      const rb = b[r]
      for (let c = 0; c < ra.length; c++) {
        if (ra[c] !== rb[c]) return false
      }
    }
    return true
  }

  return (
    <>
      {showStableModal && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="stable-title">
          <div className="modal">
            <h4 id="stable-title">Grid stable after {stableGen} generations</h4>
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <button onClick={() => setShowStableModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}
      <button
        className="drawer-toggle"
        onClick={() => setDrawerOpen(o => !o)}
        aria-expanded={drawerOpen}
        aria-controls="stats-drawer"
        title="Toggle performance stats"
      >
        {drawerOpen ? 'Stats' : 'Stats'}
      </button>
      <div className="controls">
        <button onClick={toggleGame}>{running ? 'Pause' : 'Start'}</button>
        <button onClick={randomize}>Random</button>
        <span style={{ fontSize: 12 }}>Gen: {generation}</span>
      </div>
      <aside
        id="stats-drawer"
        aria-label="Performance Stats"
        className={`drawer ${drawerOpen ? 'open' : ''}`}
      >
        <h3>Performance</h3>
        <div className="drawer-content">
          <div>Generation: {generation}</div>
          <div>Running: {running ? 'Yes' : 'No'}</div>
          {liveStats.fps != null && (
            <div>FPS: {liveStats.fps.toFixed(1)}</div>
          )}
          {liveStats.computeEwma != null && (
            <div>EWMA: {liveStats.computeEwma.toFixed(2)}ms</div>
          )}
          {perfStats && (
            <>
              <div>Min: {perfStats.min.toFixed(2)}ms</div>
              <div>Median: {perfStats.median.toFixed(2)}ms</div>
              <div>Max: {perfStats.max.toFixed(2)}ms</div>
            </>
          )}
        </div>
      </aside>
      <div className="grid" role="grid">
        <canvas ref={canvasRef} onClick={onCanvasClick} data-testid="grid-canvas" />
      </div>
    </>
  )
}

export default Grid