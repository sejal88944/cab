import React, { useEffect, useRef, useState, useContext } from 'react'
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import axios from 'axios';
import 'remixicon/fonts/remixicon.css'
import LocationSearchPanel from '../components/LocationSearchPanel';
import VehiclePanel from '../components/VehiclePanel';
import ConfirmRide from '../components/ConfirmRide';
import LookingForDriver from '../components/LookingForDriver';
import WaitingForDriver from '../components/WaitingForDriver';
import { SocketContext } from '../context/SocketContext';
import { UserDataContext } from '../context/UserContext';
import { useNavigate, useLocation } from 'react-router-dom';
import LiveTracking from '../components/LiveTracking';
import RideMap from '../components/RideMap';
import GooglePlaceAutocomplete from '../components/GooglePlaceAutocomplete';

const Home = () => {
    const location = useLocation()
    const [ pickup, setPickup ] = useState(location?.state?.pickup || '')
    const [ destination, setDestination ] = useState(location?.state?.drop || location?.state?.destination || '')
    const [ city ] = useState(location?.state?.city || 'Pune')
    const [ panelOpen, setPanelOpen ] = useState(false)
    const vehiclePanelRef = useRef(null)
    const confirmRidePanelRef = useRef(null)
    const vehicleFoundRef = useRef(null)
    const waitingForDriverRef = useRef(null)
    const panelRef = useRef(null)
    const panelCloseRef = useRef(null)
    const [ vehiclePanel, setVehiclePanel ] = useState(false)
    const [ confirmRidePanel, setConfirmRidePanel ] = useState(false)
    const [ vehicleFound, setVehicleFound ] = useState(false)
    const [ waitingForDriver, setWaitingForDriver ] = useState(false)
    const [ pickupSuggestions, setPickupSuggestions ] = useState([])
    const [ destinationSuggestions, setDestinationSuggestions ] = useState([])
    const [ activeField, setActiveField ] = useState(null)
    const [ fare, setFare ] = useState({})
    const [ vehicleType, setVehicleType ] = useState(null)
    const [ ride, setRide ] = useState(null)
    const [ hasShownAcceptAlert, setHasShownAcceptAlert ] = useState(false)
    const [ pickupCoords, setPickupCoords ] = useState(null)
    const [ dropCoords, setDropCoords ] = useState(null)
    const [ driverCoords, setDriverCoords ] = useState(null)
    const [ passengerOtp, setPassengerOtp ] = useState('')
    const rideRef = useRef(null)
    rideRef.current = ride

    const navigate = useNavigate()

    const { socket } = useContext(SocketContext)
    const userContextValue = useContext(UserDataContext)
    const currentUser = userContextValue?.user ?? null

    useEffect(() => {
        if (socket && currentUser?._id) {
            socket.emit("join", { userType: "user", userId: currentUser._id });
        }
    }, [socket, currentUser?._id]);

    useEffect(() => {
        if (!socket) return;

        const handleRideAccepted = (payload) => {
            setVehicleFound(false);
            setWaitingForDriver(true);
            setRide(payload);
            const loc = payload?.captain?.location
            if (loc?.coordinates?.length === 2) {
                setDriverCoords({ lng: loc.coordinates[0], lat: loc.coordinates[1] })
            }
            if (!hasShownAcceptAlert) {
                setHasShownAcceptAlert(true)
                alert("Driver has accepted your ride")
            }
        };

        const handleStatusUpdate = (data) => {
            if (!data) return
            const rid = rideRef.current?._id
            if (data?.rideId && rid && data.rideId !== rid) return
            if (data?.status) {
                setRide((prev) => {
                    const base = { ...(prev || {}) }
                    if (data.ride) return { ...base, ...data.ride, status: data.status }
                    return { ...base, status: data.status }
                })
                if (data.status === 'arrived') setWaitingForDriver(true)
                if (data.status === 'started') {
                    setWaitingForDriver(false)
                    navigate('/riding', { state: { ride: { ...rideRef.current, status: 'started' } } })
                }
                if (data.status === 'completed') {
                    setWaitingForDriver(false)
                    setVehicleFound(false)
                }
            }
            if (data?.driverLocation?.lat != null && data?.driverLocation?.lng != null) {
                setDriverCoords({ lat: data.driverLocation.lat, lng: data.driverLocation.lng })
            }
        }

        socket.on('ride:accepted', handleRideAccepted);
        socket.on('ride:status-update', handleStatusUpdate)

        return () => {
            socket.off('ride:accepted', handleRideAccepted);
            socket.off('ride:status-update', handleStatusUpdate)
        };
    }, [socket, navigate, hasShownAcceptAlert]);

    useEffect(() => {
        if (!ride?._id) return
        if (![ 'searching', 'accepted', 'arrived' ].includes(ride.status)) return
        const token = localStorage.getItem('token')
        axios.get(`${import.meta.env.VITE_BASE_URL}/rides/${ride._id}/passenger-otp`, {
            headers: { Authorization: `Bearer ${token}` },
        }).then((res) => {
            if (res.data?.otp) setPassengerOtp(res.data.otp)
        }).catch(() => {})
    }, [ride?._id, ride?.status]);

    /** After accept, REST polling refreshes captain GPS (socket can miss); keeps driver marker on map. */
    useEffect(() => {
        if (!ride?._id) return
        if (![ 'accepted', 'arrived' ].includes(ride.status)) return
        const token = localStorage.getItem('token')
        const tick = () => {
            axios.get(`${import.meta.env.VITE_BASE_URL}/rides/${ride._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            }).then((res) => {
                const data = res.data
                setRide(data)
                const loc = data?.captain?.location
                if (loc?.coordinates?.length === 2) {
                    setDriverCoords({ lat: loc.coordinates[1], lng: loc.coordinates[0] })
                }
            }).catch(() => {})
        }
        tick()
        const id = setInterval(tick, 5000)
        return () => clearInterval(id)
    }, [ride?._id, ride?.status]);

    useEffect(() => {
        if (!ride?._id) return
        if (ride?.status && ride.status !== 'searching') return

        let cancelled = false
        const token = localStorage.getItem('token')

        const poll = async () => {
            try {
                // Keep attempting assignment while searching (Uber/Ola-like behavior)
                if (ride?.status === 'searching' && (!ride?.captain?._id && !ride?.captain)) {
                    await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/${ride._id}/retry-assign`, {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    }).catch(() => {})
                }
                const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/${ride._id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (cancelled) return

                const data = res.data
                setRide(data)

                if (data?.status === 'accepted') {
                    setVehicleFound(false)
                    setWaitingForDriver(true)
                    if (!hasShownAcceptAlert) {
                        setHasShownAcceptAlert(true)
                        alert("Driver has accepted your ride")
                    }
                }
            } catch {
                // ignore transient polling errors
            }
        }

        poll()
        const id = setInterval(poll, 5000)
        return () => {
            cancelled = true
            clearInterval(id)
        }
    }, [ride?._id, ride?.status, hasShownAcceptAlert]);


    const handlePickupChange = async (e) => {
        const value = e.target.value
        setPickup(value)
        const trimmed = value.trim()
        if (!trimmed) {
            setPickupSuggestions([])
            return
        }
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                params: { input: trimmed },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }

            })
            setPickupSuggestions(response.data)
        } catch {
            // handle error
        }
    }

    const handleDestinationChange = async (e) => {
        const value = e.target.value
        setDestination(value)
        const trimmed = value.trim()
        if (!trimmed) {
            setDestinationSuggestions([])
            return
        }
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-suggestions`, {
                params: { input: trimmed },
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`
                }
            })
            setDestinationSuggestions(response.data)
        } catch {
            // handle error
        }
    }

    const fetchPickupCoords = async (address) => {
        if (!address?.trim()) return
        try {
            const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                params: { address: address.trim() },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.data?.lat != null && res.data?.lng != null) {
                setPickupCoords({ lat: res.data.lat, lng: res.data.lng })
            }
        } catch {
            setPickupCoords(null)
        }
    }

    const fetchDropCoords = async (address) => {
        if (!address?.trim()) return
        try {
            const res = await axios.get(`${import.meta.env.VITE_BASE_URL}/maps/get-coordinates`, {
                params: { address: address.trim() },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            if (res.data?.lat != null && res.data?.lng != null) {
                setDropCoords({ lat: res.data.lat, lng: res.data.lng })
            }
        } catch {
            setDropCoords(null)
        }
    }

    const handleSelectPickup = (suggestion) => {
        const name = typeof suggestion === 'string' ? suggestion : suggestion?.name
        if (!name) return
        if (typeof suggestion === 'object' && suggestion?.lat != null && suggestion?.lng != null) {
            setPickupCoords({ lat: suggestion.lat, lng: suggestion.lng })
        } else {
            fetchPickupCoords(name)
        }
    }

    const handleSelectDestination = (suggestion) => {
        const name = typeof suggestion === 'string' ? suggestion : suggestion?.name
        if (!name) return
        if (typeof suggestion === 'object' && suggestion?.lat != null && suggestion?.lng != null) {
            setDropCoords({ lat: suggestion.lat, lng: suggestion.lng })
        } else {
            fetchDropCoords(name)
        }
    }

    const submitHandler = (e) => {
        e.preventDefault()
    }

    useGSAP(function () {
        if (panelOpen) {
            gsap.to(panelRef.current, {
                height: '70%',
                padding: 24
                // opacity:1
            })
            gsap.to(panelCloseRef.current, {
                opacity: 1
            })
        } else {
            gsap.to(panelRef.current, {
                height: '0%',
                padding: 0
                // opacity:0
            })
            gsap.to(panelCloseRef.current, {
                opacity: 0
            })
        }
    }, [ panelOpen ])


    useGSAP(function () {
        if (vehiclePanel) {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(vehiclePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ vehiclePanel ])

    useGSAP(function () {
        if (confirmRidePanel) {
            gsap.to(confirmRidePanelRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(confirmRidePanelRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ confirmRidePanel ])

    useGSAP(function () {
        if (vehicleFound) {
            gsap.to(vehicleFoundRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(vehicleFoundRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ vehicleFound ])

    useGSAP(function () {
        if (waitingForDriver) {
            gsap.to(waitingForDriverRef.current, {
                transform: 'translateY(0)'
            })
        } else {
            gsap.to(waitingForDriverRef.current, {
                transform: 'translateY(100%)'
            })
        }
    }, [ waitingForDriver ])


    async function findTrip() {
        const p = (pickup || '').trim()
        const d = (destination || '').trim()
        if (!p || !d) {
            alert('Please enter pickup and drop location to get fare.')
            return
        }
        setVehiclePanel(true)
        setPanelOpen(false)
        try {
            const response = await axios.get(`${import.meta.env.VITE_BASE_URL}/rides/get-fare`, {
                params: { pickup: p, destination: d },
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            setFare(response.data)
            fetchPickupCoords(p)
            fetchDropCoords(d)
        } catch (err) {
            alert(err.response?.data?.message || 'Could not get fare. Check locations.')
        }
    }

    async function createRide(opts = {}) {
        const { paymentMethod = 'Cash' } = opts
        const vehicleTypeNorm = [ 'BIKE', 'AUTO', 'MINI', 'CAR', 'SEDAN' ].includes(String(vehicleType)) ? String(vehicleType).toUpperCase() : vehicleType
        const price = fare[vehicleTypeNorm] ?? fare[vehicleType]
        if (price == null) {
            alert('Please select pickup, drop and vehicle type again.')
            return
        }
        try {
            setVehicleFound(true)
            setVehiclePanel(false)
            setConfirmRidePanel(false)
            const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/rides/create`, {
                pickupLocation: pickup,
                dropLocation: destination,
                city: city || 'Pune',
                vehicleType: vehicleTypeNorm,
                paymentMethod: paymentMethod || 'Cash',
                price,
                distanceKm: fare.distanceKm
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
            })
            const { otp: otpFromApi, ...ridePayload } = response.data
            setRide(ridePayload)
            setPassengerOtp(otpFromApi || '')
            setDriverCoords(null)
            setHasShownAcceptAlert(false)
            return ridePayload
        } catch (err) {
            setVehicleFound(false)
            alert(err.response?.data?.message || 'Booking failed')
            return null
        }
    }

    const handleVehicleTap = (type) => {
        setVehicleType(type)
    }

    const continueFromVehiclePanel = () => {
        if (!vehicleType) {
            alert('Please choose a ride')
            return
        }
        setVehiclePanel(false)
        setConfirmRidePanel(true)
    }

    const showSearchPanel = !(vehiclePanel || confirmRidePanel || vehicleFound || waitingForDriver)

    return (
        <div className='h-screen relative overflow-hidden'>
            <div className="absolute z-20 top-4 left-0 right-0 flex justify-center pointer-events-none">
                <img
                    className="w-16"
                    src="https://upload.wikimedia.org/wikipedia/commons/c/cc/RideEasy_logo_2018.png"
                    alt="RideEasy"
                />
            </div>
            <div className='h-screen w-screen relative z-0'>
                {(pickupCoords || dropCoords) ? (
                    <RideMap
                        pickupCoords={pickupCoords}
                        dropCoords={dropCoords}
                        driverCoords={driverCoords}
                        showRoute={!!(pickupCoords && dropCoords)}
                    />
                ) : (
                    <LiveTracking />
                )}
            </div>
            <div className='z-20 flex flex-col justify-end h-screen absolute top-0 w-full'>
                {showSearchPanel && (
                    <div className='h-[30%] p-6 bg-white text-slate-900 relative'>
                    <h5 ref={panelCloseRef} onClick={() => {
                        setPanelOpen(false)
                    }} className='absolute opacity-0 right-6 top-6 text-2xl'>
                        <i className="ri-arrow-down-wide-line"></i>
                    </h5>
                    <h4 className='text-2xl font-semibold'>Find a trip</h4>
                    <form className='relative py-3' onSubmit={(e) => {
                        submitHandler(e)
                    }}>
                        <div className="line absolute h-16 w-1 top-[50%] -translate-y-1/2 left-5 bg-gray-700 rounded-full"></div>
                        <input
                            onClick={() => {
                                setPanelOpen(true)
                                setActiveField('pickup')
                            }}
                            value={pickup}
                            onChange={handlePickupChange}
                            className='bg-[#eee] px-12 py-2 text-lg rounded-lg w-full'
                            type="text"
                            placeholder='Add a pick-up location'
                        />
                        <input
                            onClick={() => {
                                setPanelOpen(true)
                                setActiveField('destination')
                            }}
                            value={destination}
                            onChange={handleDestinationChange}
                            className='bg-[#eee] px-12 py-2 text-lg rounded-lg w-full  mt-3'
                            type="text"
                            placeholder='Enter your destination' />
                    </form>
                    <button
                        onClick={findTrip}
                        className='bg-black text-white px-4 py-2 rounded-lg mt-3 w-full'>
                        Find Trip
                    </button>
                    {import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
                        <div className="mt-3 space-y-2 border-t border-slate-200 pt-3">
                            <p className="text-xs font-medium text-slate-500">Google Places (optional)</p>
                            <GooglePlaceAutocomplete
                                placeholder="Pickup (Google)"
                                className="bg-emerald-50 px-3 py-2 rounded-lg w-full text-slate-900 text-sm border border-emerald-200"
                                onSelect={(place) => {
                                    const addr = place.formatted_address || place.name
                                    const loc = place.geometry?.location
                                    if (addr) setPickup(addr)
                                    if (loc) setPickupCoords({ lat: loc.lat(), lng: loc.lng() })
                                }}
                            />
                            <GooglePlaceAutocomplete
                                placeholder="Drop (Google)"
                                className="bg-emerald-50 px-3 py-2 rounded-lg w-full text-slate-900 text-sm border border-emerald-200"
                                onSelect={(place) => {
                                    const addr = place.formatted_address || place.name
                                    const loc = place.geometry?.location
                                    if (addr) setDestination(addr)
                                    if (loc) setDropCoords({ lat: loc.lat(), lng: loc.lng() })
                                }}
                            />
                        </div>
                    )}
                </div>
                )}
                <div
                    ref={panelRef}
                    className={`bg-white text-slate-900 h-0 ${showSearchPanel ? '' : 'hidden'}`}
                >
                    <LocationSearchPanel
                        suggestions={activeField === 'pickup' ? pickupSuggestions : destinationSuggestions}
                        setPickup={setPickup}
                        setDestination={setDestination}
                        activeField={activeField}
                        onSelectPickup={handleSelectPickup}
                        onSelectDestination={handleSelectDestination}
                    />
                </div>
            </div>
            <div ref={vehiclePanelRef} className='fixed w-full z-50 bottom-0 translate-y-full bg-white text-slate-900 px-3 py-10 pt-12 pb-24'>
                <VehiclePanel
                    selectedVehicle={vehicleType}
                    onSelectVehicle={handleVehicleTap}
                    onContinue={continueFromVehiclePanel}
                    city={city}
                    fare={fare} setConfirmRidePanel={setConfirmRidePanel} setVehiclePanel={setVehiclePanel} />
            </div>
            <div ref={confirmRidePanelRef} className='fixed w-full z-50 bottom-0 translate-y-full bg-white text-slate-900 px-3 py-6 pt-12 pb-24'>
                <ConfirmRide
                    createRide={createRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}

                    setConfirmRidePanel={setConfirmRidePanel} setVehicleFound={setVehicleFound} />
            </div>
            <div ref={vehicleFoundRef} className='fixed w-full z-50 bottom-0 translate-y-full bg-white text-slate-900 px-3 py-6 pt-12 pb-24'>
                <LookingForDriver
                    createRide={createRide}
                    pickup={pickup}
                    destination={destination}
                    fare={fare}
                    vehicleType={vehicleType}
                    setVehicleFound={setVehicleFound} />
            </div>
            <div ref={waitingForDriverRef} className='fixed w-full  z-50 bottom-0  bg-white text-slate-900 px-3 py-6 pt-12 pb-24'>
                <WaitingForDriver
                    ride={ride}
                    passengerOtp={passengerOtp}
                    driverCoords={driverCoords}
                    pickupCoords={pickupCoords}
                    setVehicleFound={setVehicleFound}
                    setWaitingForDriver={setWaitingForDriver}
                    waitingForDriver={waitingForDriver} />
            </div>
        </div>
    )
}

export default Home