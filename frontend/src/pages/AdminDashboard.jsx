import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5001'

const getAuthHeader = () => ({ Authorization: `Bearer ${localStorage.getItem('adminToken')}` })

const TAB_LABELS = {
  analytics: 'Analytics',
  users: 'Customers',
  drivers: 'Drivers',
  rides: 'Bookings',
  payments: 'Payments',
  pricing: 'Pricing',
}

const AdminDashboard = () => {
  const navigate = useNavigate()
  const [analytics, setAnalytics] = useState(null)
  const [analyticsError, setAnalyticsError] = useState('')
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [drivers, setDrivers] = useState([])
  const [rides, setRides] = useState([])
  const [payments, setPayments] = useState([])
  const [pricingJson, setPricingJson] = useState('')
  const [tab, setTab] = useState('analytics')
  const [tabError, setTabError] = useState('')

  useEffect(() => {
    setAnalyticsError('')
    setAnalyticsLoading(true)
    axios.get(`${BASE_URL}/admin/analytics`, { headers: getAuthHeader() })
      .then((res) => {
        setAnalytics(res.data)
        setAnalyticsError('')
      })
      .catch((err) => {
        setAnalytics(null)
        setAnalyticsError(err.response?.data?.message || err.message || 'Could not load analytics. Check VITE_BASE_URL and that the backend is running.')
      })
      .finally(() => setAnalyticsLoading(false))
  }, [])

  useEffect(() => {
    setTabError('')
    const h = { headers: getAuthHeader() }
    if (tab === 'users') {
      axios.get(`${BASE_URL}/admin/users`, h).then((res) => setUsers(res.data)).catch((e) => setTabError(e.response?.data?.message || e.message || 'Failed'))
    } else if (tab === 'drivers') {
      axios.get(`${BASE_URL}/admin/drivers`, h).then((res) => setDrivers(res.data)).catch((e) => setTabError(e.response?.data?.message || e.message || 'Failed'))
    } else if (tab === 'rides') {
      axios.get(`${BASE_URL}/admin/rides`, h).then((res) => setRides(res.data)).catch((e) => setTabError(e.response?.data?.message || e.message || 'Failed'))
    } else if (tab === 'payments') {
      axios.get(`${BASE_URL}/admin/payments`, h).then((res) => setPayments(res.data)).catch((e) => setTabError(e.response?.data?.message || e.message || 'Failed'))
    } else if (tab === 'pricing') {
      axios.get(`${BASE_URL}/admin/pricing`, h)
        .then((res) => setPricingJson(JSON.stringify(res.data.rates || {}, null, 2)))
        .catch((e) => {
          setPricingJson('{}')
          setTabError(e.response?.data?.message || e.message || 'Failed to load pricing')
        })
    }
  }, [tab])

  const approveDriver = (driverId) => {
    axios.put(`${BASE_URL}/admin/drivers/${driverId}/approve`, {}, { headers: getAuthHeader() })
      .then(() => setDrivers((d) => d.map((x) => (x._id === driverId ? { ...x, approved: true } : x))))
      .catch((e) => alert(e.response?.data?.message || 'Failed'))
  }

  const toggleUserBlock = (userId, blocked) => {
    axios.patch(`${BASE_URL}/admin/users/${userId}/block`, { blocked }, { headers: getAuthHeader() })
      .then(() => setUsers((list) => list.map((x) => (x._id === userId ? { ...x, blocked } : x))))
      .catch((e) => alert(e.response?.data?.message || 'Failed'))
  }

  const toggleDriverBlock = (driverId, blocked) => {
    axios.patch(`${BASE_URL}/admin/drivers/${driverId}/block`, { blocked }, { headers: getAuthHeader() })
      .then(() => setDrivers((list) => list.map((x) => (x._id === driverId ? { ...x, blocked } : x))))
      .catch((e) => alert(e.response?.data?.message || 'Failed'))
  }

  const savePricing = () => {
    try {
      const rates = JSON.parse(pricingJson)
      axios.put(`${BASE_URL}/admin/pricing`, { rates }, { headers: getAuthHeader() })
        .then((res) => {
          setPricingJson(JSON.stringify(res.data.rates || {}, null, 2))
          alert('Pricing saved')
        })
        .catch((e) => alert(e.response?.data?.message || 'Failed'))
    } catch {
      alert('Invalid JSON')
    }
  }

  const logout = () => {
    localStorage.removeItem('adminToken')
    navigate('/admin')
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <nav className="bg-slate-800 text-white flex justify-between items-center px-4 py-3">
        <span className="font-bold">RideEasy Admin</span>
        <div className="flex gap-4">
          <Link to="/" className="text-slate-300 hover:text-white text-sm">Home</Link>
          <button onClick={logout} className="text-slate-300 hover:text-white text-sm">Logout</button>
        </div>
      </nav>
      <div className="p-4 max-w-6xl mx-auto text-slate-900">
        <p className="text-sm text-slate-600 mb-4 max-w-3xl">
          <strong>Atlas:</strong> This app uses collections <code className="bg-slate-200 px-1 rounded text-xs">users</code> (customers),
          {' '}<code className="bg-slate-200 px-1 rounded text-xs">drivers</code> (captains),
          {' '}<code className="bg-slate-200 px-1 rounded text-xs">rides</code> (bookings),
          {' '}<code className="bg-slate-200 px-1 rounded text-xs">admins</code>, <code className="bg-slate-200 px-1 rounded text-xs">pricings</code>, <code className="bg-slate-200 px-1 rounded text-xs">blacklisttokens</code>.
          Empty collections named <em>bookings</em>, <em>customers</em>, <em>captions</em>, <em>token timers</em> are not from this app — you can drop them in Atlas if you created them by mistake.
        </p>

        <div className="flex gap-2 flex-wrap mb-6">
          {['analytics', 'users', 'drivers', 'rides', 'payments', 'pricing'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg font-medium ${tab === t ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 border'}`}
            >
              {TAB_LABELS[t] || t}
            </button>
          ))}
        </div>

        {analyticsError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm">
            {analyticsError}
          </div>
        )}
        {tabError && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
            {tabError}
          </div>
        )}

        {tab === 'analytics' && analyticsLoading && (
          <div className="bg-white rounded-xl p-8 shadow text-slate-600">Loading analytics…</div>
        )}

        {tab === 'analytics' && !analyticsLoading && analytics && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-slate-500 text-sm">Total Users</p>
                <p className="text-2xl font-bold">{analytics.totalUsers}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-slate-500 text-sm">Total Drivers</p>
                <p className="text-2xl font-bold">{analytics.totalDrivers}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-slate-500 text-sm">Active online drivers</p>
                <p className="text-2xl font-bold">{analytics.activeDriversOnline ?? 0}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-slate-500 text-sm">Total Rides</p>
                <p className="text-2xl font-bold">{analytics.totalRides}</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow">
                <p className="text-slate-500 text-sm">Ride fare total (₹)</p>
                <p className="text-2xl font-bold">{analytics.totalRevenue ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">All completed passenger fares</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow border-l-4 border-emerald-600">
                <p className="text-slate-500 text-sm">Platform income (₹)</p>
                <p className="text-2xl font-bold text-emerald-800">{analytics.platformIncomeTotal ?? 0}</p>
                <p className="text-xs text-slate-400 mt-1">Commission from rides (est. if fee missing)</p>
              </div>
            </div>
            {(analytics.completedRideCount != null || analytics.completedWithCaptainCount != null) && (
              <p className="text-sm text-slate-600 bg-white rounded-lg px-4 py-3 border border-slate-200 shadow-sm">
                Completed rides (Atlas <code className="bg-slate-100 px-1 rounded text-xs">rides</code>):{' '}
                <strong>{analytics.completedRideCount ?? '—'}</strong>
                {' · '}With driver <code className="bg-slate-100 px-1 rounded text-xs">captain</code> set:{' '}
                <strong>{analytics.completedWithCaptainCount ?? '—'}</strong>
                {analytics.completedRideCount > 0 &&
                  analytics.completedWithCaptainCount < analytics.completedRideCount && (
                  <span className="text-amber-700"> — Some completed rides have no captain; per-driver totals stay 0 until <code className="bg-amber-50 px-1 rounded text-xs">captain</code> is set.</span>
                )}
              </p>
            )}
            {analytics.cityAnalytics && (
              <div>
                <h3 className="font-semibold mb-3">City analytics</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 shadow border-l-4 border-emerald-500">
                    <p className="font-medium text-emerald-700">Pune</p>
                    <p className="text-slate-600 text-sm">Rides: {analytics.cityAnalytics.Pune?.rides ?? 0} | Drivers: {analytics.cityAnalytics.Pune?.drivers ?? 0} | Revenue: ₹{analytics.cityAnalytics.Pune?.revenue ?? 0}</p>
                  </div>
                  <div className="bg-white rounded-xl p-4 shadow border-l-4 border-teal-500">
                    <p className="font-medium text-teal-700">Kolhapur</p>
                    <p className="text-slate-600 text-sm">Rides: {analytics.cityAnalytics.Kolhapur?.rides ?? 0} | Drivers: {analytics.cityAnalytics.Kolhapur?.drivers ?? 0} | Revenue: ₹{analytics.cityAnalytics.Kolhapur?.revenue ?? 0}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'users' && (
          <div className="bg-white rounded-xl overflow-hidden shadow">
            <table className="w-full text-left">
              <thead className="bg-slate-100">
                <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">City</th><th className="p-3">Blocked</th><th className="p-3">Action</th></tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-t">
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.phone}</td>
                    <td className="p-3">{u.city || '—'}</td>
                    <td className="p-3">{u.blocked ? 'Yes' : 'No'}</td>
                    <td className="p-3">
                      <button type="button" className="text-emerald-600 font-medium" onClick={() => toggleUserBlock(u._id, !u.blocked)}>
                        {u.blocked ? 'Unblock' : 'Block'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'drivers' && (
          <div className="bg-white rounded-xl overflow-hidden shadow overflow-x-auto">
            <p className="text-xs text-slate-500 px-4 pt-3">Drivers — MongoDB collection <code className="bg-slate-100 rounded px-1">drivers</code></p>
            <table className="w-full text-left min-w-[900px]">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">City</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Subscription</th>
                  <th className="p-3 text-right">Rides done</th>
                  <th className="p-3 text-right">Driver income (₹)</th>
                  <th className="p-3 text-right">Platform (₹)</th>
                  <th className="p-3">Approved</th>
                  <th className="p-3">Blocked</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map((d) => (
                  (() => {
                    const subStatus = d.effectiveSubscriptionStatus || d.subscriptionStatus
                    return (
                  <tr key={d._id} className="border-t">
                    <td className="p-3 font-medium">
                      <div className="flex flex-col">
                        <span>{d.name}</span>
                        <span className="mt-1 text-[11px] font-normal text-slate-500 md:hidden">
                          Rides: <span className="tabular-nums">{d.completedRides ?? 0}</span>
                          {' · '}Income: ₹<span className="tabular-nums">{d.driverIncome ?? 0}</span>
                          {' · '}Platform: ₹<span className="tabular-nums">{d.platformShare ?? 0}</span>
                        </span>
                      </div>
                    </td>
                    <td className="p-3 text-sm">{d.email}</td>
                    <td className="p-3">{d.city || '—'}</td>
                    <td className="p-3 text-sm">{d.vehicleType} {d.vehicleNumber}</td>
                    <td className="p-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${subStatus === 'active' ? 'bg-emerald-100 text-emerald-800' : subStatus === 'expired' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                        {subStatus || '—'}
                      </span>
                      {(d.subscriptionPlan || d.subscriptionExpiresAt) && (
                        <div className="mt-1 text-[11px] text-slate-500">
                          {d.subscriptionPlan ? <span className="capitalize">{d.subscriptionPlan}</span> : null}
                          {d.subscriptionPlan && d.subscriptionExpiresAt ? ' · ' : null}
                          {d.subscriptionExpiresAt ? `Ends ${new Date(d.subscriptionExpiresAt).toLocaleDateString()}` : null}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-right tabular-nums">{d.completedRides ?? 0}</td>
                    <td className="p-3 text-right tabular-nums font-medium">{d.driverIncome ?? 0}</td>
                    <td className="p-3 text-right tabular-nums text-slate-600">{d.platformShare ?? 0}</td>
                    <td className="p-3">{d.approved ? 'Yes' : 'No'}</td>
                    <td className="p-3">{d.blocked ? 'Yes' : 'No'}</td>
                    <td className="p-3 flex flex-col gap-1 items-start">
                      {!d.approved && <button type="button" onClick={() => approveDriver(d._id)} className="text-emerald-600 font-medium">Approve</button>}
                      <button type="button" className="text-amber-700 font-medium" onClick={() => toggleDriverBlock(d._id, !d.blocked)}>{d.blocked ? 'Unblock' : 'Block'}</button>
                    </td>
                  </tr>
                    )
                  })()
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'rides' && (
          <div className="bg-white rounded-xl overflow-hidden shadow overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="bg-slate-100">
                <tr><th className="p-3">City</th><th className="p-3">Pickup</th><th className="p-3">Drop</th><th className="p-3">Price</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {rides.map((r) => (
                  <tr key={r._id} className="border-t">
                    <td className="p-3">{r.city || '—'}</td>
                    <td className="p-3">{r.pickupLocation}</td>
                    <td className="p-3">{r.dropLocation}</td>
                    <td className="p-3">₹{r.price}</td>
                    <td className="p-3">{r.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'payments' && (
          <div className="bg-white rounded-xl overflow-hidden shadow">
            <table className="w-full text-left">
              <thead className="bg-slate-100">
                <tr><th className="p-3">Type</th><th className="p-3">Amount</th><th className="p-3">Mode</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p._id} className="border-t">
                    <td className="p-3">{p.type}</td>
                    <td className="p-3">₹{p.amount}</td>
                    <td className="p-3">{p.paymentMode}</td>
                    <td className="p-3">{p.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'pricing' && (
          <div className="bg-white rounded-xl p-4 shadow space-y-3">
            <p className="text-sm text-slate-600">Edit per-vehicle <code className="bg-slate-100 px-1 rounded">baseFare</code>, <code className="bg-slate-100 px-1 rounded">perKm</code>, <code className="bg-slate-100 px-1 rounded">platformFee</code> (JSON).</p>
            <textarea
              className="w-full h-64 font-mono text-sm border rounded-lg p-3"
              value={pricingJson}
              onChange={(e) => setPricingJson(e.target.value)}
            />
            <button type="button" onClick={savePricing} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium">Save pricing</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
