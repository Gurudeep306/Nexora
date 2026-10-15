import { createContext, useContext, useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuth } from '@/context/AuthContext'
import { API_BASE } from '@/lib/api'

const SocketContext = createContext<Socket | null>(null)

export function SocketProvider({ children, enabled = true }: { children: React.ReactNode; enabled?: boolean }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const { user } = useAuth()
  const username = user?.username

  useEffect(() => {
    if (!enabled || !username) return
    // Same origin by default (Vite proxies /socket.io in dev); on the split
    // deploy VITE_API_URL points at the API host. Either way the session cookie
    // rides along on the handshake (withCredentials); the server derives who we
    // are from it and registers presence on connect — no username is sent.
    const opts = { transports: ['websocket', 'polling'], withCredentials: true }
    const connection = API_BASE ? io(API_BASE, opts) : io(opts)
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
