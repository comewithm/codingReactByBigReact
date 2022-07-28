import { FiberNode } from "./fiber";
import {Dispatcher, Dispatch} from 'react/src/currentDispatcher'

import sharedInternals from '../../shared/internals'


let currentlyRenderingFiber: FiberNode | null = null

const {currentDispatcher} = sharedInternals

export const renderWithHooks = (workInProgress:FiberNode) => {
    currentlyRenderingFiber = workInProgress
    // 重置
    workInProgress.memoizedState = null
    workInProgress.updateQueue = null

    const current = workInProgress.alternate

    if(current !== null) {
        console.log('还未实现update时renderWithHooks')
    } else {
        currentDispatcher.current = 
    }
}


const HooksDispatcherOnMount: Dispatcher = {
    useState: mountState
}

function mountState<State>(){
    
}