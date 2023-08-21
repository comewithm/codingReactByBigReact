import { ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	OffscreenProps,
	createFiberFromFragment,
	createFiberFromOffscreen,
	createWorkInProgress
} from './fiber';
import { UpdateQueue, processUpdateQueue } from './updateQueue';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	MemoComponent,
	OffscreenComponent,
	SuspenseComponent
} from './workTags';
import {
	cloneChildFiber,
	mountChildFibers,
	reconcileChildFibers
} from './childFiber';
import { bailoutHook, renderWithHooks } from './fiberHook';
import { Lane, NoLanes, includeSomeLanes } from './fiberLanes';
import {
	prepareToReadContext,
	propagateContextChange,
	pushProvider
} from './fiberContext';
import { ChildDeletion, DidCapture, NoFlags, Placement } from './fiberFlags';
import { pushSuspenseHandler } from './suspenseContext';
import { shallowEqual } from 'shared/shallowEquals';

let didReceiveUpdate = false;

export function markWipReceivedUpdate() {
	didReceiveUpdate = true;
}

export const beginWork = (wip: FiberNode, renderLane: Lane) => {
	// bailout策略
	didReceiveUpdate = false;

	const current = wip.alternate;

	if (current !== null) {
		const oldProps = current.memoizedProps;
		const newProps = wip.pendingProps;
		// 四要素 props type
		if (oldProps !== newProps || current.type !== wip.type) {
			didReceiveUpdate = true;
		} else {
			// state context
			const hasScheduleStateOrContext = checkScheduleUpdateOrContext(
				current,
				renderLane
			);

			if (!hasScheduleStateOrContext) {
				// 四要素 state context
				// 命中bailout
				didReceiveUpdate = false;

				switch (wip.tag) {
					case ContextProvider:
						const newValue = wip.memoizedProps.value;
						const context = wip.type._context;
						pushProvider(context, newValue);
						break;
					// TODO Suspense
				}

				return bailoutOnAlreadyFinishedWork(wip, renderLane);
			}
		}
	}
	wip.lanes = NoLanes;

	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;
		case FunctionComponent:
			return updateFunctionComponent(wip, wip.type, renderLane);
		case Fragment:
			return updateFragment(wip);
		case ContextProvider:
			return updateContextProvider(wip, renderLane);
		case SuspenseComponent:
			return updateSuspenseComponent(wip);
		case OffscreenComponent:
			return updateOffscreenComponent(wip);
		case MemoComponent:
			return updateMemoComponent(wip, renderLane);
		default:
			if (__DEV__) {
				console.warn('beginWork未实现的类型');
			}
			break;
	}
	return null;
};

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memoizedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	updateQueue.shared.pending = null;

	const prevChildren = wip.memoizedState;
	const { memoizedState } = processUpdateQueue(baseState, pending, renderLane);
	wip.memoizedState = memoizedState;

	const current = wip.alternate;
	// 考虑RootDidNotComplete的情况，需要复用memoizedState
	if (current !== null) {
		if (!current.memoizedState) {
			current.memoizedState = memoizedState;
		}
	}

	const nextChildren = wip.memoizedState;

	if (prevChildren === nextChildren) {
		return bailoutOnAlreadyFinishedWork(wip, renderLane);
	}

	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateFunctionComponent(
	wip: FiberNode,
	Component: FiberNode['type'],
	renderLane: Lane
) {
	prepareToReadContext(wip, renderLane);
	// render
	const nextChildren = renderWithHooks(wip, Component, renderLane);

	const current = wip.alternate;
	if (current !== null && !didReceiveUpdate) {
		bailoutHook(wip, renderLane);
		return bailoutOnAlreadyFinishedWork(wip, renderLane);
	}

	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateFragment(wip: FiberNode) {
	const nextChildren = wip.pendingProps;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateContextProvider(wip: FiberNode, renderLane: Lane) {
	const providerType = wip.type;
	const context = providerType._context;

	const newProps = wip.pendingProps;
	const oldProps = wip.memoizedProps;
	const newValue = newProps.value;

	if (oldProps !== null) {
		const oldValue = oldProps.value;
		if (
			Object.is(oldValue, newValue) &&
			oldProps.children === newProps.children
		) {
			return bailoutOnAlreadyFinishedWork(wip, renderLane);
		} else {
			propagateContextChange(wip, context, renderLane);
		}
	}

	const nextChildren = newProps.children;
	reconcileChildren(wip, nextChildren);
	return wip.child;
}

function updateOffscreenComponent(workInProgress: FiberNode) {
	const nextProps = workInProgress.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(workInProgress, nextChildren);
	return workInProgress.child;
}

function updateSuspenseComponent(workInProgress: FiberNode) {
	const current = workInProgress.alternate;
	const nextProps = workInProgress.pendingProps;

	let showFallback = false;

	const didSuspend = (workInProgress.flags & DidCapture) !== NoFlags;

	if (didSuspend) {
		showFallback = true;
		workInProgress.flags &= ~DidCapture;
	}

	const nextPrimaryChildren = nextProps.children;
	const nextFallbackChildren = nextProps.fallback;

	pushSuspenseHandler(workInProgress);

	if (current === null) {
		if (showFallback) {
			return mountSuspenseFallbackChildren(
				workInProgress,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			return mountSuspensePrimaryChildren(workInProgress, nextPrimaryChildren);
		}
	} else {
		if (showFallback) {
			return updateSuspenseFallbackChildren(
				workInProgress,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			return updateSuspensePrimaryChildren(workInProgress, nextPrimaryChildren);
		}
	}
}

function mountSuspenseFallbackChildren(
	workInProgress: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const primaryChildProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};

	const primaryChildFragment = createFiberFromOffscreen(primaryChildProps);
	const fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);
	// 父组件Suspense已经mount, 所以需要fallback标记Placement
	fallbackChildFragment.flags |= Placement;

	primaryChildFragment.return = workInProgress;
	fallbackChildFragment.return = workInProgress;
	primaryChildFragment.sibling = fallbackChildFragment;
	workInProgress.child = primaryChildFragment;

	return fallbackChildFragment;
}

function mountSuspensePrimaryChildren(
	workInProgress: FiberNode,
	primaryChildren: any
) {
	const primaryChildProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	};
	const primaryChildFragment = createFiberFromOffscreen(primaryChildProps);
	primaryChildFragment.return = workInProgress;
	workInProgress.child = primaryChildFragment;

	return primaryChildFragment;
}

function updateSuspenseFallbackChildren(
	workInProgress: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const current = workInProgress.alternate as FiberNode;
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildProps: OffscreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};

	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildProps
	);

	let fallbackChildFragment;

	if (currentFallbackChildFragment !== null) {
		// 可以复用
		fallbackChildFragment = createWorkInProgress(
			currentFallbackChildFragment,
			fallbackChildren
		);
	} else {
		fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);
	}

	fallbackChildFragment.return = workInProgress;
	primaryChildFragment.return = workInProgress;
	primaryChildFragment.sibling = fallbackChildFragment;

	workInProgress.child = primaryChildFragment;

	return fallbackChildFragment;
}

