import { Container } from "./hostConfig";
import {FiberNode, FiberRootNode} from './fiber'
import {HostRoot} from './workTags'
import {scheduleUpdateOnFiber} from './workLoop'
import {
    createUpdate,
    createUpdateQueue,
    enqueueUpdate,
    UpdateQueue
} from './updateQueue'
import { ReactElement } from "shared/ReactTypes";
import { SyncLane } from "./fiberLanes";

export function createContainer(container:Container) {
    const hostRootFiber = new FiberNode(HostRoot, {}, null)
    const root = new FiberRootNode(container, hostRootFiber)
    hostRootFiber.updateQueue = createUpdateQueue<ReactElement>()
    return root
}

export function updateContainer(element:ReactElement, root:FiberRootNode) {
    const hostRootFiber = root.current
    const rootRenderPriority = SyncLane
    const update = createUpdate<ReactElement>(element, rootRenderPriority);
    enqueueUpdate(
        hostRootFiber.updateQueue as UpdateQueue<ReactElement>, 
        update
    );
    scheduleUpdateOnFiber(hostRootFiber, rootRenderPriority)
    
    return element
}