import { Link } from 'react-router-dom'
import { Button, EmptyState } from '@/components/ui'

export default function NotFoundPage() {
  return (
    <EmptyState
      icon="compass"
      title="404 — Lost in the Rift"
      description="This sector doesn't exist. Teleport back to the hub."
      action={
        <Link to="/hub">
          <Button variant="primary">Back to Home</Button>
        </Link>
      }
      className="py-24"
    />
  )
}
