import { PackagedElement, updateFiberProps } from "./SyntheticEvent"

export type Container = PackagedElement | Document

export type Instance = PackagedElement

export type TextInstance = Text

export const createInstance = (type: string, props: any):Instance => {
    const element = document.createElement(type)
    return updateFiberProps(element, props)
}

export const appendInitialChild = (parent: Instance, child: Instance) => {
    parent.appendChild(child)
}

export const createTextInstance = (content: string) => {
    return document.createTextNode(content)
}

export const appendChildToContainer = (child: Instance, container: Container) => {
    container.appendChild(child)
}

export const removeChild = (child: Instance, container:Container) => {
    container.removeChild(child)
}

export const commitTextUpdate = (
    textInstance: TextInstance,
    content: string
) => {
    textInstance.nodeValue = content
}