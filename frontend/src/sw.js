import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkOnly } from 'workbox-strategies'

precacheAndRoute(self.__WB_MANIFEST)

registerRoute(new NavigationRoute(new NetworkOnly()))

registerRoute(
  ({ url }) => url.pathname.startsWith('/api'),
  new NetworkOnly()
)
