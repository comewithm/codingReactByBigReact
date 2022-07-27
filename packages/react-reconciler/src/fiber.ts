import { Props, Key, Ref } from "../../shared/ReactTypes";
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
    tag:WorkTag;
    flags: Flags;
    subtreeFlags: Flags;

    return: FiberNode | null;
    sibling: FiberNode | null;
    child: FiberNode | null;
    index: number;

    updateQueue: UpdateQueue | null;
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
    current: FiberNode
    constructor(container:Container, hostRootFiber:FiberNode){
        this.container = container
        this.current = hostRootFiber
        hostRootFiber.stateNode = this
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