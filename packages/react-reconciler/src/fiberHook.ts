import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import {
	Update,
	UpdateQueue,
	basicStateReducer,
	createUpdate,
	createUpdateQueue,
	enqueueUpdate,
	processUpdateQueue
} from './updateQueue';
import { Action, ReactContext, Thenable, Usable } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import internals from 'shared/internals';
import {
	Lane,
	NoLane,
	NoLanes,
	mergeLanes,
	removeLanes,
	requestUpdateLane
} from './fiberLanes';
import { Flags, PassiveEffect } from './fiberFlags';
import { HookHasEffect, Passive } from './hookEffectTags';
import { REACT_CONTEXT_TYPE } from 'shared/ReactSymbols';
import { trackUsedThenable } from './thenable';
import { markWipReceivedUpdate } from './beginWork';
import { readContext as readContextOrigin } from './fiberContext';
interface Hook {
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
	baseState: any;
	baseQueue: Update<any> | null;
}

let currentlyRenderingFiber: FiberNode | null = null;
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;

let renderLane: Lane = NoLane;

const { currentDispatcher, currentBatchConfig } = internals;

type EffectCallback = () => void;
export type HookDeps = any[] | null;
export interface Effect {
	tag: Flags;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: HookDeps;
	next: Effect | null;
}

export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	lastEffect: Effect | null;
	lastRenderedState: State;
}

export function renderWithHooks(
	wip: FiberNode,
	Component: FiberNode['type'],
	lane: Lane
) {
	// 赋值
	currentlyRenderingFiber = wip;
	// 重置 hooks链表
	wip.memoizedState = null;
	// 重置effect链表
	wip.updateQueue = null;
	renderLane = lane;

	const current = wip.alternate;
	if (current !== null) {
		// update
		currentDispatcher.current = HookDispatcherOnUpdate;
	} else {
		// mount
		currentDispatcher.current = HookDispatcherOnMount;
	}

	const props = wip.pendingProps;

	const children = Component(props);

	// 重置操作
	currentlyRenderingFiber = null;
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;

	return children;
}

const HookDispatcherOnMount: Dispatcher = {
	useState: mountState,
	useEffect: mountEffect,
	useTransition: mountTransition,
	useRef: mountRef,
	useContext: readContext,
	use,
	useMemo: mountMemo,
	useCallback: mountCallback
};

const HookDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
	useTransition: updateTransition,
	useRef: updateRef,
	useContext: readContext,
	use,
	useMemo: updateMemo,
	useCallback: updateCallback
};

function mountState<State>(
	initialState: (() => State) | State
): [State, Dispatch<State>] {
	// 找到当前useState对应的hook数据
	const hook = mountWorkInProgressHook();
	let memoizedState;
	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}

	const queue = createFCUpdateQueue<State>();
	hook.updateQueue = queue;
	hook.memoizedState = memoizedState;
	hook.baseState = memoizedState;
	// @ts-ignore
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.lastRenderedState = memoizedState;
	queue.dispatch = dispatch;

	return [memoizedState, dispatch];
}

function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前useState对应的hook数据
	const hook = updateWorkInProgressHook();

	// 计算新state
	const queue = hook.updateQueue as FCUpdateQueue<State>;
	const baseState = hook.baseState;

	const pending = queue.shared.pending;
	const current = currentHook as Hook;
	let baseQueue = current.baseQueue;

	if (pending !== null) {
		// pending baseQueue update保存在current中
		if (baseQueue !== null) {
			// baseQueue b2 -> b0 -> b1 -> b2
			// pendingQueue p2 -> p0 -> p1 -> p2
			// b0
			const baseFirst = baseQueue.next;
			// p0
			const pendingFirst = pending.next;
			// b2 -> p0
			baseQueue.next = pendingFirst;
			// p2 -> b0
			pending.next = baseFirst;
			// p2 -> b0 -> b1 -> b2 -> p0 -> p1 -> p2
		}
		baseQueue = pending;
		// 保存在current中
		current.baseQueue = pending;
		queue.shared.pending = null;

		if (baseQueue !== null) {
			const prevState = hook.memoizedState;
			const {
				memoizedState,
				baseQueue: newBaseQueue,
				baseState: newBaseState
			} = processUpdateQueue(baseState, baseQueue, renderLane, (update) => {
				const skippedLane = update.lane;
				const fiber = currentlyRenderingFiber as FiberNode;

				fiber.lanes = mergeLanes(fiber.lanes, skippedLane);

				if (Object.is(prevState, memoizedState)) {
					markWipReceivedUpdate();
				}

				hook.memoizedState = memoizedState;
				hook.baseState = newBaseState;
				hook.baseQueue = newBaseQueue;

				queue.lastRenderedState = memoizedState;
			});
		}
	}

	return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

