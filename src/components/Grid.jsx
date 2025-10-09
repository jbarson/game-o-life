import { useState, useEffect } from "react"
import { useGameOfLife } from "../hooks/useGameOfLife"
import { usePerformanceStats } from "../hooks/usePerformanceStats"
import { useCanvasDrawing } from "../hooks/useCanvasDrawing"
import { useAnimationLoop } from "../hooks/useAnimationLoop"

function Grid() {
  const squareGrid = {
    rows: 50,
    cols: 50
  }

  // Game of Life simulation
  const {
    grid,
    generation,
    running,
    showStableModal,
    stableGen,
    toggleCellState,
    randomize,
    toggleGame,
    step,
    setShowStableModal
  } = useGameOfLife(squareGrid.rows, squareGrid.cols)

  // Performance monitoring
  const {
    perfStats,
    liveStats,
    recordDuration,
    updateFps,
    calculateFps
  } = usePerformanceStats()

  // Canvas drawing
  const {
    canvasRef,
    draw,
    onCanvasClick
  } = useCanvasDrawing(grid)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Manage drawer-open class for non-occluding toggle position
  useEffect(() => {
    const root = document.documentElement
    if (drawerOpen) root.classList.add('drawer-open')
    else root.classList.remove('drawer-open')
  }, [drawerOpen])

  // Animation loop with performance tracking
  const handleStep = () => step(recordDuration)
  const handleFpsUpdate = (dt, ts) => {
    calculateFps(dt)
    updateFps(ts)
  }

  useAnimationLoop(running, handleStep, draw, handleFpsUpdate)

  // Canvas click handler
  const handleCanvasClick = (e) => onCanvasClick(e, toggleCellState)

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
        <canvas ref={canvasRef} onClick={handleCanvasClick} data-testid="grid-canvas" />
      </div>
    </>
  )
}

export default Grid