

import {useState} from 'react'
import {createRoot} from 'react-dom/client'


function Child({num}:{num:number}) {
    return <div>{num}</div>
}

function App() {

    const [num, updateNum] = useState(0)

    const isOdd = num % 2

    const randomNum = () => {
        updateNum(num + 1)
    }

    return (
        <div>
            <h3
                onClick={(e) => {
                    updateNum(Math.ceil(Math.random() * 1000))
                }}
            >
                {isOdd ? <Child num={num} /> : <p>click!!!</p>}
            </h3>
            <p>brother text</p>
        </div>
    )
}




createRoot(document.getElementById('root') as HTMLElement).render(<App />)