import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber';
import { 
	ChildDeletion, 
	Flags, 
	MutationMask, 
	NoFlags, 
	PassiveEffect, 
	PassiveMask, 
	Placement, 
	Update 
} from './fiberFlags';
import { Effect, FCUpdateQueue } from './fiberHooks';
import { HookHasEffect } from './hookEffectTags';
import { 
	Container, 
	appendChildToContainer, 
	insertChildToContainer,
	commitTextUpdate, 
	removeChild,
	Instance 
} from './hostConfig';
import { 
	FunctionComponent, 
	HostComponent, 
	HostRoot, 
	HostText 
} from './workTags';

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = (
	finishedWork: FiberNode,
	root: FiberRootNode
) => {
	nextEffect = finishedWork;

	while (nextEffect !== null) {
		// 向下遍历
		const child: FiberNode | null = nextEffect.child;

		if (
			(nextEffect.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			// 向上遍历
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect, root);
				const sibling: FiberNode | null = nextEffect.sibling;

				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}
				nextEffect = nextEffect.return;
			}
		}
	}
};

const commitMutationEffectsOnFiber = (
	finishedWork: FiberNode,
	root: FiberRootNode
) => {
	const flags = finishedWork.flags;

	if ((flags & Placement) !== NoFlags) {
		// 插入/移动
		commitPlacement(finishedWork);
		finishedWork.flags &= ~Placement;
	}

	if((flags & ChildDeletion) !== NoFlags) {
		const deletions = finishedWork.deletions
		if(deletions !== null) {
			deletions.forEach(childToDelete => {
				commitDeletion(childToDelete, root)
			})
		}
		finishedWork.flags &= ~ChildDeletion
	}

	if((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork)
		finishedWork.flags &= ~Update
	}

	if((flags & PassiveEffect) !== NoFlags) {
		// 收集因deps变化而需要执行的useEffect
		commitPassiveEffect(finishedWork, root, 'update')
		finishedWork.flags &= ~PassiveEffect
	}
};

const commitPlacement = (finishedWork: FiberNode) => {
	if(__LOG__) {
		console.log('插入，移动DOM', finishedWork)
	}
	const hostParent = getHostParent(finishedWork) as Container;

	const sibling = getHostSibling(finishedWork)

	// appendChild / insertBefore
	// appendPlacementNodeIntoContainer(finishedWork, hostParent);
	insertOrAppendPlacementNodeIntoContainer(
		finishedWork,
		hostParent,
		sibling
	)
};

function commitUpdate(finishedWork: FiberNode) {
	if(__LOG__) {
		console.log('更新DOM,文本节点内容', finishedWork)
	}
	switch (finishedWork.tag) {
		case HostText:
			const newContent = finishedWork.pendingProps.content
			return commitTextUpdate(finishedWork.stateNode, newContent)
	}
	console.error('commitUpdate未支持的类型', finishedWork)
}

function commitDeletion(
	childToDelete: FiberNode,
	root: FiberRootNode
) {
	if(__LOG__) {
		console.log('删除DOM,组件unmount', childToDelete)
	}
	let firstHostFiber: FiberNode | null = null

	commitNestedUnmounts(childToDelete, (unmountFiber:FiberNode) => {
		switch (unmountFiber.tag) {
			case HostComponent:
				if(!firstHostFiber) {
					firstHostFiber = unmountFiber
				}
				// 解绑ref
				return
			case HostText:
				if(!firstHostFiber) {
					firstHostFiber = unmountFiber
				}
				return
			case FunctionComponent:
				// effect相关操作
				commitPassiveEffect(unmountFiber, root, 'unmount')
				return		
		}
	})
	// @ts-ignore
	if(firstHostFiber) {
		const hostParent = getHostParent(childToDelete) as Container
		removeChild((firstHostFiber as FiberNode).stateNode, hostParent)
	}

	childToDelete.return = null
	childToDelete.child = null
}

function commitNestedUnmounts(
	root: FiberNode,
	onCommitUnmount: (unmountFiber: FiberNode) => void
) {
	let node = root
	while(true) {
		onCommitUnmount(node)

		if(node.child !== null) {
			// 向下
			node.child.return = node
			node = node.child
			continue
		}

		if(node === root) {
			// 终止条件
			return
		}

		while(node.sibling === null) {
			// 向上
			if(node.return === null || node.return === root) {
				// 终止条件
				return
			}
			node = node.return
		}
		node.sibling.return = node.return
		node = node.sibling
	}
}

