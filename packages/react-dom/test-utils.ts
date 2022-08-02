// import ReactDOM from "./index";
import {createRoot} from 'react-dom'
import { ReactElement } from "../shared/ReactTypes";

export const renderIntoDocument = (element: ReactElement) => {
    const div = document.createElement("div");
    // return ReactDOM.createRoot(div).render(element)
    return createRoot(div).render(element)
}