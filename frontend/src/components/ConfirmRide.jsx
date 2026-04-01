import React, { useState, useContext } from 'react'
import { UserDataContext } from '../context/UserContext'
import Payment from './Payment'
import axios from 'axios'

const ConfirmRide = (props) => {
    const { user } = useContext(UserDataContext)
    const [paymentMethod, setPaymentMethod] = useState(props.paymentMethod || 'Cash')

    const vehicleType = props.vehicleType || 'AUTO'
    const fare = props.fare || {}
    const price = fare[vehicleType] ?? fare.price ?? 0

    const handleConfirm = async (paymentMeta = {}) => {
        if (paymentMethod === 'UPI' && !paymentMeta?.paymentAttempted) {
            alert('Pay with UPI first, or use QR + Confirm on desktop.')
            return
        }
        props.setVehicleFound(true)
        props.setConfirmRidePanel(false)
        const createdRide = await props.createRide({
            paymentMethod,
            customerName: user?.name,
            customerPhone: user?.phone
        })
        if (paymentMethod === 'UPI' && createdRide?._id) {
            try {
                const token = localStorage.getItem('token')
                const base = import.meta.env.VITE_BASE_URL || 'http://localhost:5001'
                const { data } = await axios.post(`${base}/rides/upi/verify`, {
                    rideId: createdRide._id,
                    transactionRef: paymentMeta.transactionRef || `txn_${Date.now()}`,
                    status: paymentMeta.status || 'PENDING',
                    amount: paymentMeta.amount || price,
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                if (data?.nextStep) {
                    // Ride flow continues; optional backend hint (non-blocking in production you’d use a toast)
                    console.info('[Ride]', data.nextStep)
                }
            } catch (err) {
                console.warn(err.response?.data?.message || 'UPI verify skipped; ride created.')
            }
        }
    }

    return (
        <div>
            <h5 className="p-1 text-center w-[93%] absolute top-0 cursor-pointer" onClick={() => props.setConfirmRidePanel(false)}>
                <i className="text-3xl text-gray-200 ri-arrow-down-wide-line"></i>
            </h5>
            <h3 className="text-2xl font-semibold mb-4">Confirm your ride</h3>

            <div className="w-full space-y-3">
                <div className="flex items-center gap-3 p-3 border-b">
                    <i className="ri-map-pin-user-fill text-emerald-600"></i>
                    <div>
                        <p className="text-sm text-gray-600">Pickup</p>
                        <p className="font-medium">{props.pickup}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 border-b">
                    <i className="ri-map-pin-2-fill text-emerald-600"></i>
                    <div>
                        <p className="text-sm text-gray-600">Drop</p>
                        <p className="font-medium">{props.destination}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 p-3 border-b">
                    <i className="ri-car-line text-emerald-600"></i>
                    <div>
                        <p className="text-sm text-gray-600">Vehicle</p>
                        <p className="font-medium">{vehicleType}</p>
                    </div>
                </div>
                {fare.distanceKm != null && (
                    <div className="flex items-center gap-3 p-3 border-b">
                        <i className="ri-roadster-line text-emerald-600"></i>
                        <div>
                            <p className="text-sm text-gray-600">Distance</p>
                            <p className="font-medium">{fare.distanceKm} km</p>
                        </div>
                    </div>
                )}
                <div className="flex items-center gap-3 p-3 border-b">
                    <i className="ri-currency-line text-emerald-600"></i>
                    <div>
                        <p className="text-sm text-gray-600">Total fare</p>
                        <p className="text-lg font-semibold">₹{price}</p>
                    </div>
                </div>

                <Payment
                    amount={price}
                    method={paymentMethod}
                    onMethodChange={setPaymentMethod}
                    onContinue={handleConfirm}
                />
            </div>
        </div>
    )
}

export default ConfirmRide
