// export const REACT_ELEMENT_TYPE = Symbol.for('react.element');

const supportSymbol = typeof Symbol === 'function' && Symbol.for

export const REACT_ELEMENT_TYPE = supportSymbol ? Symbol.for('react.element') : 0xeac7