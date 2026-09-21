import { createContext, useContext, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from '@/context/AuthContext'

const SocketContext = createContext<Socket | null>(null)

export function SocketProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const { user } = useAuth()
  const username = user?.username

  useEffect(() => {
    if (!enabled || !username) return
    const connection = io({ transports: ['websocket', 'polling'], withCredentials: true })
    connection.on('connect', () => {
      connection.emit('register-user', { username })
      setSocket(connection)
    })
    connection.on('disconnect', () => setSocket(null))
    return () => {
      connection.disconnect()
    }
  }, [enabled, username])

  return <SocketContext.Provider value={enabled && username ? socket : null}>{children}</SocketContext.Provider>
}

export function useSocket(): Socket | null {
  return useContext(SocketContext)
}
