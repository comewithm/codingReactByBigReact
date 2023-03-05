import { Action } from "shared/ReactTypes"

export type Dispatch<State> = (action: Action<State>) => void

export type Dispatcher = {
    useState: <T>(initialState:(() => T | T)) => [T, Dispatch<T>],
    useEffect: (callback: (() => void) | void, deps: any[] | void) => void
}

const currentDispatcher: {current: Dispatcher | null} = {
    current: null
}

export const resolveDispatcher = () => {
    const dispatcher = currentDispatcher.current

    if(dispatcher === null) {
        console.log('resolve dispatcher 时dispatcher不存在')
    }

    return dispatcher
}

export default currentDispatcher