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