import { Container } from "./hostConfig";
import {FiberNode, FiberRootNode} from './fiber'
import {HostRoot} from './workTags'
import {scheduleUpdateOnFiber} from './workLoop'
import {
    createUpdate,
    initializeUpdateQueue,
    enqueueUpdate
} from './updateQueue'
import { ReactElement } from "../../shared/ReactTypes";

export function createContainer(container:Container) {
    const hostRootFiber = new FiberNode(HostRoot, {}, null)
    const root = new FiberRootNode(container, hostRootFiber)
    initializeUpdateQueue(hostRootFiber)
    return root
}

export function updateContainer(element:ReactElement, root:FiberRootNode) {
    const hostRootFiber = root.current
    const update = createUpdate(element)
    enqueueUpdate(hostRootFiber, update)
    scheduleUpdateOnFiber(hostRootFiber)
}