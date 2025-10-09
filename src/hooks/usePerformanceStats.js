import { useState, useRef, useCallback } from 'react'

export const usePerformanceStats = () => {
  const [perfStats, setPerfStats] = useState(null)
  const [liveStats, setLiveStats] = useState({ fps: null, computeEwma: null })
  
  const timesRef = useRef([])
  const framesInBatchRef = useRef(0)
  const fpsEwmaRef = useRef(0)
  const computeEwmaRef = useRef(0)
  const lastFpsUiRef = useRef(0)

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

  // Update FPS stats
  const updateFps = useCallback((ts) => {
    if (!lastFpsUiRef.current) lastFpsUiRef.current = ts
    if (ts - lastFpsUiRef.current > 250) {
      setLiveStats(s => ({ ...s, fps: fpsEwmaRef.current }))
      lastFpsUiRef.current = ts
    }
  }, [])

  // Calculate FPS EWMA
  const calculateFps = useCallback((dt) => {
    if (dt > 0) {
      const fps = 1000 / dt
      const alpha = 0.1
      const prev = fpsEwmaRef.current || fps
      fpsEwmaRef.current = prev + alpha * (fps - prev)
    }
  }, [])

  return {
    perfStats,
    liveStats,
    recordDuration,
    updateFps,
    calculateFps,
    fpsEwmaRef
  }
}
