import { useState, useCallback, useEffect, memo } from "react"
import produce from 'immer'
import Square from './Square'

const findNeighbours = (grid, row, col) => {
  let numNeighbours = 0
  const neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
  neighbours.forEach(([dx, dy]) => {
    const newRow = row + dx
    const newCol = col + dy
    if (
      newRow >= 0 &&
      newRow < grid.length &&
      newCol >= 0 &&
      newCol < grid[0].length &&
      grid[newRow][newCol]
    ) {
      numNeighbours++
    }
  })
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
  const [grid, setGrid] = useState(initialGrid())
  const [generation, setgeneration] = useState(0)

  const toggleCellState = useCallback((cell) => {
    setGrid(produce(draft => {
      draft[cell.row][cell.col] = !draft[cell.row][cell.col]
    }))
  }, [])

  const toggleGame = () => {
    if (running) {
      setRunning(false)
    } else {
      setRunning(true)
    }
  }

  const randomize = () => {
    setGrid(produce(draft =>
      draft.forEach(row => row.forEach((_, colIndex) => row[colIndex] = Math.random() > 0.5))
    ))
  }

  const iterate = useCallback(() => {
    setGrid(g => produce(g, draft => {
      draft.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          const numNeighbours = findNeighbours(g, rowIndex, colIndex)
          draft[rowIndex][colIndex] = g[rowIndex][colIndex]
            ? numNeighbours === 2 || numNeighbours === 3
            : numNeighbours === 3
        })
      })
    }))
    setgeneration(g => g + 1)
  }, [])

  useEffect(() => {
    if (!running) return
    const intervalID = setInterval(iterate, 100) // Adjust interval for better control
    return () => clearInterval(intervalID)
  }, [running, iterate])

  return (
    <>
      <button onClick={toggleGame}>{running ? "Pause" : "Start"}</button>
      <button onClick={randomize}>Random</button>
      <div className="grid" role="grid">
        {grid.map((row, rowIndex) =>
          row.map((active, colIndex) => (
            <Square
              key={`${rowIndex}-${colIndex}`}
              row={rowIndex}
              col={colIndex}
              active={active}
              setActive={toggleCellState}
            />
          ))
        )}
      </div>
    </>
  )
}

export default Grid