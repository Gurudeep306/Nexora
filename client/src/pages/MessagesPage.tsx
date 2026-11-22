/*
  /messages: the old address. Messages live in Community → Messages now
  (and the quick chat from the top bar), so this passes the conversation,
  person or invite on and replaces itself: Back never lands here again.
*/
import { Navigate, useLocation } from 'react-router-dom'

export default function MessagesPage() {
  const { search } = useLocation()
  const rest = new URLSearchParams(search)
  rest.delete('tab')
  const q = rest.toString()
  return <Navigate to={`/social?tab=messages${q ? `&${q}` : ''}`} replace />
}
