import { useState, useCallback, useRef, useEffect } from 'react'

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

const gridsEqual = (a, b) => {
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

export const useGameOfLife = (rows = 50, cols = 50) => {
  const [grid, setGrid] = useState(() => 
    Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => false)
    )
  )
  const [generation, setGeneration] = useState(0)
  const [running, setRunning] = useState(false)
  const [showStableModal, setShowStableModal] = useState(false)
  const [stableGen, setStableGen] = useState(0)

  const workerRef = useRef(null)
  const runningRef = useRef(false)
  const gridRef = useRef(grid)
  const inFlightRef = useRef(false)
  const last1GridRef = useRef(null)
  const last2GridRef = useRef(null)
  const iterStartRef = useRef(0)

  // Keep refs in sync with state
  useEffect(() => { gridRef.current = grid }, [grid])
  useEffect(() => { runningRef.current = running }, [running])

  const toggleCellState = useCallback((cell) => {
    setGrid(prev => {
      const next = prev.map(row => row.slice())
      next[cell.row][cell.col] = !next[cell.row][cell.col]
      return next
    })
  }, [])

  const randomize = useCallback(() => {
    setGrid(() =>
      Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => Math.random() > 0.5)
      )
    )
    setGeneration(0)
  }, [rows, cols])

  const toggleGame = useCallback(() => {
    setRunning(prev => !prev)
  }, [])

  // Worker message handler
  const handleWorkerMessage = useCallback((e, onStepComplete) => {
    const t1 = performance.now()
    const ms = iterStartRef.current ? (t1 - iterStartRef.current) : 0
    const next = e.data
    
    // detect still-life (period-1) and period-2 using two-ago BEFORE shifting
    const curr = gridRef.current
    const isStillLife = gridsEqual(next, curr)
    const twoAgo = last2GridRef.current
    const isPeriod2 = !!twoAgo && gridsEqual(next, twoAgo)
    
    // shift history: two-ago <= current, last1 <= next
    last2GridRef.current = curr
    last1GridRef.current = next
    setGrid(next)
    setGeneration(g => {
      const newGen = g + 1
      if ((isStillLife || isPeriod2) && runningRef.current) {
        setStableGen(newGen)
        setShowStableModal(true)
        setRunning(false)
      }
      return newGen
    })
    inFlightRef.current = false
    
    if (onStepComplete) onStepComplete(ms)
  }, [])

  // Initialize worker lazily
  const getWorker = useCallback((onStepComplete) => {
    if (workerRef.current) return workerRef.current
    try {
      const url = `${process.env.PUBLIC_URL || ''}/lifeWorker.js`
      const w = new Worker(url)
      w.onmessage = (e) => handleWorkerMessage(e, onStepComplete)
      workerRef.current = w
      return w
    } catch (_e) {
      return null
    }
  }, [handleWorkerMessage])

  // One simulation step
  const step = useCallback((onStepComplete) => {
    if (inFlightRef.current) return
    const worker = getWorker(onStepComplete)
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
    const ms = t1 - t0
    
    const curr = gridRef.current
    const isStillLife = gridsEqual(next, curr)
    const twoAgo = last2GridRef.current
    const isPeriod2 = !!twoAgo && gridsEqual(next, twoAgo)
    
    // shift history
    last2GridRef.current = curr
    last1GridRef.current = next
    setGrid(next)
    setGeneration(g => {
      const newGen = g + 1
      if ((isStillLife || isPeriod2) && runningRef.current) {
        setStableGen(newGen)
        setShowStableModal(true)
        setRunning(false)
      }
      return newGen
    })
    
    if (onStepComplete) onStepComplete(ms)
  }, [getWorker])

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  return {
    grid,
    generation,
    running,
    showStableModal,
    stableGen,
    toggleCellState,
    randomize,
    toggleGame,
    step,
    setShowStableModal,
    gridRef
  }
}
