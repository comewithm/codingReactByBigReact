import { FiberNode } from './fiber';

import {Action} from 'shared/ReactTypes'

export interface Update<State> {
	action: Action<State>
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
}

// 初始化
export const createUpdateQueue = <Action>() => {
	const updateQueue:UpdateQueue<Action> = {
		shared: {
			pending: null
		}
	}
	return updateQueue
}

// 创建
export const createUpdate = <State>(action: Action<State>) => {
	return {
		action
	};
};

// 插入
export const enqueueUpdate = <Action>(
	updateQueue: UpdateQueue<Action>, 
	update: Update<Action>
) => {
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(fiber: FiberNode) => {
	const updateQueue = fiber.updateQueue as UpdateQueue<State>;
	let newState: State = fiber.memoizedState;

	if (updateQueue) {
		const pending = updateQueue.shared.pending;
		const pendingUpdate = pending;
		updateQueue.shared.pending = null;

		if (pendingUpdate !== null) {
			const action = pendingUpdate.action;
			if (action instanceof Function) {
				newState = action(newState);
			} else {
				newState = action;
			}
		}
	} else {
		console.error(fiber, 'processUpdateQueue时 updateQueue不存在');
	}
	fiber.memoizedState = newState;
};
