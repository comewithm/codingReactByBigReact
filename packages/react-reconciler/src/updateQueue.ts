import { FiberNode } from './fiber';

import {Action} from 'shared/ReactTypes'
import { Dispatch } from 'react/src/currentDispatcher';

export interface Update<State> {
	action: Action<State>
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	}
	dispatch: Dispatch<State> | null
}

// 初始化
export const createUpdateQueue = <Action>() => {
	const updateQueue:UpdateQueue<Action> = {
		shared: {
			pending: null
		},
		dispatch: null
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

export const processUpdateQueue = <State>(
	baseState: State,
	updateQueue: UpdateQueue<State>,
	fiber: FiberNode
) => {
	if (updateQueue) {
		const pending = updateQueue.shared.pending;
		const pendingUpdate = pending;
		updateQueue.shared.pending = null;

		if (pendingUpdate !== null) {
			const action = pendingUpdate.action;
			if (action instanceof Function) {
				baseState = action(baseState);
			} else {
				baseState = action;
			}
		}
	} else {
		console.error(fiber, 'processUpdateQueue时 updateQueue不存在');
	}
	return baseState
};
