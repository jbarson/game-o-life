import { memo } from 'react'
import PropTypes from 'prop-types'

const Square = memo(({ row, col, active, setActive }) => {
  return (
    <div
      role="gridcell"
      aria-selected={active}
      data-testid="square"
      className={active ? "square active" : "square"}
      onClick={() => setActive({ row, col })}
    />
  )
})

Square.propTypes = {
  row: PropTypes.number.isRequired,
  col: PropTypes.number.isRequired,
  active: PropTypes.bool.isRequired,
  setActive: PropTypes.func.isRequired,
}

export default Square
