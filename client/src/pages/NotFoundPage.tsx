import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Button, EmptyState } from '@/components/ui'

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<Compass />}
      title="404 — Lost in the Rift"
      description="This sector doesn't exist. Teleport back to the hub."
      action={
        <Link to="/hub">
          <Button variant="primary">Back to Hub</Button>
        </Link>
      }
      className="py-24"
    />
  )
}
