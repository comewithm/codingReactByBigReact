import { ReactElement } from '../../shared/ReactTypes';
import { Container } from './hostConfig';

import { HostRoot } from './workTags';
import { FiberNode, FiberRootNode } from './fiber';

import {
	initializeUpdateQueue,
	createUpdate,
	enqueueUpdate
} from './updateQueue';

import { scheduleUpdateOnFiber } from './workLoop';

export function createContainer(container: Container) {
	const hostRootFiber = new FiberNode(HostRoot, {}, null);
	const root = new FiberRootNode(container, hostRootFiber);
	initializeUpdateQueue(hostRootFiber);
	return root;
}

export function updateContainer(element: ReactElement, root: FiberRootNode) {
	const hostRootFiber = root.current;
	const update = createUpdate(element);
	enqueueUpdate(hostRootFiber, update);
	scheduleUpdateOnFiber(hostRootFiber);
}
