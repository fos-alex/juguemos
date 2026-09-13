import { createRootRoute, Outlet } from '@tanstack/react-router'
import { UpdateBanner } from '../components/UpdateBanner'

export const Route = createRootRoute({
  component: RootLayout,
})

function RootLayout() {
  return (
    <>
      <Outlet />
      <UpdateBanner />
    </>
  )
}
