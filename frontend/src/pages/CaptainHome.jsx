import React, { useRef, useState, useEffect, useContext } from 'react'
import { Link } from 'react-router-dom'
import CaptainDetails from '../components/CaptainDetails'
import RidePopUp from '../components/RidePopUp'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import ConfirmRidePopUp from '../components/ConfirmRidePopUp'
import { SocketContext } from '../context/SocketContext'
import { CaptainDataContext } from '../context/CaptainContext'
import LiveTracking from '../components/LiveTracking'
import axios from 'axios'
import { API_BASE_URL } from '../config/apiBaseUrl'

const getCaptainToken = () => localStorage.getItem('captainToken') || localStorage.getItem('captain-token')

const CaptainHome = () => {
    const [ ridePopupPanel, setRidePopupPanel ] = useState(false)
    const [ confirmRidePopupPanel, setConfirmRidePopupPanel ] = useState(false)
    const [, setPendingRides ] = useState([])
    const [ subscriptionStatus, setSubscriptionStatus ] = useState(null)
    const ridePopupPanelRef = useRef(null)
    const confirmRidePopupPanelRef = useRef(null)
    const [ ride, setRide ] = useState(null)
    const { socket } = useContext(SocketContext)
    const { captain } = useContext(CaptainDataContext)

    const ridePopupOpenRef = useRef(false)
    const confirmRideOpenRef = useRef(false)
    ridePopupOpenRef.current = ridePopupPanel
    confirmRideOpenRef.current = confirmRidePopupPanel

    useEffect(() => {
        if (!socket || !captain?._id) return
        const doJoin = () => {
            socket.emit('join', { userId: captain._id, userType: 'captain' })
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        socket.emit('driver:join', {
                            driverId: captain._id,
                            city: captain.city || 'Pune',
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                        })
                    },
                    () => {
                        socket.emit('driver:join', { driverId: captain._id, city: captain.city || 'Pune', lat: 18.5204, lng: 73.8567 })
                    }
                )
            } else {
                socket.emit('driver:join', { driverId: captain._id, city: captain.city || 'Pune' })
            }
        }
        doJoin()
        socket.on('connect', doJoin)
        const token = getCaptainToken()
        const fetchPending = () => axios.get(`${API_BASE_URL}/rides/pending`, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Cache-Control': 'no-cache',
            },
            params: { _ts: Date.now() },
        })
            .then((res) => {
                const list = res.data || []
                setPendingRides(list)
                if (!ridePopupOpenRef.current && !confirmRideOpenRef.current && list.length > 0) {
                    setRide(list[0])
                    setRidePopupPanel(true)
                }
            })
            .catch(() => setPendingRides([]))
        fetchPending()
        axios.get(`${API_BASE_URL}/driver-subscriptions/my-status`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setSubscriptionStatus(res.data))
            .catch(() => setSubscriptionStatus({ active: false }))
        const updateLocation = () => {
            if (!navigator.geolocation) return
            navigator.geolocation.getCurrentPosition((position) => {
                socket.emit('driver:location-update', {
                    driverId: captain._id,
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                })
            })
        }

        const locationInterval = setInterval(updateLocation, 10000)
        const pendingInterval = setInterval(fetchPending, 6000)
        updateLocation()

        return () => {
            socket.off('connect', doJoin)
            clearInterval(locationInterval)
            clearInterval(pendingInterval)
        }
    }, [ captain?._id, captain?.city, socket ])

    useEffect(() => {
        if (!socket) return

        const handleNewRide = (data) => {
            const r = data?.ride || data
            if (r) {
                setRide(r)
                setRidePopupPanel(true)
            }
        }

        socket.on('ride:new', handleNewRide)

        return () => {
            socket.off('ride:new', handleNewRide)
        }
    }, [socket])

    async function confirmRide() {
        if (!ride?._id) return
        try {
            const res = await axios.patch(`${API_BASE_URL}/rides/${ride._id}/accept`, {}, {
                headers: { Authorization: `Bearer ${getCaptainToken()}` }
            })
            setRide(res.data)
            setRidePopupPanel(false)
            setConfirmRidePopupPanel(true)
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to accept ride.')
            setRidePopupPanel(false)
        }
    }

    async function rejectRide() {
        if (!ride?._id) return
        try {
            await axios.patch(`${API_BASE_URL}/rides/${ride._id}/reject`, {}, {
                headers: { Authorization: `Bearer ${getCaptainToken()}` }
            })
            setRidePopupPanel(false)
            setRide(null)
        } catch (err) {
            alert(err.response?.data?.message || 'Reject failed')
        }
    }


    useGSAP(function () {
        if (ridePopupPanel) {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(ridePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ ridePopupPanel ])

    useGSAP(function () {
        if (confirmRidePopupPanel) {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(confirmRidePopupPanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ confirmRidePopupPanel ])

    return (
        <div className="min-h-[100dvh] flex flex-col bg-slate-900 text-slate-100">
            <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 sm:px-6 border-b border-slate-800">
                <div>
                    <p className="text-xs uppercase tracking-wide text-slate-500">Driver</p>
                    <h1 className="text-lg font-semibold text-white sm:text-xl">Dashboard</h1>
                </div>
                <Link
                    to="/captain/logout"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-200 hover:bg-slate-700"
                    aria-label="Logout"
                >
                    <i className="text-lg ri-logout-box-r-line" />
                </Link>
            </header>

            {/* Live map — no external brand GIF / logo */}
            <div className="min-h-[36vh] flex-1 w-full sm:min-h-[42vh] md:min-h-[48vh]">
                <LiveTracking />
            </div>

            <section className="shrink-0 rounded-t-2xl bg-white text-slate-900 shadow-[0_-12px_40px_rgba(0,0,0,0.2)] px-4 py-4 sm:px-6 max-h-[min(52vh,520px)] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
                <CaptainDetails />
                {subscriptionStatus && !subscriptionStatus.active && (
                    <p className="text-amber-600 text-sm mt-3">Activate subscription to receive ride requests.</p>
                )}
            </section>

            <div ref={ridePopupPanelRef} className='fixed w-full z-[100] bottom-0 translate-y-full bg-white text-slate-900 px-3 py-10 pt-12 shadow-[0_-8px_30px_rgba(0,0,0,0.15)] max-h-[85vh] overflow-y-auto'>
                <RidePopUp
                    ride={ride}
                    setRidePopupPanel={setRidePopupPanel}
                    confirmRide={confirmRide}
                    onReject={rejectRide}
                />
            </div>
            <div ref={confirmRidePopupPanelRef} className='fixed w-full h-screen z-[100] bottom-0 translate-y-full bg-white text-slate-900 px-3 py-10 pt-12'>
                <ConfirmRidePopUp
                    ride={ride}
                    setConfirmRidePopupPanel={setConfirmRidePopupPanel} setRidePopupPanel={setRidePopupPanel} />
            </div>
        </div>
    )
}

export default CaptainHome
