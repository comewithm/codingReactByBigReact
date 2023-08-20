import { Weakable } from 'shared/ReactTypes';
import { FiberRootNode } from './fiber';
import { Lane, markRootPinged } from './fiberLanes';
import { getSuspenseHandler } from './suspenseContext';
import { ShouldCapture } from './fiberFlags';
import { ensureRootIsScheduled, markRootUpdated } from './workLoop';

export function throwException(root: FiberRootNode, value: any, lane: Lane) {
	if (
		value !== null &&
		typeof value !== 'object' &&
		typeof value.then === 'function'
	) {
		const weakable: Weakable<any> = value;

		const suspenseBoundary = getSuspenseHandler();
		if (suspenseBoundary) {
			suspenseBoundary.flags |= ShouldCapture;
		}

		attachPingListener(root, weakable, lane);
	}
}

function attachPingListener(
	root: FiberRootNode,
	weakable: Weakable<any>,
	lane: Lane
) {
	let pingCache = root.pingCache;
	let threadIDs: Set<Lane> | undefined;

	// WeakMap {weakable: Set[lane1, lane2, ...]}
	if (pingCache === null) {
		threadIDs = new Set<Lane>();
		pingCache = root.pingCache = new WeakMap<Weakable<any>, Set<Lane>>();
		pingCache.set(weakable, threadIDs);
	} else {
		threadIDs = pingCache.get(weakable);
		if (threadIDs === undefined) {
			threadIDs = new Set<Lane>();
			pingCache.set(weakable, threadIDs);
		}
	}

	if (!threadIDs.has(lane)) {
		// 第一次进入
		threadIDs.add(lane);

		function ping() {
			if (pingCache !== null) {
				pingCache.delete(weakable);
			}
			markRootUpdated(root, lane);
			markRootPinged(root, lane);
			ensureRootIsScheduled(root);
		}

		weakable.then(ping, ping);
	}
}
