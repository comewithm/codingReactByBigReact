
import ReactDOM from 'react-dom'
import {useState, useTransition} from 'react'
import {TabButton} from './TabButton'
import { AboutTab } from './AboutTab'
import { PostsTab } from './PostsTab'
import { ContactTab } from './ContactTab'

function App() {

    const [tab, setTab] = useState('about')
    const [isPending, startTransition] =useTransition()

    const selectTab = (nextTab) => {
        // if(tab === nextTab) return

        startTransition(() => {
            setTab(nextTab)
        })
    }
    return (
        <>
            <TabButton isActive={tab === 'about'} onClick={() => selectTab('about')}>about Page</TabButton>
            <TabButton isActive={tab === 'posts'} onClick={() => selectTab('posts')}>posts Page</TabButton>
            <TabButton isActive={tab === 'contact'} onClick={() => selectTab('contact')}>contact Page</TabButton>
            <hr />

            {tab === 'about' && <AboutTab />}
			{tab === 'posts' && <PostsTab />}
			{tab === 'contact' && <ContactTab />}
        </>
    )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
    .render(<App />)