import { Container } from "./hostConfig";
import {FiberNode, FiberRootNode} from './fiber'
import {HostRoot} from './workTags'

import {
    initializeUpdateQueue
} from './updateQueue'

export function createContainer(container:Container) {
    const hostRootFiber = new FiberNode(HostRoot, {}, null)
    const root = new FiberRootNode(container, hostRootFiber)
    initializeUpdateQueue(hostRootFiber)
    return root
}

export function updateContainer() {

}