function mountEffect(create: EffectCallback | void, deps: HookDeps | void) {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;

	hook.memoizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
}

function updateEffect(create: EffectCallback | void, deps: HookDeps | void) {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	let destroy: EffectCallback | void;

	if (currentHook !== null) {
		const prevEffect = currentHook.memoizedState as Effect;
		destroy = prevEffect.destroy;

		if (nextDeps !== null) {
			// 浅比较依赖
			const prevDeps = prevEffect.deps;
			if (areHookInputsEqual(nextDeps, prevDeps)) {
				hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
				return;
			}
		}

		// 浅比较不相等
		(currentlyRenderingFiber as FiberNode).flags |= PassiveEffect;
		hook.memoizedState = pushEffect(
			Passive | HookHasEffect,
			create,
			destroy,
			nextDeps
		);
	}
}

function pushEffect(
	hookFlags: Flags,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: HookDeps
): Effect {
	const effect: Effect = {
		tag: hookFlags,
		create,
		destroy,
		deps,
		next: null
	};

	const fiber = currentlyRenderingFiber as FiberNode;
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;

	if (updateQueue === null) {
		// 不存在updateQueue 自成环状
		const updateQueue = createFCUpdateQueue();
		fiber.updateQueue = updateQueue;
		effect.next = effect;
		updateQueue.lastEffect = effect;
	} else {
		// 插入effect
		const lastEffect = updateQueue.lastEffect;

		if (lastEffect === null) {
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const firstEffect = lastEffect.next;
			// lastEffect指向effect(插入)
			lastEffect.next = effect;
			// effect指向第一个effect(成环)
			effect.next = firstEffect;
			// 更新队列的lastEffect指向effect
			updateQueue.lastEffect = effect;
		}
	}
	return effect;
}

function mountTransition(): [boolean, (callback: () => void) => void] {
	const [isPending, setPending] = mountState(false);
	const hook = mountWorkInProgressHook();

	const start = startTransition.bind(null, setPending);
	hook.memoizedState = start;
	return [isPending, start];
}

function updateTransition(): [boolean, (callback: () => void) => void] {
	const [isPending] = updateState();
	const hook = updateWorkInProgressHook();

	const start = hook.memoizedState;

	return [isPending as boolean, start];
}

function startTransition(setPending: Dispatch<boolean>, callback: () => void) {
	setPending(true);
	const prevTransition = currentBatchConfig.transition;
	currentBatchConfig.transition = 1;

	callback();
	setPending(false);

	currentBatchConfig.transition = prevTransition;
}

function mountRef<T>(initialValue: T): { current: T } {
	const hook = mountWorkInProgressHook();
	const ref = { current: initialValue };
	hook.memoizedState = ref;

	return ref;
}

function updateRef<T>(initialValue: T): { current: T } {
	const hook = updateWorkInProgressHook();
	return hook.memoizedState;
}

function readContext<T>(context: ReactContext<T>): T {
	const consumer = currentlyRenderingFiber as FiberNode;
	return readContextOrigin(consumer, context);
}

function use<T>(usable: Usable<T>): T {
	if (usable !== null && typeof usable === 'object') {
		if (typeof (usable as Thenable<T>).then === 'function') {
			const thenable = usable as Thenable<T>;
			return trackUsedThenable(thenable);
		} else if ((usable as ReactContext<T>).$$typeof === REACT_CONTEXT_TYPE) {
			const context = usable as ReactContext<T>;
			return readContext(context);
		}
	}

	throw new Error('不支持的use参数' + usable);
}

function mountMemo<T>(nextCreate: () => T, deps: HookDeps | undefined) {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const nextValue = nextCreate();
	hook.memoizedState = [nextValue, nextDeps];
	return nextValue;
}

