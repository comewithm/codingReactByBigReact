import ReactDOM from "./index";

import { ReactElement } from "../shared/ReactTypes";

export const renderIntoDocument = (element: ReactElement) => {
    const div = document.createElement("div");
    return ReactDOM.createRoot(div).render(element)
}