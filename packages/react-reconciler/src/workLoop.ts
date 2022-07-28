import { 
    FiberNode, 
    FiberRootNode,
    createWorkInProgress
} from "./fiber";
import { HostRoot } from "./workTags";
import {beginWork} from './beginWork'
import {completeWork} from './completeWork'
import { NoFlags, MutationMask } from "./fiberTags";
import {commitMutationEffects} from './commitWork'

let workInProgress: FiberNode | null = null;

export function scheduleUpdateOnFiber(fiber:FiberNode){
    const root = markUpdateLaneFromFiberToRoot(fiber)

    if(root === null){
        return
    }

    ensureRootIsScheduled(root)
}

function markUpdateLaneFromFiberToRoot(fiber:FiberNode) {
    let node = fiber
    let parent = node.return

    while(parent !== null){
        node = parent
        parent = node.return
    }
    if(node.tag === HostRoot) {
        return node.stateNode
    }

    return null
}

function ensureRootIsScheduled(root:FiberRootNode) {
    // 一些调度行为
    performSyncWorkOnRoot(root)
}

function performSyncWorkOnRoot(root: FiberRootNode) {
    // 初始化操作
    prepareFreshStack(root)

    // render阶段具体操作
    do {
        try {
            workLoop()
            break
        } catch (e) {
            console.error('workLoop error',e)
            workInProgress = null
        }
    } while(true);

    if(workInProgress !== null) {
        console.error('render阶段结束 wip不为null')
    }

    const finishedWork = root.current.alternate
    root.finishedWork = finishedWork

    // commit阶段操作
    commitRoot(root)
}

function prepareFreshStack(root: FiberRootNode) {
    workInProgress = createWorkInProgress(root.current, {})
}

function workLoop(){
    while(workInProgress !== null) {
        performUnitOfWork(workInProgress)
    }
}

function performUnitOfWork(fiber: FiberNode) {
    const next = beginWork(fiber)

    if(next === null) {
        completeUnitOfWork(fiber)
    } else {
        workInProgress = next
    }
}

function completeUnitOfWork(fiber: FiberNode) {
    let node: FiberNode | null = fiber

    do {
        const next = completeWork(node)

        if(next !== null) {
            workInProgress = next
            return
        }

        const sibling = node.sibling
        if(sibling) {
            workInProgress = next
            return
        }

        node = node.return
        workInProgress = node

    } while(node !== null)
}


function commitRoot(root:FiberRootNode) {
    const finishedWork = root.finishedWork

    if(finishedWork === null) {
        return
    }
    // 重置
    root.finishedWork = null

    const subtreeHasEffect = (finishedWork.subtreeFlags & MutationMask) !== NoFlags

    const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags

    if(subtreeHasEffect || rootHasEffect) {
        // 有副作用要执行

        // 阶段1/3: beforeMutation

        // 阶段2/3: Mutation
        commitMutationEffects(finishedWork)

        // Fiber Tree切换
        root.current = finishedWork

        // 阶段3/3: Layout
    } else {
        // Fiber Tree切换
        root.current = finishedWork
    }
}