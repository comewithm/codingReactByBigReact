import { ReactElement } from "shared/ReactTypes";
import { FiberNode } from "./fiber";
import { FunctionComponent, HostComponent, HostRoot, HostText } from "./workTags";
import {mountChildFibers, reconcileChildFibers} from './childFiber'
import {processUpdateQueue, UpdateQueue} from './updateQueue'
import { renderWithHooks } from "./fiberHooks";

export const beginWork = (workInProgress: FiberNode) => {
    if(__DEV__) {
        console.log(`beginWork流程:${workInProgress.type}`)
    }
    switch(workInProgress.tag) {
        case HostRoot:
            return updateHostRoot(workInProgress)
        case HostComponent:
            return updateHostComponent(workInProgress)
        case HostText:
            return null
        case FunctionComponent:
            return updateFunctionComponent(workInProgress)
        default:
            console.error("beginWork 未处理...")
            return null
    }
}

function updateHostRoot(workInProgress: FiberNode) {
    const baseState = workInProgress.memoizedState
    const updateQueue = workInProgress.updateQueue as UpdateQueue<Element>

    workInProgress.memoizedState = processUpdateQueue(
        baseState,
        updateQueue,
        workInProgress
    )
    const nextChildren = workInProgress.memoizedState
    reconcileChildren(workInProgress, nextChildren)

    return workInProgress.child
}

function updateHostComponent(workInProgress: FiberNode) {
    // 根据element创建fiberNode
    const nextProps = workInProgress.pendingProps
    const nextChildren = nextProps.children
    reconcileChildren(workInProgress, nextChildren)

    return workInProgress.child
}

function updateFunctionComponent(workInProgress: FiberNode){
    const nextChildren = renderWithHooks(workInProgress)
    reconcileChildren(workInProgress, nextChildren)
    
    return workInProgress.child
}

function reconcileChildren(workInProgress:FiberNode, children?:ReactElement) {
    const current = workInProgress.alternate
    if(current !== null) {
        // update
        workInProgress.child = reconcileChildFibers(
            workInProgress,
            current.child,
            children
        )
    } else {
        // mount
        workInProgress.child = mountChildFibers(
            workInProgress,
            null,
            children
        )
    }
} 