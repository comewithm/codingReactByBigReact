import { Key, Props, ReactElementType } from 'shared/ReactTypes';
import {
	FiberNode,
	createFiberFromElement,
	createFiberFromFragment,
	createWorkInProgress
} from './fiber';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import { Placement } from './fiberFlags';
import { Fragment, HostText } from './workTags';

type ExistingChildren = Map<string | number, FiberNode>;

function ChildReconciler(shouldTrackEffects: boolean) {
	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffects && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldTrackEffects) {
			return;
		}
		const deletions = returnFiber.deletions;
		if (deletions === null) {
			returnFiber.deletions = [childToDelete];
		} else {
			deletions.push(childToDelete);
		}
	}

	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null
	) {
		if (!shouldTrackEffects) {
			return;
		}
		let childToDelete = currentFirstChild;
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete);
			childToDelete = childToDelete.sibling;
		}
	}

	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		const key = element.key;
		while (currentFiber !== null) {
			// update
			if (currentFiber.key === key) {
				// key相同
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						let props = element.props;
						if (element.type === REACT_FRAGMENT_TYPE) {
							props = element.props.children;
						}
						// type相同
						const existing = useFiber(currentFiber, props);
						existing.return = returnFiber;
						// 当前节点可复用，标记剩下的节点删除
						deleteRemainingChildren(returnFiber, currentFiber.sibling);
						return existing;
					}
					// type不同，删除currentFiber,根据element创建新fiber
					deleteRemainingChildren(returnFiber, currentFiber);
					break;
				} else {
					// 类型不同
					if (__DEV__) {
						console.warn('未实现的react类型', element);
						break;
					}
				}
			} else {
				// 删除currentFiber,根据element创建新fiber
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}

		// 根据fiber类型创建fiber
		let fiber;
		if (element.type === REACT_FRAGMENT_TYPE) {
			fiber = createFiberFromFragment(element.props.children, key);
		} else {
			fiber = createFiberFromElement(element);
		}
		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		while (currentFiber !== null) {
			// update
			if (currentFiber.tag === HostText) {
				// type相同，可以复用
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;
				deleteRemainingChildren(returnFiber, currentFiber.sibling);
				return existing;
			}
			// type不同，删除, 根据新content创建新fiber
			deleteChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
		}

		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		newChid: any[]
	) {
		let lastPlacedIndex = 0;
		// 创建的最后一个fiber
		let lastNewFiber: FiberNode | null = null;
		// 创建的第一个fiber
		let firstNewFiber: FiberNode | null = null;

		// 1.将current保存在map中
		const existingChildren: ExistingChildren = new Map();
		let current = currentFirstChild;

		while (current !== null) {
			const keyToUse = current.key !== null ? current.key : current.index;
			existingChildren.set(keyToUse, current);
			current = current.sibling;
		}

		// 2.遍历newChild，寻找是否可复用
		for (let i = 0; i < newChid.length; i++) {
			const after = newChid[i];
			const newFiber = updateFromMap(returnFiber, existingChildren, i, after);

			if (newFiber === null) {
				continue;
			}

			// 3.标记移动还是插入
			newFiber.index = i;
			newFiber.return = returnFiber;

			if (lastNewFiber === null) {
				// 开始都指向链表头
				lastNewFiber = newFiber;
				firstNewFiber = newFiber;
			} else {
				// 后续 头指针firstNewFiber不动, lastNewFiber移动指向newFiber形成链表
				lastNewFiber.sibling = newFiber;
				lastNewFiber = lastNewFiber.sibling;
			}

			if (!shouldTrackEffects) {
				continue;
			}

			const current = newFiber.alternate;
			if (current !== null) {
				// 不为空，说明是复用得到的old fiber,获取old fiber的索引
				const oldIndex = current.index;
				if (oldIndex < lastPlacedIndex) {
					// 移动
					newFiber.flags |= Placement;
					continue;
				} else {
					// 不移动
					lastPlacedIndex = oldIndex;
				}
			} else {
				// newFiber不是复用得到，新创建的 mount
				newFiber.flags |= Placement;
			}
		}
		// 4.将Map中剩下的标记为删除
		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber);
		});
		// firstNewFiber和lastNewFiber形成一个链表
		return firstNewFiber;
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: any
	) {
		// TODO 判断Fragment
		const isUnKeyedTopLevelFragment =
			typeof newChild === 'object' &&
			newChild !== null &&
			newChild.type === REACT_FRAGMENT_TYPE &&
			newChild.key === null;
		if (isUnKeyedTopLevelFragment) {
			newChild = newChild.props.children;
		}

		// 判断当前fiber类型
		if (typeof newChild === 'object' && newChild !== null) {
			// 多节点情况 ul > li*3
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild);
			}

			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);
				default:
					if (__DEV__) {
						console.warn('未实现的reconcile类型');
					}
					break;
			}
		}

		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}

		if (currentFiber !== null) {
			// 兜底删除
			deleteRemainingChildren(returnFiber, currentFiber);
		}

		if (__DEV__) {
			console.warn('未实现的reconcile类型', newChild);
		}
		return null;
	};
}

function updateFromMap(
	returnFiber: FiberNode,
	existingChildren: ExistingChildren,
	index: number,
	element: any
): FiberNode | null {
	const keyToUse = element.key !== null ? element.key : index;
	const before = existingChildren.get(keyToUse);

	// HostText
	if (typeof element === 'string' || typeof element === 'number') {
		if (before) {
			if (before.tag === HostText) {
				// 能复用，删除Map中复用节点
				existingChildren.delete(keyToUse);
				return useFiber(before, { content: element + '' });
			}
		}
		// old不存在，创建新的文本节点
		return new FiberNode(HostText, { content: element + '' }, null);
	}

	// ReactElement
	if (typeof element === 'object' && element !== null) {
		switch (element.$$typeof) {
			case REACT_ELEMENT_TYPE:
				if (element.type === REACT_FRAGMENT_TYPE) {
					return updateFragment(
						returnFiber,
						before,
						element,
						keyToUse,
						existingChildren
					);
				}
				if (before) {
					if (before.type === element.type) {
						existingChildren.delete(keyToUse);
						return useFiber(before, element.props);
					}
				}
				return createFiberFromElement(element);
		}

		// TODO 数组类型
		if (Array.isArray(element) && __DEV__) {
			console.warn('还未实现数组类型的child');
		}
	}

	if (Array.isArray(element)) {
		return updateFragment(
			returnFiber,
			before,
			element,
			keyToUse,
			existingChildren
		);
	}

	return null;
}

function updateFragment(
	returnFiber: FiberNode,
	current: FiberNode | undefined,
	elements: any[],
	key: Key,
	existingChildren: ExistingChildren
) {
	let fiber;
	if (!current || current.tag !== Fragment) {
		fiber = createFiberFromFragment(elements, key);
	} else {
		existingChildren.delete(key);
		fiber = useFiber(current, elements);
	}
	fiber.return = returnFiber;
	return fiber;
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWorkInProgress(fiber, pendingProps);
	clone.index = 0;
	clone.sibling = null;

	return clone;
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
