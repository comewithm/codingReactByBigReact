import {useState} from 'react'
import {createRoot} from 'react-dom/client'

function App() {
    const [num, updateNum] = useState(0)

    const idOdd = num % 2

    return (
        <h3
            onClick={(e) => {
                updateNum(Math.ceil(Math.random() * 1000))
            }}
        >
            {idOdd ? <Child num={num} /> : <p>click!!!</p>}
        </h3>
    )
}

function Child({num} : {num: number}) {
    return <div>{num}</div>
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)