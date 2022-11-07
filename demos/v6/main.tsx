

import {useState} from 'react'
import {createRoot} from 'react-dom/client'


function Child({num}:{num:number}) {
    return <div>{num}</div>
}

function App() {

    const [num, setNum] = useState(0)

    const isOdd = num % 2

    const randomNum = () => {
        setNum(num + 1)
    }

    return (
        <h3
            onClick={randomNum}
        >
            {num % 2 ? <Child num={num} /> : <p>click!!!</p>}
        </h3>
    )
}




createRoot(document.getElementById('root') as HTMLElement).render(<App />)