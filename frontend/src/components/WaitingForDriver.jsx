import React, { useEffect, useMemo, useState } from 'react'
import RideStatusStepper from './RideStatusStepper'

const WaitingForDriver = (props) => {
  const [etaMinutes, setEtaMinutes] = useState(null)

  const canComputeEta = useMemo(() => {
    return props.driverCoords?.lat != null && props.driverCoords?.lng != null && props.pickupCoords?.lat != null && props.pickupCoords?.lng != null
  }, [props.driverCoords?.lat, props.driverCoords?.lng, props.pickupCoords?.lat, props.pickupCoords?.lng])

  useEffect(() => {
    let cancelled = false
    async function fetchEta() {
      if (!canComputeEta) {
        setEtaMinutes(null)
        return
      }
      try {
        const o = props.driverCoords
        const d = props.pickupCoords
        const url = `https://router.project-osrm.org/route/v1/driving/${o.lng},${o.lat};${d.lng},${d.lat}?overview=false`
        const res = await fetch(url)
        const data = await res.json()
        const sec = data?.routes?.[0]?.duration
        if (cancelled) return
        if (typeof sec === 'number' && Number.isFinite(sec)) setEtaMinutes(Math.max(1, Math.round(sec / 60)))
        else setEtaMinutes(null)
      } catch {
        if (!cancelled) setEtaMinutes(null)
      }
    }
    fetchEta()
    return () => { cancelled = true }
  }, [canComputeEta, props.driverCoords?.lat, props.driverCoords?.lng, props.pickupCoords?.lat, props.pickupCoords?.lng])

  return (
    <div>
      <h5 className='p-1 text-center w-[93%] absolute top-0' onClick={() => {
        props.setWaitingForDriver(false)
      }}><i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i></h5>

      <div className="mb-4">
        <RideStatusStepper status={props.ride?.status || 'accepted'} />
      </div>

      {props.ride?.status === 'accepted' && (
        <div className="mb-3 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-emerald-800 text-sm">
          Driver has accepted. Wait until driver arrives, then share OTP to start.
        </div>
      )}
      {props.ride?.status === 'arrived' && (
        <div className="mb-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-amber-900 text-sm">
          Driver has arrived. Share OTP to start the ride.
        </div>
      )}

      <div className='flex items-center justify-between'>
        <img className='h-12' src="https://swyft.pl/wp-content/uploads/2023/05/how-many-people-can-a-RideEasyx-take.jpg" alt="" />
        <div className='text-right'>
          <h2 className='text-lg font-medium capitalize'>{props.ride?.captain?.name || props.ride?.captain?.fullname?.firstname}</h2>
          <h4 className='text-xl font-semibold -mt-1 -mb-1'>{props.ride?.captain?.vehicle?.plate}</h4>
          <p className='text-sm text-gray-600'>Maruti Suzuki Alto</p>
          <p className='text-sm text-slate-700'>{etaMinutes != null ? `ETA: ${etaMinutes} min` : 'ETA: updating…'}</p>
          <h1 className='text-lg font-semibold font-mono tracking-widest'>{props.passengerOtp || '••••••'}</h1>
        </div>
      </div>

      <div className='flex gap-2 justify-between flex-col items-center'>
        <div className='w-full mt-5'>
          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="ri-map-pin-user-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>562/11-A</h3>
              <p className='text-sm -mt-1 text-gray-600'>{props.ride?.pickupLocation || props.ride?.pickup}</p>
            </div>
          </div>
          <div className='flex items-center gap-5 p-3 border-b-2'>
            <i className="text-lg ri-map-pin-2-fill"></i>
            <div>
              <h3 className='text-lg font-medium'>562/11-A</h3>
              <p className='text-sm -mt-1 text-gray-600'>{props.ride?.dropLocation || props.ride?.destination}</p>
            </div>
          </div>
          <div className='flex items-center gap-5 p-3'>
            <i className="ri-currency-line"></i>
            <div>
              <h3 className='text-lg font-medium'>₹{props.ride?.price ?? props.ride?.fare} </h3>
              <p className='text-sm -mt-1 text-gray-600'>{props.ride?.paymentMethod || 'Cash'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WaitingForDriver