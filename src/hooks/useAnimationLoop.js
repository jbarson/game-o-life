import { useRef, useCallback, useEffect } from 'react'

const SIMULATION_INTERVAL = 100 // milliseconds between generations

export const useAnimationLoop = (running, onStep, onDraw, onFpsUpdate) => {
  const rafRef = useRef(null)
  const lastTimeRef = useRef(0)
  const accRef = useRef(0)

  // Animation loop driven by requestAnimationFrame
  const animate = useCallback((ts) => {
    if (!running) return
    
    if (!lastTimeRef.current) lastTimeRef.current = ts
    const dt = ts - lastTimeRef.current
    lastTimeRef.current = ts
    
    // Update FPS if callback provided
    if (onFpsUpdate) onFpsUpdate(dt, ts)
    
    accRef.current += dt
    if (accRef.current >= SIMULATION_INTERVAL) {
      // step once per interval to avoid piling up
      if (onStep) onStep()
      accRef.current -= SIMULATION_INTERVAL
    }
    
    if (onDraw) onDraw()
    rafRef.current = requestAnimationFrame(animate)
  }, [running, onStep, onDraw, onFpsUpdate])

  // Start/stop loop when running changes
  useEffect(() => {
    if (running) {
      lastTimeRef.current = 0
      accRef.current = 0
      rafRef.current = requestAnimationFrame(animate)
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [running, animate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  return {
    rafRef,
    lastTimeRef,
    accRef
  }
}
