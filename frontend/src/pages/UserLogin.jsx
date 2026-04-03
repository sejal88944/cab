import React, { useState, useContext } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { UserDataContext } from '../context/UserContext'
import { API_BASE_URL } from '../config/apiBaseUrl'

const UserLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const { setUser } = useContext(UserDataContext)
  const navigate = useNavigate()
  const location = useLocation()
  const submitHandler = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await axios.post(`${API_BASE_URL}/users/login`, { email, password })
      if (response.status === 200) {
        const data = response.data
        setUser(data.user)
        localStorage.setItem('token', data.token)
        navigate('/home', { state: location?.state })
      }
      setEmail('')
      setPassword('')
    } catch (error) {
      alert(error.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-7 min-h-screen flex flex-col justify-between">
      <div>
        <Link to="/" className="inline-block mb-6">
          <span className="text-2xl font-bold text-emerald-600">RideEasy</span>
        </Link>
        <form onSubmit={submitHandler}>
          <h3 className="text-lg font-medium mb-2">Email</h3>
          <input
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#eeeeee] mb-4 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            type="email"
            placeholder="email@example.com"
          />
          <h3 className="text-lg font-medium mb-2">Password</h3>
          <input
            required
            className="bg-[#eeeeee] mb-6 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            placeholder="Password"
          />
          <button
            disabled={loading}
            className="bg-[#111] text-white font-semibold rounded-lg px-4 py-2 w-full text-lg"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="text-center mt-4">New here? <Link to="/signup" className="text-emerald-600">Create account</Link></p>
      </div>
      <div className="space-y-3">
        <Link
          to="/captain-login"
          className="bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center text-white font-semibold rounded-lg px-4 py-2 w-full text-lg transition"
        >
          Sign in as Driver
        </Link>
        <Link to="/admin" className="block text-center text-slate-500 text-sm">Admin login</Link>
      </div>
    </div>
  )
}

export default UserLogin
