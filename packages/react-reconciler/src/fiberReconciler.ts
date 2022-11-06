import { ReactElement } from 'shared/ReactTypes';
import { Container } from './hostConfig';

import { HostRoot } from './workTags';
import { FiberNode, FiberRootNode } from './fiber';

import {
	createUpdate,
	enqueueUpdate,
	createUpdateQueue,
	UpdateQueue
} from './updateQueue';

import { scheduleUpdateOnFiber } from './workLoop';

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	hostRootFiber.updateQueue = createUpdateQueue<ReactElement>()
	return root;
}

export function updateContainer(element: ReactElement, root: FiberRootNode) {
	const hostRootFiber = root.current;
	const update = createUpdate<ReactElement>(element);
	enqueueUpdate(hostRootFiber.updateQueue as UpdateQueue<ReactElement>, update);
	scheduleUpdateOnFiber(hostRootFiber);
}
