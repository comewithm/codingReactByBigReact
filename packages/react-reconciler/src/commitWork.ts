import { FiberNode, FiberRootNode } from "./fiber";
import { 
    ChildDeletion, 
    MutationMask, 
    NoFlags, 
    Placement, 
    Update 
} from "./fiberTags";
import { 
    Container, 
    appendChildToContainer, 
    removeChild, 
    commitTextUpdate,
    Instance,
    insertChildToContainer
} from "./hostConfig";
import { 
    FunctionComponent, 
    HostComponent, 
    HostRoot, 
    HostText 
} from "./workTags";


let nextEffect: FiberNode | null = null

// 以DFS形式执行
export const commitMutationEffects = (finishedWork: FiberNode) => {
    nextEffect = finishedWork

    while(nextEffect !== null) {
        // 向下遍历
        const child: FiberNode | null = nextEffect.child

        if(
            (nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
            child !==null
        ) {
            nextEffect = child
        } else {
            // 向上遍历
            up: while(nextEffect !== null) {
                commitMutationEffectsOnFiber(nextEffect)

                const sibling: FiberNode | null = nextEffect.sibling

                if(sibling !== null) {
                    nextEffect = sibling
                    break up
                }

                nextEffect = nextEffect.return
            }
        }
    }
}

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
    const flags = finishedWork.flags

    if(
        (flags & Placement) !== NoFlags
    ) {
        // 插入/移动
        commitPlacement(finishedWork)
        finishedWork.flags &= ~Placement
    }

    if(
        (flags & ChildDeletion) !== NoFlags
    ) {
        const deletions = finishedWork.deletions

        if(deletions !== null) {
            deletions.forEach((childToDelete) => {
                commitDeletion(childToDelete)
            })
        }

        finishedWork.flags &= ~ChildDeletion
    }

    if(
        (flags & Update) !== NoFlags
    ) {
        commitUpdate(finishedWork)
        finishedWork.flags &= ~Update
    }
}

const commitPlacement = (finishedWork: FiberNode) => {
    if(__LOG__) {
        console.log(`插入、移动DOM:`, finishedWork);
    }
    const hostParent = getHostParent(finishedWork) as Container

    const sibling = getHostSibling(finishedWork)

    // appendChild/insertBefore
    insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling)
}

function getHostParent(fiber: FiberNode) {
    let parent = fiber.return

    while(parent) {
        const parentTag = parent.tag
        if(parentTag === HostComponent) {
            return parent.stateNode as Container
        }
        if(parentTag === HostRoot) {
            return (parent.stateNode as FiberRootNode).container
        }
        parent = parent.return
    }
    console.error('getHostParent未找到hostParent')
}

function getHostSibling(fiber: FiberNode) {
    let node: FiberNode = fiber
    findSibling: while(true) {
        while(node.sibling === null) {
            // 如果当前节点没有sibling，则找他父级sibling
            const parent = node.return
            if(
                parent === null || 
                parent.tag === HostComponent ||
                parent.tag === HostRoot
            ) {
                // 没找到
               return null 
            }
            node = parent
        }
        node.sibling.return = node.return
        // 向同级sibling寻找
        node = node.sibling

        while(
            node.tag !== HostText &&
            node.tag !== HostComponent
        ) {
            // 找到一个非Host fiber,向下找，直到找到第一个Host子孙
            if(
                (node.flags & Placement) !== NoFlags
            ) {
                // 这个fiber不稳定，不能用
                continue findSibling
            }

            if(node.child === null) {
                continue findSibling
            } else {
                node.child.return = node
                node = node.child
            }
        }

        // 找到最优可能的fiber
        if(
            (node.flags & Placement) === NoFlags
        ) {
            // 这是稳定的fiber
            return node.stateNode
        }
    }
}

function insertOrAppendPlacementNodeIntoContainer(
    fiber: FiberNode, 
    parent: Container,
    before?: Instance
) {
    if(
        fiber.tag === HostComponent || 
        fiber.tag === HostText
    ) {
        if(before) {
            insertChildToContainer(
                fiber.stateNode,
                parent,
                before
            )
        } else {
            appendChildToContainer(
                fiber.stateNode, 
                parent
            )
        }
        return
    }
    const child = fiber.child

    if(child !== null) {
        insertOrAppendPlacementNodeIntoContainer(child, parent)
        let sibling = child.sibling

        while(sibling !== null) {
            insertOrAppendPlacementNodeIntoContainer(sibling, parent)
            sibling = sibling.sibling
        }
    }
}


/**
 * 删除需要考虑:
 * HostComponent:需要便利它的子树，为后续解绑ref创造条件，
 * HostComponent本身只需删除最上层节点即可
 * 
 * FunctionComponent: effect相关hook的执行，并遍历子树
 *
 */
function commitDeletion(childToDelete: FiberNode) {
    if(__LOG__) {
        console.log(`删除DOM、组件unmount:${childToDelete}`);
    }
    let firstHostFiber: FiberNode

    commitNestedUnmount(childToDelete, (unmountFiber) => {
        switch(unmountFiber.tag) {
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
                // effect 相关操作
                return
        }
    })
    // @ts-ignore
    if(firstHostFiber) {
        const hostParent = getHostParent(childToDelete) as Container
        removeChild(firstHostFiber.stateNode, hostParent)
    }

    childToDelete.return = null
    childToDelete.child = null
}

function commitUpdate(finishedWork: FiberNode) {
    if(__LOG__) {
        console.log(`更新DOM、文本节点内容:${finishedWork}`);
    }
    switch(finishedWork.tag) {
        case HostText:
            const newContent = finishedWork.pendingProps.content
            return commitTextUpdate(finishedWork.stateNode, newContent)
    }
    console.error('commitUpdate未支持的类型', finishedWork)
}

function commitNestedUnmount(
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