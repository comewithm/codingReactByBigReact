export type Container = Element | Document

export type Instance = Element

export type TextInstance = Text

export const createInstance = (type: string) => {
    return document.createElement(type)
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