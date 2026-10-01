import React, { useState } from 'react'
import { useAppContext } from '../context/AppContext'

const Assistant = () => {
  const { axios } = useAppContext()
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Hello! I can help with availability, pricing, locations and bookings. Ask me about cars.' }
  ])
  const [loading, setLoading] = useState(false)

  const send = async () => {
    if (!input.trim()) return
    const userMsg = { from: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)
    setInput('')
    try {
      const { data } = await axios.post('/api/assistant', { message: userMsg.text })
      if (data && data.success) {
        setMessages(prev => [...prev, { from: 'bot', text: data.reply }])
      } else {
        setMessages(prev => [...prev, { from: 'bot', text: data.message || 'Sorry, something went wrong.' }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { from: 'bot', text: error.message }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className='fixed right-6 bottom-6 bg-primary text-white px-4 py-3 rounded-full shadow-lg z-50'>
        {open ? 'Close' : 'Assistant'}
      </button>

      {open && (
        <div className='fixed right-6 bottom-20 w-80 max-w-xs bg-white border rounded-lg shadow-lg z-50 flex flex-col overflow-hidden'>
          <div className='px-3 py-2 bg-primary text-white'>AI Assistant</div>
          <div className='p-3 flex-1 h-64 overflow-auto' style={{ maxHeight: '16rem' }}>
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 ${m.from === 'bot' ? 'text-left' : 'text-right'}`}>
                <div className={`inline-block px-3 py-2 rounded ${m.from === 'bot' ? 'bg-gray-100 text-gray-900' : 'bg-primary text-white'}`}>{m.text}</div>
              </div>
            ))}
          </div>
          <div className='p-3 border-t flex gap-2'>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className='flex-1 px-2 py-2 border rounded-md outline-none' placeholder='Ask about cars, e.g. availability in Kadri' />
            <button onClick={send} disabled={loading} className='px-3 py-2 bg-primary text-white rounded-md'>{loading ? '...' : 'Send'}</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Assistant
