import React, { useState, useContext } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { UserDataContext } from '../context/UserContext'
import { API_BASE_URL } from '../config/apiBaseUrl'

const UserSignup = () => {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [city, setCity] = useState('Pune')
  const [password, setPassword] = useState('')
  const [accountHolderName, setAccountHolderName] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifscCode, setIfscCode] = useState('')
  const [upiId, setUpiId] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { setUser } = useContext(UserDataContext)
  const submitHandler = async (e) => {
    e.preventDefault()
    try {
      setLoading(true)
      const response = await axios.post(`${API_BASE_URL}/users/register`, {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        city: city || 'Pune',
        password,
        bankDetails: {
          accountHolderName: accountHolderName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          upiId: upiId.trim().toLowerCase(),
        }
      })
      if (response.status === 201 || response.status === 200) {
        const data = response.data
        setUser(data.user)
        localStorage.setItem('token', data.token)
        navigate('/home', { state: location?.state })
      }
      setName('')
      setPhone('')
      setEmail('')
      setPassword('')
      setAccountHolderName('')
      setAccountNumber('')
      setIfscCode('')
      setUpiId('')
    } catch (error) {
      alert(error.response?.data?.message || 'Signup failed. Please check details.')
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
          <h3 className="text-lg font-medium mb-2">Your name</h3>
          <input
            required
            minLength={2}
            className="bg-[#eeeeee] mb-4 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            type="text"
            placeholder="Full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <h3 className="text-lg font-medium mb-2">Phone</h3>
          <input
            required
            className="bg-[#eeeeee] mb-4 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            type="tel"
            placeholder="10-digit mobile"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <h3 className="text-lg font-medium mb-2">City</h3>
          <select value={city} onChange={(e) => setCity(e.target.value)} className="bg-[#eeeeee] mb-4 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
            <option value="Pune">Pune</option>
            <option value="Kolhapur">Kolhapur</option>
          </select>
          <h3 className="text-lg font-medium mb-2">Email</h3>
          <input
            required
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[#eeeeee] mb-4 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <h3 className="text-lg font-medium mb-2">Password</h3>
          <input
            required
            minLength={6}
            type="password"
            placeholder="Min 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[#eeeeee] mb-6 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <div className="rounded-xl border border-slate-200 p-4 mb-6 bg-slate-50">
            <h3 className="text-lg font-semibold mb-3">Bank details (verification required)</h3>
            <input
              required
              minLength={2}
              className="bg-white mb-3 rounded-lg px-4 py-2 border w-full text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              type="text"
              placeholder="Account holder name"
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
            />
            <input
              required
              minLength={9}
              maxLength={18}
              className="bg-white mb-3 rounded-lg px-4 py-2 border w-full text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              type="text"
              inputMode="numeric"
              placeholder="Account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
            />
            <input
              required
              minLength={11}
              maxLength={11}
              className="bg-white mb-3 rounded-lg px-4 py-2 border w-full text-base uppercase text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              type="text"
              placeholder="IFSC (e.g. HDFC0001234)"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
            />
            <input
              required
              className="bg-white rounded-lg px-4 py-2 border w-full text-base text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              type="text"
              placeholder="UPI ID (e.g. name@okaxis)"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
            />
            <p className="text-xs text-slate-500 mt-2">Account verify झाल्यावरच signup complete होईल.</p>
          </div>
          <button
            disabled={loading}
            className="bg-[#111] text-white font-semibold rounded-lg px-4 py-2 w-full text-lg"
          >
            {loading ? 'Creating...' : 'Create account'}
          </button>
        </form>
        <p className="text-center mt-4">
          Already have an account? <Link to="/login" className="text-emerald-600">Login here</Link>
        </p>
      </div>
    </div>
  )
}

export default UserSignup
