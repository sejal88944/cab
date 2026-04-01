import React, { useMemo, useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet'

const containerStyle = { width: '100%', height: '100%' }
const defaultCenter = { lat: 18.5204, lng: 73.8567 } // Pune

const LiveTracking = () => {
    const [currentPosition, setCurrentPosition] = useState(defaultCenter)
    const center = useMemo(() => [currentPosition.lat, currentPosition.lng], [currentPosition.lat, currentPosition.lng])

    useEffect(() => {
        if (!navigator.geolocation) return
        const updatePos = (position) => {
            const { latitude, longitude } = position.coords
            setCurrentPosition({ lat: latitude, lng: longitude })
        }
        navigator.geolocation.getCurrentPosition(updatePos, () => {}, { enableHighAccuracy: true })
        const watchId = navigator.geolocation.watchPosition(updatePos)
        return () => navigator.geolocation.clearWatch(watchId)
    }, [])

    return (
        <div className="relative w-full h-full">
            <MapContainer center={center} zoom={15} style={containerStyle} zoomControl>
                <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <CircleMarker
                    center={center}
                    radius={8}
                    pathOptions={{ color: 'white', weight: 2, fillColor: '#10b981', fillOpacity: 1 }}
                />
            </MapContainer>
        </div>
    )
}

export default LiveTracking
