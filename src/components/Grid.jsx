import { useState, useMemo, useCallback, useEffect } from "react"
import produce from 'immer'
function Grid() {
  const squareGrid = {
    rows: 50,
    cols: 50
  }

  const initialGrid = () => {
    const result = []
    Array
      .from({ length: squareGrid.rows })
      .forEach((_item, col) => {
        return Array
          .from({ length: squareGrid.cols })
          .forEach((_item, row) => {
            return result.push({ row, col, active: false })
          })

      })
    return result
  }

  const [running, setRunning] = useState(false)
  const [grid, setGrid] = useState(initialGrid())
  const [generation, setgeneration] = useState(0)

  const findCell = (array, cellRow, cellCol) => {
    return array.findIndex((item) => item.row === cellRow && item.col === cellCol)
  }

  const toggleCellState = (row, col) => {
    setGrid(produce(draft=>{
      const cell = findCell(draft, row, col)
      cell.active = !cell.active
    }))
    // const newGrid = [...grid]
    // const cell = findCell(newGrid, row, col)
    // newGrid.splice(cell, 1, { row: newGrid[cell].row, col: newGrid[cell].col, active: !newGrid[cell].active })
    // setGrid(newGrid)
  }

  const toggleGame = () => {
    if (running) {
      setRunning(false)
    } else {
      setRunning(true)
      iterate()
    }
  }

  const randomize = () => {
    setGrid(produce(draft =>
      draft.forEach(item => item.active = Math.random() > 0.5)
      ))
  }

  const iterate = useCallback(() => {
    if (!running) return
    const findNeighbours = (row, col) => {
      let numNeighbours = 0
      const neighbours = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]
      neighbours.forEach(cell => {
        const cellId = grid[findCell(grid, row + cell[0], col + cell[1])]
        if (cellId?.active) numNeighbours++
      })
      return numNeighbours
    }

    console.time('iterate')
    const newGrid = produce(draft => {
      draft.forEach(item => {
        const numNeighbours = findNeighbours(item.row, item.col)
        item.active = item.active ? numNeighbours === 2 || numNeighbours === 3 : numNeighbours === 3
      })
    })
    // const newGrid = grid.map(cell => {
    //   const numNeighbours = findNeighbours(cell.row, cell.col)
    //   const isActive = cell.active ? numNeighbours === 2 || numNeighbours === 3 : numNeighbours === 3
    //   return { row: cell.row, col: cell.col, active: isActive }
    // })
    console.timeEnd('iterate')
    setGrid(newGrid)
    setgeneration(generation + 1)
  }, [grid, running, generation])

  useEffect(() => {
    const intervalID = setInterval(() => {
      iterate()
    }, 0);
    return () => {
      clearInterval(intervalID)
    }
  }, [grid, iterate])

  return (
    <>
      <button onClick={() => toggleGame()}>{running ? "running" : "start"}</button>{generation}
      <button onClick={() => randomize()}>Random</button>
      <div className="grid">
        {grid.map((cell, index) => <Square key={index} col={cell.col} row={cell.row} active={cell.active} cell={cell} setActive={toggleCellState} />)}
      </div>
    </>
  )
}
export default Grid

function Square({cell, setActive }) {
  return (
    <div className={cell.active ? 'square active' : 'square'} onClick={() => setActive(cell.row, cell.col)}></div>
  )
}

// function Square({ row, col, active, setActive }) {
//   const memodSquare = useMemo(() => {
//     return (
//       <div className={active ? 'square active' : 'square'} onClick={() => setActive(row, col)}></div>
//     )
//   }, [row, col, active, setActive])
//   return memodSquare
// }

//try use memo or use callback
// immutable state