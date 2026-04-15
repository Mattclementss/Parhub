// This file exists to satisfy the (app) route group structure.
// The root route (/) is owned by app/page.tsx.
// TODO: delete this file once it is no longer needed by the route group layout.
import { notFound } from 'next/navigation'

export default function Page() {
  notFound()
}
