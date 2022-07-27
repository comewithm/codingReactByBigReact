import { ReactElement } from "../../shared/ReactTypes";
import { FiberNode } from "./fiber";
import { HostComponent, HostRoot } from "./workTags";
import {mountChildFibers, reconcileChildFibers} from './childFiber'
import {processUpdateQueue} from './updateQueue'

export const beginWork = (workInProgress: FiberNode) => {
    switch(workInProgress.tag) {
        case HostRoot:
            return updateHostRoot(workInProgress)
        case HostComponent:
            return updateHostComponent(workInProgress)
        default:
            console.error("beginWork 未处理...")
            return null
    }
}

function updateHostRoot(workInProgress: FiberNode) {
    processUpdateQueue(workInProgress)
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