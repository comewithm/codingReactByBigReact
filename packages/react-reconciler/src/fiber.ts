import { Props, Key, Ref, ReactElement } from "../../shared/ReactTypes";
import {Flags, NoFlags} from './fiberTags'
import {Container} from './hostConfig'
import {UpdateQueue} from './updateQueue'
import {WorkTag, HostComponent, FunctionComponent} from './workTags'

export class FiberNode {
    /**
     * pendingProps:
     * 输入属性, 从ReactElement对象传入的 props. 
     * 用于和fiber.memoizedProps比较可以得出属性是否变动.
     */
    pendingProps:Props;
    memoizedProps: Props | null;
    /**
     * ReactElement 中的key
     */
    key: Key;
    /**
     * stateNode:
     * 与fiber关联的局部状态节点
     * (比如: HostComponent类型指向与fiber节点对应的 dom 节点; 
     * 根节点fiber.stateNode指向的是FiberRoot; 
     * class 类型节点其stateNode指向的是 class 实例).
     */
    stateNode: any; 
    type:any;
    ref: Ref;
    /**
     * tag:
     * fiber类型
     */
    tag:WorkTag;
    /**
     * flags:
     * 标志位, 副作用标记
     */
    flags: Flags;
    /**
     * subtreeFlags:
     * 替代 16.x 版本中的 firstEffect, nextEffect. 
     * 默认未开启, 当设置了enableNewReconciler=true 才会启用
     */
    subtreeFlags: Flags;
    /**
     * return:
     * 指向父节点
     */
    return: FiberNode | null;
    /**
     * sibling:
     * 指向下一个兄弟节点
     */
    sibling: FiberNode | null;
    /**
     * child:
     * 指向第一个子节点.
     */
    child: FiberNode | null;
    /**
     * index:
     * fiber 在兄弟节点中的索引, 如果是单节点默认为 0
     */
    index: number;
    /**
     * updateQueue：
     * 存储state更新的队列, 当前节点的state改动之后, 
     * 都会创建一个update对象添加到这个队列中.
     */
    updateQueue: UpdateQueue | null;
    /**
     * memoizeState
     * 用于输出的state, 最终渲染所使用的state
     */
    memoizedState: any;
    /**
     * alternate:
     * 指向内存中的另一个 fiber, 每个被更新过 fiber 节点
     * 在内存中都是成对出现(current 和 workInProgress)
     */
    alternate: FiberNode | null

    /**
     * 
     * @param tag fiber类型
     * @param pendingProps ReactElement对象传入的 props
     * @param key ReactElement中的key
     */
    constructor(tag:WorkTag, pendingProps:Props, key: Key) {
        // 实例
        this.tag = tag
        this.key = key
        this.stateNode = null
        this.type = null

        // 树结构
        this.return = null
        this.sibling = null
        this.child = null
        this.index = 0

        this.ref = null

        // 状态
        this.pendingProps = pendingProps
        this.memoizedProps = null
        this.updateQueue = null

        // 副作用
        this.flags = NoFlags
        this.subtreeFlags = NoFlags

        this.alternate = null
    }
}

export class FiberRootNode {
    container:Container
    /**
     * current:
     * 当前fiber
     */
    current: FiberNode
    finishedWork: FiberNode | null
    constructor(container:Container, hostRootFiber:FiberNode){
        this.container = container
        this.current = hostRootFiber
        hostRootFiber.stateNode = this
        this.finishedWork = null
    }
}

export const createWorkInProgress = (
    current: FiberNode,
    pendingProps: Props
):FiberNode => {
    let wip = current.alternate

    if(wip === null) {
        // mount
        wip = new FiberNode(current.tag, pendingProps, current.key)
        wip.type = current.type
        wip.stateNode = current.stateNode

        wip.alternate = current
        current.alternate = wip
    } else {
        // update
        wip.pendingProps = pendingProps
    }

    wip.updateQueue = current.updateQueue
    wip.flags = current.flags
    wip.child = current.child

    // 数据
    wip.memoizedProps = current.memoizedProps
    wip.memoizedState = current.memoizedState

    return wip

}

export function createFiberFromElement(element:ReactElement):FiberNode{
    const {type, key, props} = element
    let fiberTag:WorkTag = FunctionComponent

    if(typeof type === 'string'){
        fiberTag = HostComponent
    }

    const fiber = new FiberNode(fiberTag, props, key)
    fiber.type = type

    return fiber
}