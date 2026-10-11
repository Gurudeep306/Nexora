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
    // Same-origin (Vite proxies /socket.io in dev) so the session cookie rides
    // along on the handshake; the server derives who we are from it and
    // registers presence on connect — no username is sent.
    const connection = io({ transports: ['websocket', 'polling'], withCredentials: true })
    connection.on('connect', () => setSocket(connection))
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
