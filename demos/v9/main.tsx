import {createRoot} from 'react-dom/client'
import {useState, useEffect} from 'react'

function App() {
    const [num, updateNum] = useState(0)

    useEffect(() => {
        console.warn("hello app")

        return () => {
            console.warn("bye app")
        }
    })

    return (
        <ul onClick={() => {
            updateNum(num + 1)
        }}>
            Jacob: {num === 1 ? null : <Child />}
        </ul>
    )
    
}

function Child() {
    useEffect(() => {
        console.warn("hello child")

        return () => {
            console.warn("bye child")
        }
    })

    return <p>Child.</p>
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)