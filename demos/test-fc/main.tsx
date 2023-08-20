import {useState, useEffect} from 'react'
import ReactDOM from 'react-dom'

function App() {
    const [num, setNum] = useState(20)

    const array = num % 2 === 0
        ? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
        : [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>]

    useEffect(() => {
        console.log('App mount');
    }, []);

    useEffect(() => {
        console.log('num change create', num);
        return () => {
            console.log('num change destroy', num);
        };
    }, [num]);
    return (
        <>
            <ul onClickCapture={() => {
                setNum(num + 1)
                setNum(num + 1)
                setNum(num + 1)
            }}>
                <li>4</li>
                <li>5</li>
                {array}
            </ul>

            <ul onClick={() => setNum(50)}>
                {new Array(num).fill(0).map((_, i) => {
                    return <Child key={i}>{i}</Child>;
                })}
            </ul>
        </>
    )
}

function Child({ children }) {
	const now = performance.now();
	while (performance.now() - now < 4) {}
	return <li>{children}</li>;
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
    .render(<App />)