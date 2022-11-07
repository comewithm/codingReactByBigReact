import { REACT_ELEMENT_TYPE } from 'shared/ReactSymbols';
import { Props, ReactElement } from 'shared/ReactTypes';
import { createFiberFromElement, createWorkInProgress, FiberNode } from './fiber';
import { ChildDeletion, Placement } from './fiberFlags';
import { HostText } from './workTags';

function ChildReconciler(shouldTrackEffect: boolean) {

	function deleteChild(
		returnFiber: FiberNode,
		childToDelete: FiberNode
	) {
		if(!shouldTrackEffect) {
			return
		}
		const deletions = returnFiber.deletions
		if(deletions === null) {
			returnFiber.deletions = [childToDelete]
			returnFiber.flags |= ChildDeletion
		} else {
			deletions.push(childToDelete)
		}
	}

	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		element: ReactElement
	) {
		// 前: abc 后: a  删除bc
		// 前: a 后: b  删除a创建b
		// 前: 无 后: a  创建a
		const key = element.key
		if(currentFirstChild !== null) {
			if(currentFirstChild.key === key) {
				// key相同 比较type
				if(element.$$typeof === REACT_ELEMENT_TYPE) {
					if(currentFirstChild.type === element.type) {
						// type相同 复用
					}
					// type不同 删除旧的
					deleteChild(returnFiber, currentFirstChild)
				} else {
					// $$typeof不是react.element类型的
					console.error('未定义的element.$$typeof', element.$$typeof)
				}
			} else {
				// key值不同,删除旧的
				deleteChild(returnFiber, currentFirstChild)
			}
		}
		// 删除之后, 创建新的
		const fiber = createFiberFromElement(element);
		fiber.return = returnFiber;
		return fiber;
	}

	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffect && fiber.alternate === null) {
			fiber.flags |= Placement;
		}
		return fiber;
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		content: string
	) {
		// 前：b 后：a
		// TODO 前：abc 后：a
		// TODO 前：bca 后：a
		if(currentFirstChild !== null && currentFirstChild.tag === HostText) {
			const existing = useFiber(currentFirstChild, {content})
			existing.return = returnFiber
			return existing
		}
		// 不是文本内容的其他类型tag, 删除 并添加新的文本内容content
		if(currentFirstChild !== null) {
			deleteChild(returnFiber, currentFirstChild)
		}
		// 删除之后，创建新的
		const created = new FiberNode(HostText, {content}, null)
		created.return = returnFiber
		return created
	}

	function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		newChild?: ReactElement
	): FiberNode | null {
		// newChild为JSX
		// currentFirstChild 为 fiberNode
		if (typeof newChild === 'object' && newChild !== null) {
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFirstChild, newChild)
					);
			}
		}
		// 文本
		if(typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(
					returnFiber,
					currentFirstChild,
					newChild + ''
				)
			)
		}
		console.error('reconcile时未实现的child类型');
		return null;
	}

	return reconcileChildFibers;
}

function useFiber(
	fiber: FiberNode, 
	pendingProps: Props
) {
	const clone = createWorkInProgress(fiber, pendingProps)
	clone.index = 0
	clone.sibling = null

	return clone
}

export const reconcileChildFibers = ChildReconciler(true);
export const mountChildFibers = ChildReconciler(false);
