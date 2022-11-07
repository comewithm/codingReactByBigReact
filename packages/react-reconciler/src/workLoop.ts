import { beginWork } from './beginWork';
import { commitMutationEffects } from './commitWork';
import { completeWork } from './completeWork';
import { createWorkInProgress, FiberNode, FiberRootNode } from './fiber';
import { MutationMask, NoFlags } from './fiberFlags';
import { HostRoot } from './workTags';

let workInProgress: FiberNode | null = null;

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	if(__DEV__) {
		console.log('开始schedule阶段', fiber)
	}
	const root = markUpdateLaneFromFiberToRoot(fiber);
	if (root === null) {
		return;
	}
	ensureRootIsScheduled(root);
}

function markUpdateLaneFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}

	if (node.tag === HostRoot) {
		return node.stateNode;
	}
	return null;
}

function ensureRootIsScheduled(root: FiberRootNode) {
	// 一些调度行为
	performSyncWorkOnRoot(root);
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	if(__DEV__) {
		console.log('开始render阶段', root)
	}
	// 初始化操作
	prepareFreshStack(root);

	// render 阶段具体操作
	do {
		try {
			workLoop();
			break;
		} catch (error) {
			console.log('workLoop error', error);
			workInProgress = null;
		}
	} while (true);

	if (workInProgress !== null) {
		console.error('render阶段结束wip不为null');
	}

	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	// commit阶段
	commitRoot(root);
}

function commitRoot(root: FiberRootNode) {
	console.log('开始commit阶段', root)
	const finishedWork = root.finishedWork;

	if (finishedWork === null) {
		return;
	}

	// 重置
	root.finishedWork = null;

	const subtreeHasEffect =
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		// 有副作用要执行

		// 阶段1/3 beforeMutation

		// 阶段2/3 Mutation
		commitMutationEffects(finishedWork);
		// Fiber tree 切换
		root.current = finishedWork;
		// 阶段3/3 Layout
	} else {
		// Fiber tree 切换
		root.current = finishedWork;
	}
}

function prepareFreshStack(root: FiberRootNode) {
	if(__DEV__) {
		console.log('初始化工作', root)
	}
	workInProgress = createWorkInProgress(root.current, {});
}

function workLoop() {
	while (workInProgress !== null) {
		performUnitOfWork(workInProgress);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber);
	// 执行完beginWork后，pendingProps变成memoizedProps
	fiber.memoizedProps = fiber.pendingProps

	if (next === null) {
		completeUnitOfWork(fiber);
	} else {
		workInProgress = next;
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	const node: FiberNode | null = fiber;
	do {
		const next = completeWork(node);

		if (next !== null) {
			workInProgress = next;
			return;
		}
		const sibling = node.sibling;
		if (sibling) {
			workInProgress = sibling;
			return;
		}
	} while (node !== null);
}
