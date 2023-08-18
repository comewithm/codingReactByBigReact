import {useState} from 'react'
import ReactDOM from 'react-dom'

function App() {
    const [num, setNum] = useState(20)

    const array = num % 2 === 0
        ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
        : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]
    return (
        <ul onClickCapture={() => setNum(num + 1)}>
			<li>4</li>
			<li>5</li>
			{array}
		</ul>
    )
}

function Child() {
    return (
        <span>big react</span>
    )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
    .render(<App />)