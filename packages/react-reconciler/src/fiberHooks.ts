import { FiberNode } from "./fiber";
import {Dispatch, Dispatcher} from 'react/src/currentDispatcher'
import sharedInternals from 'shared/internals'
import { createUpdate, createUpdateQueue, enqueueUpdate, UpdateQueue } from "./updateQueue";
import { Action } from "shared/ReactTypes";
import { scheduleUpdateOnFiber } from "./workLoop";

interface Hook {
    memoizedState: any
    // 对于State, 保存update相关数据
    updateQueue: unknown
    next: Hook | null
}

const {currentDispatcher} = sharedInternals
let currentlyRenderingFiber: FiberNode | null = null
let workInProgressHook: Hook | null = null

export const renderWithHooks = (workInProgress: FiberNode) => {
    currentlyRenderingFiber = workInProgress
    // 重置
    workInProgress.memoizedState = null
    workInProgress.memoizedProps = null

    const current = workInProgress.alternate
    if(current !== null) {
        console.log('还未实现update时renderWithHooks')
    } else {
        currentDispatcher.current = HooksDispatcherOnMount
    }

    const Component = workInProgress.type
    const props = workInProgress.pendingProps
    const children = Component(props)

    // 重置
    currentlyRenderingFiber = null
    workInProgressHook = null

    return children
}

const HooksDispatcherOnMount:Dispatcher = {
    useState: mountState
}

function mountState<State>(
    initialState:(() => State) | State
):[State, Dispatch<State>]{
    const hook = mountWorkInProgressHook()
    let memoizedState: State
    if(initialState instanceof Function) {
        memoizedState = initialState()
    } else {
        memoizedState = initialState
    }
    hook.memoizedState = memoizedState

    if(currentlyRenderingFiber === null) {
        console.error('mountState时currentlyRenderingFiber不存在')
    }
    const queue = createUpdateQueue<State>()
    hook.updateQueue = queue

    return [
        memoizedState,
        // @ts-ignore
        dispatchSetState.bind(
            null,
            currentlyRenderingFiber,
            queue
        )
    ]
}

function dispatchSetState<State>(
    fiber: FiberNode,
    updateQueue: UpdateQueue<State>,
    action: Action<State>
) {
    const update = createUpdate(action)
    enqueueUpdate(updateQueue, update)
    scheduleUpdateOnFiber(fiber)
}


function mountWorkInProgressHook(): Hook {
    const hook: Hook = {
        memoizedState: null,
        updateQueue: null,
        next: null
    }

    if(workInProgressHook === null) {
        if(currentlyRenderingFiber === null) {
            console.error('mountWorkInProgressHook时currentlyRenderingFiber未定义')
        } else {
            currentlyRenderingFiber.memoizedState = workInProgressHook = hook
        }
    } else {
        workInProgressHook = workInProgressHook.next = hook
    }

    return workInProgressHook as Hook
}