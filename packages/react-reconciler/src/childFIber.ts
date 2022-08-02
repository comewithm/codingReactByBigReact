import { REACT_ELEMENT_TYPE } from "shared/ReactSymbols";
import { Props, ReactElement } from "shared/ReactTypes"
import { FiberNode, createFiberFromElement, createWorkInProgress } from "./fiber"
import { ChildDeletion, Placement } from "./fiberTags";
import { HostText } from "./workTags";

/**
 * mount/reconcile只负责 Placement(插入)/Placement(移动)/ChildDeletion(删除)
 * 更新(文本节点内容更新、属性更新)在completeWork中，对应 Update flag
 */

type ExistingChildren = Map<string | number, FiberNode>

function ChildReconciler(shouldTrackEffects: boolean) {

    function deleteChild(
        returnFiber: FiberNode,
        childToDelete: FiberNode
    ) {
        if(!shouldTrackEffects) {
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

    function deleteRemainingChildren(
        returnFiber: FiberNode,
        currentFirstChild: FiberNode | null
    ){
        if(!shouldTrackEffects) {
            return
        }
        let childToDelete = currentFirstChild
        while(childToDelete !== null) {
            //TODO
        }
    }

    function reconcileSingleElement(
        returnFiber: FiberNode,
        currentFirstChild: FiberNode | null,
        element: ReactElement
    ){
        // 前：abc 后a 删除bc
        // 前：a 后：b 删除a,创建b
        // 前：无 后：a 创建a
        const key = element.key
        let current = currentFirstChild
        while(current !== null) {
            if(current.key === key) {
                // key相同 比较type
                if(element.$$typeof === REACT_ELEMENT_TYPE) {
                    if(current.type === element.type) {
                        // type相同 可以复用
                        const existing = useFiber(current, element.props)
                        existing.return = returnFiber
                        // 当前节点可复用,其他兄弟节点都删除
                        deleteRemainingChildren(returnFiber, current.sibling)
                        return existing
                    } 
                    // key相同但type不同,无法复用.后面的兄弟节点也没有复用的可能性，都删除
                    deleteRemainingChildren(returnFiber, current)
                    break
                } else {
                    console.log('未定义的element.$$typeof', element.$$typeof)
                    break
                }
            } else {
                // key不同 删除旧的, 继续比较
                deleteChild(returnFiber, current)
                current = current.sibling
            }
        }
        // 创建新的
        const fiber = createFiberFromElement(element)
        fiber.return = returnFiber
        return fiber
    }

    function placeSingleChild(fiber:FiberNode){
        if(shouldTrackEffects && fiber.alternate === null){
            fiber.flags |= Placement
        }
        return fiber
    }

    function reconcileSingleTextNode(
        returnFiber: FiberNode,
        currentFirstChild: FiberNode | null,
        content:string
    ) {
        // 前:b 后:a
        // TODO 前:abc 后:a
        // TODO 前:bca 后:a
        if(
            currentFirstChild !== null &&
            currentFirstChild.tag === HostText
        ) {
            const existing = useFiber(currentFirstChild, {content})
            existing.return = returnFiber
            return existing
        }

        if(currentFirstChild !== null) {
            deleteChild(returnFiber, currentFirstChild)
        }

        const created = new FiberNode(HostText, {content}, null)
        created.return = returnFiber
        return created
    }

    function reconcileChildFibers(
        returnFiber: FiberNode,
        currentFirstChild: FiberNode | null,
        newChild?: ReactElement
    ):FiberNode | null {
        // newChild 为 JSX
        // currentFirstChild 为 fiberNode
        if(typeof newChild === 'object' && newChild !== null) {
            switch(newChild.$$typeof) {
                case REACT_ELEMENT_TYPE:
                    return placeSingleChild(
                        reconcileSingleElement(
                            returnFiber,
                            currentFirstChild,
                            newChild
                        )
                    )
            }
        }
        if(typeof newChild === 'string' || typeof newChild === 'number') {
            return placeSingleChild(
                reconcileSingleTextNode(
                    returnFiber,
                    currentFirstChild,
                    newChild + ''
                )
            )
        }
        console.error('reconcile 未实现的child类型')
        return null
    }

    return reconcileChildFibers
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
    const clone = createWorkInProgress(fiber, pendingProps)
    clone.index = 0
    clone.sibling = null

    return clone
}

export const mountChildFibers = ChildReconciler(false)

export const reconcileChildFibers = ChildReconciler(true)