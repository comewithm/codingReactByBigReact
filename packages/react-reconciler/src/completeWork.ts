import { FiberNode } from "./fiber";
import { 
    FunctionComponent, 
    HostComponent, 
    HostRoot, 
    HostText 
} from "./workTags";
import {
    appendInitialChild, 
    createInstance, 
    Instance, 
    createTextInstance
} from './hostConfig'
import { NoFlags, Update } from "./fiberTags";
import {updateFiberProps} from 'react-dom/src/SyntheticEvent'

const appendAllChildren = (parent: Instance, workInProgress: FiberNode) => {
    // 遍历workInProgress所有子孙 DOM元素, 依次挂载
    let node = workInProgress.child
    while(node !== null) {
        if(node.tag === HostComponent) {
            appendInitialChild(parent, node.stateNode)
        } else if(node.child !== null) {
            node.child.return = node
            node = node.child
            continue
        }

        if(node === workInProgress) {
            return
        }

        while(node.sibling === null) {
            if(node.return === null || node.return === workInProgress) {
                return
            }
            node = node.return
        }
        node.sibling.return = node.return
        node = node.sibling
    }
}

const bubbleProperties = (completeWork: FiberNode) => {
    let subtreeFlags = NoFlags
    let child = completeWork.child
    while(child !== null) {
        subtreeFlags |= child.subtreeFlags
        subtreeFlags |= child.flags

        child.return = completeWork
        child = child.sibling
    }
    completeWork.subtreeFlags |= subtreeFlags
}

function markUpdate(fiber: FiberNode) {
    fiber.flags |= Update
}

export const completeWork = (workInProgress: FiberNode) => {
    if(__LOG__) {
        console.log(`complete流程:${workInProgress.type}`);
    }
    const newProps = workInProgress.pendingProps
    const current = workInProgress.alternate

    switch(workInProgress.tag) {
        case HostComponent:
            if(current !== null && workInProgress.stateNode) {
                // 更新
                // TODO 更新元素属性
                // 不应该在此处调用updateFiberProps，应该跟着判断属性变化的逻辑，
                // 在这里打flag，再在commitWork中更新fiberProps, 这个过程留到【属性变化】
                // 相关需求一起做
                updateFiberProps(
                    workInProgress.stateNode,
                    newProps
                )
            } else {
                // 初始化DOM
                const instance = createInstance(workInProgress.type, newProps)
                // 挂载DOM
                appendAllChildren(instance, workInProgress)
                workInProgress.stateNode = instance
    
                // 初始化元素属性 TODO
            }

            // 冒泡flag
            bubbleProperties(workInProgress)
            return null
        case HostRoot:
            bubbleProperties(workInProgress)
            return null
        case HostText:
            if(current !== null && workInProgress.stateNode) {
                // 更新
                const oldText = current.memoizedProps?.content
                const newText = newProps.content
                if(oldText !== newText) {
                    markUpdate(workInProgress)
                }
            } else {
                // 初始化DOM
                const textInstance = createTextInstance(newProps.content)
                workInProgress.stateNode = textInstance
            }
            // 冒泡flag
            bubbleProperties(workInProgress)
            return null
        case FunctionComponent:
            bubbleProperties(workInProgress)
            return null
        default:
            console.error('completeWork未定义的fiber.flag', workInProgress)
            return null
    }
}

