import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5001'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submitHandler = async (e) => {
    e.preventDefault()
    setError('')
    try {
      setLoading(true)
      const payload = { email: String(email).trim(), password: String(password).trim() }
      console.log('ADMIN LOGIN payload:', payload)
      const { data } = await axios.post(`${BASE_URL}/admin/login`, payload)
      localStorage.setItem('adminToken', data.token)
      navigate('/admin/dashboard')
    } catch (err) {
      console.log('ADMIN LOGIN error response:', err.response?.data)
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <Link to="/" className="text-emerald-600 font-bold text-xl">RideEasy</Link>
        <h1 className="text-2xl font-bold mt-4 mb-2">Admin Login</h1>
        <p className="text-slate-500 text-sm mb-6">Use your admin credentials</p>
        <form onSubmit={submitHandler} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sm@gmail.com"
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 placeholder:text-slate-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 placeholder:text-slate-500"
              required
            />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <Link to="/" className="block text-center text-slate-500 text-sm mt-4">Back to home</Link>
      </div>
    </div>
  )
}

export default AdminLogin
