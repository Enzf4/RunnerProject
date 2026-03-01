import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import axios from 'axios'

function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    // A quick test fetching a dummy JSON
    axios.get('https://jsonplaceholder.typicode.com/todos/1')
      .then(response => setData(response.data))
      .catch(error => console.error("Axios setup failed", error))
  }, [])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24 bg-zinc-950 text-white">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm flex flex-col gap-8">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
          Vite + React + Magic UI + Axios
        </h1>
        
        <div className="flex flex-col items-center gap-4 p-8 border border-zinc-800 rounded-xl bg-zinc-900/50 backdrop-blur-xl shadow-2xl">
          <p className="text-lg text-zinc-300">
            Click the button below to test Shadcn UI / Magic UI:
          </p>
          <Button onClick={() => alert('Magic UI (shadcn) button clicked!')} variant="default" size="lg" className="font-semibold shadow-lg shadow-emerald-500/20 border-emerald-500/50 hover:bg-emerald-500/20 text-emerald-400 bg-transparent">
            Click Me
          </Button>
        </div>

        {data && (
          <div className="mt-8 p-4 border border-zinc-800 rounded-lg bg-zinc-900 shadow-xl">
            <h2 className="text-xl font-semibold mb-2 text-emerald-400">Axios Test Successful!</h2>
            <pre className="text-xs text-zinc-400 overflow-x-auto text-left">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
