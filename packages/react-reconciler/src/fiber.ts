import { Props, Key, Ref } from "../../shared/ReactTypes";
import {Flags, NoFlags} from './fiberTags'
import {Container} from './hostConfig'
import {UpdateQueue} from './updateQueue'
import {WorkTag, HostComponent, FunctionComponent} from './workTags'

export class FiberNode {
    pendingProps:Props;
    memoizedProps: Props | null;
    key: Key;
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

    alternate: FiberNode | null

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