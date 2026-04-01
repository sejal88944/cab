import React, { useEffect, useMemo, useState } from 'react'
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'

const containerStyle = { width: '100%', height: '100%' }
const defaultCenter = { lat: 18.5204, lng: 73.8567 }

const DefaultIcon = L.icon({
    iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).toString(),
    iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).toString(),
    shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).toString(),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
})

const driverDivIcon = L.divIcon({
    className: 'driver-live-marker',
    html: '<div style="width:20px;height:20px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
})

/** Leaflet MapContainer only uses initial center — keep map framing pickup/drop/driver as they update. */
function MapBoundsSync({ pickupCoords, dropCoords, driverCoords }) {
    const map = useMap()
    useEffect(() => {
        if (driverCoords?.lat != null && driverCoords?.lng != null) {
            map.setView([driverCoords.lat, driverCoords.lng], Math.max(map.getZoom(), 14), { animate: true })
            return
        }
        const pts = []
        if (pickupCoords?.lat != null && pickupCoords?.lng != null) {
            pts.push(L.latLng(pickupCoords.lat, pickupCoords.lng))
        }
        if (dropCoords?.lat != null && dropCoords?.lng != null) {
            pts.push(L.latLng(dropCoords.lat, dropCoords.lng))
        }
        if (pts.length === 0) return
        if (pts.length === 1) {
            map.setView(pts[0], 14, { animate: true })
            return
        }
        map.fitBounds(L.latLngBounds(pts), { padding: [56, 56], maxZoom: 16, animate: true })
    }, [
        map,
        pickupCoords?.lat,
        pickupCoords?.lng,
        dropCoords?.lat,
        dropCoords?.lng,
        driverCoords?.lat,
        driverCoords?.lng,
    ])
    return null
}

const RideMap = ({
    pickupCoords = null,
    dropCoords = null,
    driverCoords = null,
    currentLocation = null,
    showRoute = true,
    zoom = 14,
    routeFromCurrent = false,
}) => {
    const [routeLine, setRouteLine] = useState([])

    const center = useMemo(() => {
        if (driverCoords?.lat != null && driverCoords?.lng != null) return driverCoords
        if (pickupCoords?.lat != null && pickupCoords?.lng != null) return pickupCoords
        if (dropCoords?.lat != null && dropCoords?.lng != null) return dropCoords
        if (currentLocation?.lat != null && currentLocation?.lng != null) return currentLocation
        return defaultCenter
    }, [pickupCoords, dropCoords, driverCoords, currentLocation])

    const hasPickupAndDrop = pickupCoords?.lat != null && pickupCoords?.lng != null && dropCoords?.lat != null && dropCoords?.lng != null
    const hasCurrentForRoute = routeFromCurrent && currentLocation?.lat != null && currentLocation?.lng != null
    const shouldFetchRoute = showRoute && hasPickupAndDrop && (routeFromCurrent ? hasCurrentForRoute : true)
    const origin = routeFromCurrent && hasCurrentForRoute ? currentLocation : pickupCoords
    const destination = dropCoords

    useEffect(() => {
        let cancelled = false
        async function fetchRoute() {
            if (!shouldFetchRoute || !origin || !destination) {
                setRouteLine([])
                return
            }
            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`
                const res = await fetch(url)
                const data = await res.json()
                const coords = data?.routes?.[0]?.geometry?.coordinates || []
                if (cancelled) return
                setRouteLine(coords.map(([lng, lat]) => [lat, lng]))
            } catch {
                if (!cancelled) setRouteLine([])
            }
        }
        fetchRoute()
        return () => {
            cancelled = true
        }
    }, [shouldFetchRoute, origin?.lat, origin?.lng, destination?.lat, destination?.lng])

    return (
        <div className="relative w-full h-full z-0">
            <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={containerStyle} zoomControl>
                <MapBoundsSync
                    pickupCoords={pickupCoords}
                    dropCoords={dropCoords}
                    driverCoords={driverCoords}
                />
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {pickupCoords?.lat != null && pickupCoords?.lng != null && (
                    <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={DefaultIcon} />
                )}
                {dropCoords?.lat != null && dropCoords?.lng != null && (
                    <Marker position={[dropCoords.lat, dropCoords.lng]} icon={DefaultIcon} />
                )}
                {driverCoords?.lat != null && driverCoords?.lng != null && (
                    <Marker position={[driverCoords.lat, driverCoords.lng]} icon={driverDivIcon} />
                )}

                {routeLine.length > 1 && (
                    <Polyline positions={routeLine} pathOptions={{ color: '#0f172a', weight: 5 }} />
                )}
            </MapContainer>
        </div>
    )
}

export default RideMap
