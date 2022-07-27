import { FiberNode } from "./fiber"

type UpdateAction = any

export interface Update {
    action: UpdateAction
}

export interface UpdateQueue {
    shared: {
        pending: Update | null
    }
}

// 初始化
export const initializeUpdateQueue = (fiber:FiberNode) => {
    fiber.updateQueue = {
        shared: {
            pending: null
        }
    }
}

// 创建
export const createUpdate = (action: UpdateAction) => {
    return {
        action
    }
}

// 插入
export const enqueueUpdate = (fiber: FiberNode, update: Update) => {
    const updateQueue = fiber.updateQueue
    if(updateQueue !== null) {
        updateQueue.shared.pending = update
    }
}

// TODO:消费???
export const processUpdateQueue = (fiber:FiberNode) => {
    const updateQueue = fiber.updateQueue
    let newState = null
    if(updateQueue) {
        const pending = updateQueue.shared.pending
        const pendingUpdate = pending
        updateQueue.shared.pending = null

        
    }
}