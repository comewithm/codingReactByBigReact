import {createRoot} from 'react-dom/client'
import {useState} from 'react'

function App() {
    const [num, updateNum] = useState(1)

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

    console.warn('num is: ', num);

    return (
        <ul
            onClick={(e) => {
                console.log('click num')
                updateNum(num => num + 1)
                // updateNum(num + 2)
                // updateNum(num + 3)
                // updateNum(num + 4)
            }}
        >
            {listToUse}
        </ul>
    )
}

createRoot(document.getElementById('root') as HTMLElement).render(<App />)