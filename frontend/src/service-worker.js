/* global self, clients */
/// <reference lib="webworker" />

import { precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { Queue } from 'workbox-background-sync'

// self.__WB_MANIFEST is injected at build time
precacheAndRoute(self.__WB_MANIFEST || [])

const OFFLINE_URL = '/offline.html'
const STATIC_CACHE = 'static-resources-v1'
const IMAGE_CACHE = 'image-assets-v1'
const API_CACHE = 'ride-api-v1'

// Offline fallback for navigation requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const preloadResponse = await event.preloadResponse
          if (preloadResponse) return preloadResponse
          return await fetch(request)
        } catch {
          const cache = await caches.open(STATIC_CACHE)
          const cached = await cache.match(OFFLINE_URL)
          return cached || Response.error()
        }
      })()
    )
  }
})

// Cache static assets (JS, CSS, HTML) with CacheFirst
registerRoute(
  ({ request, url }) =>
    ['style', 'script', 'document'].includes(request.destination) &&
    url.origin === self.location.origin,
  new CacheFirst({
    cacheName: STATIC_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60
      })
    ]
  })
)

// Cache images with CacheFirst
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: IMAGE_CACHE,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 30 * 24 * 60 * 60
      })
    ]
  })
)

// Ride / API calls with NetworkFirst to keep data fresh
registerRoute(
  ({ url }) =>
    url.pathname.startsWith('/rides') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/payments'),
  new NetworkFirst({
    cacheName: API_CACHE,
    networkTimeoutSeconds: 8,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 5 * 60
      })
    ]
  })
)

// Background sync queue for ride bookings
const rideQueue = new Queue('ride-bookings-queue')

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method === 'POST' && request.url.includes('/rides/create')) {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request.clone())
        } catch {
          await rideQueue.pushRequest({ request: request.clone() })
          return new Response(
            JSON.stringify({
              queued: true,
              message: 'You are offline. Ride will be created when you are back online.'
            }),
            {
              status: 202,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
      })()
    )
  }
})

// Push notifications scaffold
self.addEventListener('push', (event) => {
  if (!event.data) return
  const payload = event.data.json()
  const title = payload.title || 'RideEasy update'
  const body = payload.body || ''
  const data = payload.data || {}

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'
  event.waitUntil(
    (async () => {
      const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      const existing = allClients.find((c) => c.url.includes(self.registration.scope))
      if (existing) {
        existing.focus()
        existing.navigate(targetUrl)
      } else {
        clients.openWindow(targetUrl)
      }
    })()
  )
})

