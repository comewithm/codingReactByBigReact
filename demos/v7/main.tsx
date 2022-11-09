import {createRoot} from 'react-dom/client'
import {useState} from 'react'

function App() {
    const [num, updateNum] = useState(0)

    const isOdd = num % 2

    const before = [
		<li key={1}>1</li>,
		<li>2</li>,
		<li>3</li>,
		<li key={4}>4</li>
	];
	const after = [
		<li key={4}>4</li>,
		<li>2</li>,
		<li>3</li>,
		<li key={1}>1</li>
	];

    const listToUse = isOdd ? before : after

    return (
        <ul
            onClick={(e) => {
                console.log('click num')
                updateNum(num + 1)
            }}
        >
            {num ? before : after}
        </ul>
    )
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)