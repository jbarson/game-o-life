import { useRef, useCallback, useEffect, useState } from 'react'

export const useCanvasDrawing = (grid, cellSize = 10, cellGap = 1) => {
  const canvasRef = useRef(null)
  const [actualCellSize, setActualCellSize] = useState(cellSize)
  const [actualCellGap, setActualCellGap] = useState(cellGap)

  // Extract grid dimensions to avoid complex expressions in dependency arrays
  const gridRows = grid.length
  const gridCols = grid[0]?.length || 0

  // Sync CSS variables for sizes and grid dims
  useEffect(() => {
    const root = document.documentElement
    // read sizes
    const csRaw = getComputedStyle(root).getPropertyValue('--cell-size').trim()
    const cgRaw = getComputedStyle(root).getPropertyValue('--cell-gap').trim()
    const cs = parseFloat(csRaw || '10') || 10
    const cg = parseFloat(cgRaw || '1') || 1
    setActualCellSize(cs)
    setActualCellGap(cg)
    // set grid dims for CSS grid (if used)
    root.style.setProperty('--grid-rows', String(gridRows))
    root.style.setProperty('--grid-cols', String(gridCols))
  }, [gridRows, gridCols])

  // Draw current grid state to canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const rows = grid.length
    const cols = grid[0]?.length || 0
    const pitchX = actualCellSize + actualCellGap
    const pitchY = actualCellSize + actualCellGap
    const width = cols * actualCellSize + (cols - 1) * actualCellGap
    const height = rows * actualCellSize + (rows - 1) * actualCellGap
    
    // ensure canvas size
    if (canvas.width !== width) canvas.width = width
    if (canvas.height !== height) canvas.height = height
    
    // background as gridline color (#eee)
    ctx.fillStyle = '#eee'
    ctx.fillRect(0, 0, width, height)
    
    // draw cells (inactive white, active black)
    for (let r = 0; r < rows; r++) {
      const row = grid[r]
      for (let c = 0; c < cols; c++) {
        ctx.fillStyle = row[c] ? '#000' : '#fff'
        ctx.fillRect(c * pitchX, r * pitchY, actualCellSize, actualCellSize)
      }
    }
  }, [grid, actualCellSize, actualCellGap])

  // Toggle by clicking on canvas
  const onCanvasClick = useCallback((e, onCellToggle) => {
    const canvas = canvasRef.current
    if (!canvas || !onCellToggle) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const pitchX = actualCellSize + actualCellGap
    const pitchY = actualCellSize + actualCellGap
    const col = Math.floor(x / pitchX)
    const row = Math.floor(y / pitchY)
    
    // ignore clicks in the gap between cells
    const inCellX = (x % pitchX) < actualCellSize
    const inCellY = (y % pitchY) < actualCellSize
    if (!inCellX || !inCellY) return
    
    if (row >= 0 && row < gridRows && col >= 0 && col < gridCols) {
      onCellToggle({ row, col })
    }
  }, [gridRows, gridCols, actualCellSize, actualCellGap])

  // Redraw when grid changes
  useEffect(() => {
    draw()
  }, [draw])

  return {
    canvasRef,
    draw,
    onCanvasClick,
    actualCellSize,
    actualCellGap
  }
}
