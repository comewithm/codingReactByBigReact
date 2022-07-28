import { REACT_ELEMENT_TYPE } from "../../shared/ReactSymbols";
import { ReactElement } from "../../shared/ReactTypes"
import { FiberNode, createFiberFromElement } from "./fiber"
import { Placement } from "./fiberTags";
import { HostText } from "./workTags";


function ChildReconciler(shouldTrackEffect: boolean) {
    function reconcileSingleElement(
        returnFiber: FiberNode,
        currentFirstChild: FiberNode | null,
        element: ReactElement
    ){
        // 前：abc 后a 删除bc
        // 前：a 后：b 删除a,创建b
        // 前：无 后：a 创建a
        currentFirstChild; // ???
        const fiber = createFiberFromElement(element)
        fiber.return = returnFiber
        return fiber
    }

    function placeSingleChild(fiber:FiberNode){
        if(shouldTrackEffect){
            fiber.flags |= Placement
        }
        return fiber
    }

    function reconcileSingleTextNode(
        returnFiber: FiberNode,
        currentFirstChild: FiberNode | null,
        content:string
    ) {
        currentFirstChild;
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
        if(typeof newChild === 'string') {
            return placeSingleChild(
                reconcileSingleTextNode(
                    returnFiber,
                    currentFirstChild,
                    newChild
                )
            )
        }
        console.error('reconcile 未实现的child类型')
        return null
    }

    return reconcileChildFibers
}

export const mountChildFibers = ChildReconciler(false)

export const reconcileChildFibers = ChildReconciler(true)