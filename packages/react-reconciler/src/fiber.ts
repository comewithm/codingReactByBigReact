import { Props, Key, Ref, ReactElement } from "shared/ReactTypes";
import { Lane, Lanes, NoLane, NoLanes } from "./fiberLanes";
import {Flags, NoFlags} from './fiberTags'
import {Container} from './hostConfig'
import {WorkTag, HostComponent, FunctionComponent} from './workTags'

export class FiberNode {
    /**
     * pendingProps:
     * 输入属性, 从ReactElement对象传入的 props. 
     * 用于和fiber.memoizedProps比较可以得出属性是否变动.
     */
    pendingProps:Props;
    /**
     * memoizedProps:
     * 上一次生成子节点时用到的属性, 生成子节点之后保持在内存中. 
     * 向下生成子节点之前叫做pendingProps, 生成子节点之后会把
     * pendingProps赋值给memoizedProps用于下一次比较.
     * pendingProps和memoizedProps比较可以得出属性是否变动.
     */
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
    /**
     * type:
     * 一般来讲和ReactElement组件的 type 一致
     */
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
     * 在ReactFiberFlags.js中定义了所有的标志位. 
     * reconciler阶段会将所有拥有flags标记的节点添加到副作用链表中, 
     * 等待 commit 阶段的处理.
     */
    flags: Flags;
    /**
     * subtreeFlags:
     * 替代 16.x 版本中的 firstEffect, nextEffect. 
     * 默认未开启, 当设置了enableNewReconciler=true 才会启用
     */
    subtreeFlags: Flags;
    deletions: FiberNode[] | null;
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
    updateQueue: unknown;
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

    lanes: Lanes
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
        this.deletions = null

        // 调度
        this.lanes = NoLane

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
    /** 所有未执行的lane集合 */
    pendingLanes: Lanes
    /** 本轮更新执行的lane */
    finishedLane: Lane
    constructor(container:Container, hostRootFiber:FiberNode){
        this.container = container
        this.current = hostRootFiber
        hostRootFiber.stateNode = this
        this.finishedWork = null
        this.pendingLanes = NoLanes
        this.finishedLane = NoLane
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
        wip.flags = NoFlags
        wip.subtreeFlags = NoFlags
        wip.deletions = null
        wip.type = current.type
    }

    wip.updateQueue = current.updateQueue
    wip.flags = current.flags
    wip.child = current.child

    // 数据
    wip.memoizedProps = current.memoizedProps
    wip.memoizedState = current.memoizedState

    wip.lanes = current.lanes

    return wip

}

export function createFiberFromElement(element:ReactElement):FiberNode{
    const {type, key, props} = element
    let fiberTag:WorkTag = FunctionComponent

    if(typeof type === 'string'){
        fiberTag = HostComponent
    } else if(typeof type !== 'function') {
        console.error('未定义的type类型', element)
    }

    const fiber = new FiberNode(fiberTag, props, key)
    fiber.type = type

    return fiber
}