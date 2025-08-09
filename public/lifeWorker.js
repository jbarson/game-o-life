/* Game of Life Worker - classic script */
/* eslint-disable no-restricted-globals */

const NEIGHBOR_OFFSETS = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1], /*self*/[0, 1],
  [1, -1], [1, 0], [1, 1],
]

function findNeighbours(grid, row, col) {
  let num = 0
  const rows = grid.length
  const cols = grid[0].length
  for (let i = 0; i < NEIGHBOR_OFFSETS.length; i++) {
    const dx = NEIGHBOR_OFFSETS[i][0]
    const dy = NEIGHBOR_OFFSETS[i][1]
    const r = row + dx
    const c = col + dy
    if (r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c]) num++
  }
  return num
}

onmessage = function (e) {
  const grid = e.data
  const rows = grid.length
  const cols = grid[0].length
  const next = Array.from({ length: rows }, () => Array(cols))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const n = findNeighbours(grid, r, c)
      next[r][c] = grid[r][c] ? (n === 2 || n === 3) : (n === 3)
    }
  }
  postMessage(next)
}
