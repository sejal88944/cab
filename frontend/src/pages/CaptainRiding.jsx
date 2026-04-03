import React, { useRef, useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import axios from 'axios'
import FinishRide from '../components/FinishRide'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import RideMap from '../components/RideMap'
import LiveTracking from '../components/LiveTracking'
import { API_BASE_URL } from '../config/apiBaseUrl'

const defaultCenter = { lat: 18.5204, lng: 73.8567 }
const getCaptainToken = () => localStorage.getItem('captainToken') || localStorage.getItem('captain-token')

const CaptainRiding = () => {

    const [ finishRidePanel, setFinishRidePanel ] = useState(false)
    const finishRidePanelRef = useRef(null)
    const location = useLocation()
    const navigate = useNavigate()
    const rideData = location.state?.ride

    useEffect(() => {
        const token = getCaptainToken()
        if (!token) {
            navigate('/captain-login', { replace: true })
            return
        }
        if (!rideData?._id) {
            navigate('/captain-home', { replace: true })
        }
    }, [ rideData?._id, navigate ])
    const [ pickupCoords, setPickupCoords ] = useState(null)
    const [ dropCoords, setDropCoords ] = useState(null)
    const [ currentLocation, setCurrentLocation ] = useState(null)

    useEffect(() => {
        if (!rideData?.pickupLocation?.trim()) return
        axios.get(`${API_BASE_URL}/maps/get-coordinates`, {
            params: { address: rideData.pickupLocation.trim() },
            headers: { Authorization: `Bearer ${getCaptainToken()}` }
        }).then((res) => {
            if (res.data?.lat != null && res.data?.lng != null) setPickupCoords({ lat: res.data.lat, lng: res.data.lng })
        }).catch(() => {})
    }, [ rideData?.pickupLocation ])

    useEffect(() => {
        if (!rideData?.dropLocation?.trim()) return
        axios.get(`${API_BASE_URL}/maps/get-coordinates`, {
            params: { address: rideData.dropLocation.trim() },
            headers: { Authorization: `Bearer ${getCaptainToken()}` }
        }).then((res) => {
            if (res.data?.lat != null && res.data?.lng != null) setDropCoords({ lat: res.data.lat, lng: res.data.lng })
        }).catch(() => {})
    }, [ rideData?.dropLocation ])

    useEffect(() => {
        if (!navigator.geolocation) return
        const updatePos = (position) => {
            const { latitude, longitude } = position.coords
            setCurrentLocation({ lat: latitude, lng: longitude })
        }
        navigator.geolocation.getCurrentPosition(updatePos, () => setCurrentLocation(defaultCenter), { enableHighAccuracy: true })
        const watchId = navigator.geolocation.watchPosition(updatePos)
        return () => navigator.geolocation.clearWatch(watchId)
    }, [])



    useGSAP(function () {
        if (finishRidePanel) {
            gsap.to(finishRidePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(finishRidePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ finishRidePanel ])

    const openInGoogleMaps = () => {
        const dest = dropCoords || (rideData?.dropLocation ? encodeURIComponent(rideData.dropLocation) : null)
        const origin = currentLocation ? `${currentLocation.lat},${currentLocation.lng}` : (rideData?.pickupLocation ? encodeURIComponent(rideData.pickupLocation) : '')
        if (!dest) return
        const destStr = typeof dest === 'string' ? dest : `${dest.lat},${dest.lng}`
        const waypoints = pickupCoords && currentLocation ? `&waypoints=${pickupCoords.lat},${pickupCoords.lng}` : ''
        const url = `https://www.google.com/maps/dir/?api=1&destination=${destStr}&origin=${origin || ''}&travelmode=driving${waypoints}`
        window.open(url, '_blank', 'noopener,noreferrer')
    }

    const showRideMap = pickupCoords && dropCoords

    return (
        <div className='h-screen relative flex flex-col justify-end'>

            <div className='fixed p-6 top-0 flex items-center justify-between w-screen'>
                <img className='w-16' src="https://upload.wikimedia.org/wikipedia/commons/c/cc/RideEasy_logo_2018.png" alt="" />
                <Link to='/captain-home' className=' h-10 w-10 bg-white flex items-center justify-center rounded-full'>
                    <i className="text-lg font-medium ri-logout-box-r-line"></i>
                </Link>
            </div>

            <div className='h-1/5 p-6 flex items-center justify-between relative bg-yellow-400 pt-10'
                onClick={() => {
                    setFinishRidePanel(true)
                }}
            >
                <h5 className='p-1 text-center w-[90%] absolute top-0'><i className="text-3xl text-gray-800 ri-arrow-up-wide-line"></i></h5>
                <h4 className='text-xl font-semibold'>Route to drop</h4>
                <div className='flex items-center gap-2'>
                    {showRideMap && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); openInGoogleMaps(); }} className='bg-slate-700 hover:bg-slate-800 text-white font-semibold p-3 px-5 rounded-lg flex items-center gap-2'>
                            <i className="ri-navigation-line" /> Navigate
                        </button>
                    )}
                    <button type="button" onClick={(e) => { e.stopPropagation(); setFinishRidePanel(true); }} className='bg-green-600 text-white font-semibold p-3 px-10 rounded-lg'>Complete Ride</button>
                </div>
            </div>
            <div ref={finishRidePanelRef} className='fixed w-full z-[500] bottom-0 translate-y-full bg-white px-3 py-10 pt-12'>
                <FinishRide
                    ride={rideData}
                    setFinishRidePanel={setFinishRidePanel} />
            </div>

            <div className='h-screen fixed w-screen top-0 z-[-1]'>
                {showRideMap ? (
                    <RideMap
                        pickupCoords={pickupCoords}
                        dropCoords={dropCoords}
                        currentLocation={currentLocation}
                        showRoute
                        routeFromCurrent
                    />
                ) : (
                    <LiveTracking />
                )}
            </div>

        </div>
    )
}

export default CaptainRiding