function insertOrAppendPlacementNodeIntoContainer(
	fiber: FiberNode, 
	parent: Container,
	before?: Instance
) {
	if (fiber.tag === HostComponent || fiber.tag === HostText) {
		if(before) {
			insertChildToContainer(fiber.stateNode, parent, before)
		} else {
			appendChildToContainer(fiber.stateNode, parent);
		}
		return;
	}

	const child = fiber.child;
	if (child !== null) {
		insertOrAppendPlacementNodeIntoContainer(child, parent, before);
		let sibling = child.sibling;

		while (sibling !== null) {
			insertOrAppendPlacementNodeIntoContainer(sibling, parent, before);
			sibling = sibling.sibling;
		}
	}
}

function getHostParent(fiber: FiberNode) {
	let parent = fiber.return;

	while (parent) {
		const parentTag = parent.tag;
		if (parentTag === HostComponent) {
			return parent.stateNode as Container;
		}
		if(parentTag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container
		}
		parent = parent.return;
	}

	console.error('getHostParent未找到hostParent');
}

/**
 * 难点在于目标fiber的hostSibling可能不是他的同级sibling
 * 比如：<A /> <B />
 * 其中function B(){return <div />}
 * 所以A的hostSibling实际是B的child,实际情况层级可能更深
 * 同时：一个fiber被标记Placement, 那它就是不稳定的，
 * 它对应的DOM在本次commit阶段会移动，也不能作为hostSibling
 */
function getHostSibling(fiber: FiberNode) {
	let node: FiberNode = fiber
	findSibling: while(true) {
		while(node.sibling === null) {
			// 当前节点没有sibling，则找它父级的sibling
			const parent = node.return
			if(
				parent === null ||
				parent.tag === HostComponent ||
				parent.tag === HostRoot
			) {
				// 没有找到
				return null
			}
			node = parent
		}
		node.sibling.return = node.return
		// 向同级sibling寻找
		node = node.sibling

		while(node.tag !== HostText && node.tag !== HostComponent) {
			// 找到一个非Host Fiber，向下找，直到找到第一个host子孙
			if(
				(node.flags & Placement) !== NoFlags
			) {
				// 这个fiber不稳定 不能用
				continue findSibling
			}
			if(node.child === null) {
				continue findSibling
			} else {
				node.child.return = node
				node = node.child
			}
		}
		// 找到最有可能的fiber
		if(
			(node.flags & Placement) !== NoFlags
		) {
			// 这是最稳定的fiber 就它了
			return node.stateNode
		}
	}
}


function commitPassiveEffect(
	finishedWork: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	if(
		finishedWork.tag !== FunctionComponent ||
		(type === 'update' && (finishedWork.flags & PassiveEffect) === NoFlags)
	) {
		return
	}

	const updateQueue = finishedWork.updateQueue as FCUpdateQueue<any>
	if(updateQueue !== null) {
		if(updateQueue.lastEffect === null) {
			console.error("当FC存在PassiveEffect flag时，不应该不存在effect。")
		}
		root.pendingPassiveEffects[type]
			.push(updateQueue.lastEffect as Effect)
	}
}

// 用于组件解绑前触发destroy effect.
export function commitHookEffectListDestroy(
	flags: Flags,
	lastEffect: Effect
) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy
		if(typeof destroy === "function") {
			destroy()
		}
		// 后续不会再触发create
		effect.tag &= ~HookHasEffect
	})
}


// 用于effect create执行前触发上一次的destroy effect.
export function commitHookEffectListUnmount(
	flags: Flags,
	lastEffect: Effect
) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy	
		if(typeof destroy === 'function') {
			destroy()
		}
	})
}

export function commitHookEffectListMount(
	flags: Flags,
	lastEffect: Effect
) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const create = effect.create
		if(typeof create === 'function') {
			effect.destroy = create()
		}
	})
}


function commitHookEffectList(
	flags: Flags,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	// 第一个effect
	let effect = lastEffect.next as Effect
	do {
		if((effect.tag & flags) === flags) {
			callback(effect)
		}
		effect = effect.next as Effect
	} while (effect !== lastEffect.next);
}