import currentDispatcher, { Dispatcher, resolveDispatcher } from "./src/currentDispatcher"

import {jsx, isValidElement as isValidElementFn} from './src/jsx'

export const createElement = jsx
export const isValidElement = isValidElementFn

export const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher() as Dispatcher
	return dispatcher.useState(initialState)
}

export const useEffect: Dispatcher['useEffect'] = (create, deps) => {
    const dispatcher = resolveDispatcher() as Dispatcher
    return dispatcher.useEffect(create, deps)
}

export const __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher
}