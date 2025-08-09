import { useState, useCallback, useEffect, useMemo, useRef } from "react"
import Square from './Square'

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

  // Initialize worker lazily
  const getWorker = () => {
    if (workerRef.current) return workerRef.current
    try {
      // Use public folder worker to avoid bundler/test complications
      const url = `${process.env.PUBLIC_URL || ''}/lifeWorker.js`
      const w = new Worker(url)
      workerRef.current = w
      return w
    } catch (_e) {
      return null
    }
  }

  const iterate = useCallback(() => {
    const worker = getWorker()
    if (worker) {
      const handleMessage = (e) => {
        setGrid(e.data)
        setgeneration(g => g + 1)
        worker.removeEventListener('message', handleMessage)
      }
      worker.addEventListener('message', handleMessage)
      worker.postMessage(grid)
    } else {
      // Fallback synchronous compute
      setGrid(prev => {
        const rows = prev.length
        const cols = prev[0].length
        const next = Array.from({ length: rows }, () => Array(cols))
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const n = findNeighbours(prev, r, c)
            next[r][c] = prev[r][c] ? (n === 2 || n === 3) : (n === 3)
          }
        }
        return next
      })
      setgeneration(g => g + 1)
    }
  }, [grid])

  useEffect(() => {
    if (!running) return
    const intervalID = setInterval(iterate, SIMULATION_INTERVAL) // Adjust interval for better control
    return () => clearInterval(intervalID)
  }, [running, iterate])

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate()
        workerRef.current = null
      }
    }
  }, [])

  const squares = useMemo(() => (
    grid.map((row, rowIndex) =>
      row.map((active, colIndex) => (
        <Square
          key={`${rowIndex}-${colIndex}`}
          row={rowIndex}
          col={colIndex}
          active={active}
          setActive={toggleCellState}
        />
      ))
    )
  ), [grid, toggleCellState])

  return (
    <>
      <button onClick={toggleGame}>{running ? "Pause" : "Start"}</button>
      <span>Generation: {generation}</span>
      <button onClick={randomize}>Random</button>
      <div className="grid" role="grid">
        {squares}
      </div>
    </>
  )
}

export default Grid