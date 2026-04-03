import React, { useContext, useEffect, useState, useCallback } from 'react'
import { CaptainDataContext } from '../context/CaptainContext'
import axios from 'axios'
import { API_BASE_URL } from '../config/apiBaseUrl'

const getCaptainToken = () => localStorage.getItem('captainToken') || localStorage.getItem('captain-token')

const PLANS = {
    BIKE: { weekly: 29, monthly: 99, yearly: 999 },
    AUTO: { weekly: 49, monthly: 149, yearly: 1299 },
    MINI: { weekly: 69, monthly: 179, yearly: 1599 },
    CAR: { weekly: 79, monthly: 199, yearly: 1799 },
    SEDAN: { weekly: 79, monthly: 199, yearly: 1799 }
}

function formatRemaining (ms) {
    if (ms <= 0) return '0m'
    const s = Math.floor(ms / 1000)
    const d = Math.floor(s / 86400)
    const h = Math.floor((s % 86400) / 3600)
    const m = Math.floor((s % 3600) / 60)
    if (d > 0) return `${d}d ${h}h`
    if (h > 0) return `${h}h ${m}m`
    return `${m}m`
}

const CaptainDetails = () => {
    const { captain, setCaptain } = useContext(CaptainDataContext)
    const [earnings, setEarnings] = useState(null)
    const [subscription, setSubscription] = useState(null)
    const [plans, setPlans] = useState(null)
    const [subscribing, setSubscribing] = useState(false)
    const [selectedPlan, setSelectedPlan] = useState('weekly')
    const [isOnline, setIsOnline] = useState(captain?.status === 'active')
    const [togglingStatus, setTogglingStatus] = useState(false)
    const [now, setNow] = useState(() => Date.now())
    const [rideHistory, setRideHistory] = useState([])

    const refreshSubscription = useCallback(() => {
        const token = getCaptainToken()
        axios.get(`${API_BASE_URL}/driver-subscriptions/my-status`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setSubscription(res.data))
            .catch(() => setSubscription({ active: false }))
    }, [])

    useEffect(() => {
        setIsOnline(captain?.status === 'active')
    }, [captain?.status])

    useEffect(() => {
        // Immediate subscription fallback from login/profile payload
        if (!captain) return
        if (captain.subscriptionStatus || captain.subscriptionPlan || captain.subscriptionExpiresAt) {
            const exp = captain.subscriptionExpiresAt || null
            const active = captain.subscriptionStatus === 'active' && (!exp || new Date(exp) > new Date())
            setSubscription((prev) => prev || {
                active,
                subscription: {
                    status: captain.subscriptionStatus || 'none',
                    plan: captain.subscriptionPlan || null,
                    expiresAt: exp,
                    startedAt: captain.subscriptionStartedAt || null,
                },
            })
        }
    }, [captain])

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 1000)
        return () => window.clearInterval(id)
    }, [])

    useEffect(() => {
        if (!captain?._id) return
        const token = getCaptainToken()
        axios.get(`${API_BASE_URL}/captains/earnings`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setEarnings(res.data))
            .catch(() => setEarnings({ totalEarnings: 0, count: 0, todayEarnings: 0, todayRides: 0 }))
        refreshSubscription()
        axios.get(`${API_BASE_URL}/driver-subscriptions/plans`).then((res) => setPlans(res.data?.plans || PLANS))
        axios.get(`${API_BASE_URL}/captains/rides/history`, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => setRideHistory(res.data?.rides || []))
            .catch(() => setRideHistory([]))
    }, [captain?._id, refreshSubscription])

    const handleToggleOnline = () => {
        const next = isOnline ? 'inactive' : 'active'
        setTogglingStatus(true)
        const token = getCaptainToken()
        axios.post(`${API_BASE_URL}/captains/status`, { status: next }, { headers: { Authorization: `Bearer ${token}` } })
            .then((res) => {
                setIsOnline(res.data?.status === 'active')
                if (setCaptain) setCaptain({ ...captain, status: res.data?.status })
            })
            .catch((e) => alert(e.response?.data?.message || 'Could not update status'))
            .finally(() => setTogglingStatus(false))
    }

    const displayName = captain?.name || (captain?.fullname ? `${captain.fullname.firstname || ''} ${captain.fullname.lastname || ''}`.trim() : '') || 'Driver'
    const vt = (captain?.vehicleType === 'CAR' || captain?.vehicleType === 'SEDAN') ? 'CAR' : (captain?.vehicleType === 'MINI' ? 'MINI' : captain?.vehicleType === 'BIKE' ? 'BIKE' : 'AUTO')
    const planPrices = plans?.[vt] || PLANS[vt]
    const price = planPrices?.[selectedPlan]

    const handleSubscribe = () => {
        if (!price) return
        setSubscribing(true)
        const token = getCaptainToken()
        axios.post(`${API_BASE_URL}/driver-subscriptions/create`, {
            driverId: captain._id,
            plan: selectedPlan,
            paymentMode: 'Cash'
        }, { headers: { Authorization: `Bearer ${token}` } })
            .then(() => {
                refreshSubscription()
            })
            .catch((e) => alert(e.response?.data?.message || 'Subscribe failed'))
            .finally(() => setSubscribing(false))
    }

    const subExpiresAt = subscription?.subscription?.expiresAt
    const subExpiresMs = subExpiresAt ? Math.max(0, new Date(subExpiresAt).getTime() - now) : (subscription?.subscription?.expiresInMs ?? 0)

    const canGoOnline = captain?.approved !== false && subscription?.active

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-semibold">
                        {displayName.charAt(0)}
                    </div>
                    <div>
                        <h4 className="font-medium">{displayName}</h4>
                        <p className="text-sm text-slate-500">{captain?.vehicleType} • {captain?.vehicleNumber}</p>
                    </div>
                </div>
                <div className="text-right">
                    <h4 className="text-xl font-semibold">₹{earnings?.totalEarnings ?? 0}</h4>
                    <p className="text-sm text-slate-600">Wallet ₹{earnings?.walletBalance ?? 0}</p>
                    <p className="text-sm text-slate-600">Total ({earnings?.count ?? 0} rides)</p>
                    <p className="text-xs text-slate-500">Today: ₹{earnings?.todayEarnings ?? 0} ({earnings?.todayRides ?? 0} rides)</p>
                </div>
            </div>

            {captain?.approved === false && (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    Waiting for admin approval — you cannot go online until approved.
                </p>
            )}

            <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl">
                <span className="text-sm font-medium text-slate-700">Go online to receive rides</span>
                <button
                    type="button"
                    onClick={handleToggleOnline}
                    disabled={togglingStatus || (!isOnline && !canGoOnline)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition ${isOnline ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'} disabled:opacity-50`}
                >
                    {togglingStatus ? '…' : isOnline ? 'Online' : 'Offline'}
                </button>
            </div>

            <div className="p-3 bg-slate-100 rounded-xl space-y-2">
                <p className="text-sm font-medium text-slate-600">Subscription</p>
                <p className={subscription?.active ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                    {subscription?.active ? 'Active' : 'Inactive — Subscribe to accept rides'}
                </p>
                {subscription?.subscription?.expiresAt && (
                    <div className="text-xs text-slate-600 space-y-1">
                        <p>Ends: <span className="font-medium">{new Date(subscription.subscription.expiresAt).toLocaleString()}</span></p>
                        {subscription?.active && (
                            <p>Time left: <span className="font-mono font-semibold text-emerald-700">{formatRemaining(subExpiresMs)}</span></p>
                        )}
                        {subscription?.subscription?.plan && (
                            <p>Plan: <span className="capitalize">{subscription.subscription.plan}</span></p>
                        )}
                    </div>
                )}
                {!subscription?.active && planPrices && (
                    <div className="mt-3 space-y-2">
                        <select value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                            <option value="weekly">Weekly — ₹{planPrices.weekly}</option>
                            <option value="monthly">Monthly — ₹{planPrices.monthly}</option>
                            <option value="yearly">Yearly — ₹{planPrices.yearly}</option>
                        </select>
                        <button type="button" onClick={handleSubscribe} disabled={subscribing} className="w-full bg-emerald-600 text-white text-sm font-medium py-2 rounded-lg disabled:opacity-50">
                            {subscribing ? 'Activating...' : `Subscribe (₹${price}) — Cash`}
                        </button>
                    </div>
                )}
            </div>

            {rideHistory.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <p className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2">Recent rides</p>
                    <ul className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {rideHistory.slice(0, 8).map((r) => (
                            <li key={r._id} className="px-3 py-2 flex justify-between gap-2">
                                <span className="text-slate-600 truncate">{r.pickupLocation} → {r.dropLocation}</span>
                                <span className="shrink-0 font-medium">₹{r.price} · {r.status}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default CaptainDetails