function updateSuspensePrimaryChildren(
	workInProgress: FiberNode,
	primaryChildren: any
) {
	const current = workInProgress.alternate as FiberNode;
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment: FiberNode | null =
		currentPrimaryChildFragment.sibling;

	const primaryChildProps: OffscreenProps = {
		mode: 'visible',
		children: primaryChildren
	};

	const primaryChildFragment = createWorkInProgress(
		currentPrimaryChildFragment,
		primaryChildProps
	);

	primaryChildFragment.return = workInProgress;
	primaryChildFragment.sibling = null;
	workInProgress.child = primaryChildFragment;

	if (currentFallbackChildFragment !== null) {
		const deletions = workInProgress.deletions;

		if (deletions === null) {
			workInProgress.deletions = [currentFallbackChildFragment];
			workInProgress.flags |= ChildDeletion;
		} else {
			deletions.push(currentFallbackChildFragment);
		}
	}
	return primaryChildFragment;
}

function updateMemoComponent(wip: FiberNode, renderLane: Lane) {
	// bailout 四要素
	// props浅比较
	const current = wip.alternate;
	const nextProps = wip.pendingProps;
	// memo fiber.type.type
	const Component = wip.type.type;

	if (current !== null) {
		const prevProps = current.memoizedProps;
		// 浅比较
		if (shallowEqual(prevProps, nextProps) && current.ref === wip.ref) {
			didReceiveUpdate = false;
			wip.pendingProps = prevProps;

			// state context
			if (!checkScheduleUpdateOrContext(current, renderLane)) {
				// 满足四要素
				wip.lanes = current.lanes;
				return bailoutOnAlreadyFinishedWork(wip, renderLane);
			}
		}
	}
	return updateFunctionComponent(wip, Component, renderLane);
}

function bailoutOnAlreadyFinishedWork(wip: FiberNode, renderLane: Lane) {
	if (!includeSomeLanes(wip.childLanes, renderLane)) {
		if (__DEV__) {
			console.warn('bailout 整棵子树', wip);
		}
		return null;
	}
	if (__DEV__) {
		console.warn('bailout一个fiber', wip);
	}

	cloneChildFiber(wip);
	return wip.child;
}

function checkScheduleUpdateOrContext(
	current: FiberNode,
	renderLane: Lane
): boolean {
	const updateLane = current.lanes;
	if (includeSomeLanes(updateLane, renderLane)) {
		return true;
	}
	return false;
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
	const current = wip.alternate;
	if (current !== null) {
		// update
		wip.child = reconcileChildFibers(wip, current.child, children);
	} else {
		// mount
		wip.child = mountChildFibers(wip, null, children);
	}
}