function updateMemo<T>(nextCreate: () => T, deps: HookDeps | undefined) {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const prevState = hook.memoizedState;

	if (nextDeps !== null) {
		const prevDeps = prevState[1];
		if (areHookInputsEqual(nextDeps, prevDeps)) {
			return prevState[0];
		}
	}

	const nextValue = nextCreate();
	hook.memoizedState = [nextValue, nextDeps];

	return nextValue;
}

function mountCallback<T>(callback: T, deps: HookDeps | undefined) {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	hook.memoizedState = [callback, nextDeps];
	return callback;
}

function updateCallback<T>(callback: T, deps: HookDeps | undefined) {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;
	const prevState = hook.memoizedState;

	if (nextDeps !== null) {
		const prevDeps = prevState[1];
		if (areHookInputsEqual(nextDeps, prevDeps)) {
			return prevState[0];
		}
	}

	hook.memoizedState = [callback, nextDeps];
	return callback;
}

function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}

function areHookInputsEqual(nextDeps: HookDeps, prevDeps: HookDeps) {
	if (prevDeps === null || nextDeps === null) {
		return false;
	}

	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (Object.is(prevDeps[i], nextDeps[i])) {
			continue;
		}
		return false;
	}
	return true;
}

function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: FCUpdateQueue<State>,
	action: Action<State>
) {
	const lane = requestUpdateLane();
	const update = createUpdate(action, lane);

	// eager策略
	const current = fiber.alternate;
	if (
		fiber.lanes === NoLanes &&
		(current === null || current.lanes === NoLanes)
	) {
		// 当前产生的update是这个fiber的第一个update
		// 1.更新前的状态 2.计算状态的方法
		const currentState = updateQueue.lastRenderedState;
		const eagerState = basicStateReducer(currentState, action);

		update.hasEagerState = true;
		update.eagerState = eagerState;

		if (Object.is(currentState, eagerState)) {
			enqueueUpdate(updateQueue, update, fiber, NoLane);
			// 命中eagerState
			if (__DEV__) {
				console.warn('命中eagerState', fiber);
			}
			return;
		}
	}

	enqueueUpdate(updateQueue, update, fiber, lane);
	scheduleUpdateOnFiber(fiber, lane);
}

function mountWorkInProgressHook() {
	const hook: Hook = {
		memoizedState: null,
		updateQueue: null,
		next: null,
		baseQueue: null,
		baseState: null
	};

	if (workInProgressHook === null) {
		// mount时，第一个Hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用hook');
		} else {
			workInProgressHook = hook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		}
	} else {
		// mount时，后续的hook
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}

	return workInProgressHook;
}

function updateWorkInProgressHook() {
	// TODO render阶段触发的更新
	let nextCurrentHook: Hook | null;

	if (currentHook === null) {
		// 这是FC update时的第一个hook
		const current = (currentlyRenderingFiber as FiberNode).alternate;
		if (current !== null) {
			nextCurrentHook = current.memoizedState;
		} else {
			// mount
			nextCurrentHook = null;
		}
	} else {
		// FC update时后续的hook
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook === null) {
		// mount/ update u1 u2 u3
		// update 		 u1 u2 u3 u4
		throw new Error(
			`组件${currentlyRenderingFiber?.type.name}本次执行时的hook比上次执行时多`
		);
	}

	currentHook = nextCurrentHook as Hook;

	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		updateQueue: currentHook.updateQueue,
		next: null,
		baseQueue: currentHook.baseQueue,
		baseState: currentHook.baseState
	};

	if (workInProgressHook === null) {
		// mount时第一个Hook
		if (currentlyRenderingFiber === null) {
			throw new Error('请在函数组件内调用hook');
		} else {
			workInProgressHook = newHook;
			currentlyRenderingFiber.memoizedState = workInProgressHook;
		}
	} else {
		// mount时，后续的hook
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}

	return workInProgressHook;
}

export function resetHooksOnUnwind(wip: FiberNode) {
	currentlyRenderingFiber = null;
	currentHook = null;
	workInProgressHook = null;
}

export function bailoutHook(wip: FiberNode, renderLane: Lane) {
	const current = wip.alternate as FiberNode;
	wip.updateQueue = current.updateQueue;
	wip.flags &= ~PassiveEffect;

	current.lanes = removeLanes(current.lanes, renderLane);
}
