import {useState} from 'react'
import {createRoot} from 'react-dom/client'

function App() {
    const [num, updateNum] = useState(0)

    const idOdd = num % 2

    return (
        <div>
            <h3
                onClick={(e) => {
                    updateNum(Math.ceil(Math.random() * 1000))
                }}
            >
                {idOdd ? <Child num={num} /> : <p>click!!!</p>}
            </h3>
            <p>brother text</p>
        </div>
    )
}

function Child({num} : {num: number}) {
    return <div>{num}</div>
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)