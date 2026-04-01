import React, { useContext, useState } from 'react'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { CaptainDataContext } from '../context/CaptainContext'

const Captainlogin = () => {

  const [ email, setEmail ] = useState('')
  const [ password, setPassword ] = useState('')
  const [ loading, setLoading ] = useState(false)
  const [ error, setError ] = useState('')

  const { setCaptain } = useContext(CaptainDataContext)
  const navigate = useNavigate()



  const submitHandler = async (e) => {
    e.preventDefault();
    setError('')
    const captain = {
      email: email,
      password
    }

    try {
      setLoading(true)
      const response = await axios.post(`${import.meta.env.VITE_BASE_URL}/captains/login`, captain)

      if (response.status === 200) {
        const data = response.data

        setCaptain(data.captain)
        localStorage.setItem('captainToken', data.token)
        navigate('/captain-home')

        setEmail('')
        setPassword('')
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password')
    } finally {
      setLoading(false)
    }
  }
  return (
    <div className='p-7 h-screen flex flex-col justify-between'>
      <div>
        <div className='mb-6'>
          <span className='inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/40'>
            <span className='text-xl font-bold text-emerald-500'>R</span>
          </span>
          <p className='mt-2 text-lg font-semibold'>RideEasy Driver</p>
        </div>

        <form onSubmit={(e) => {
          submitHandler(e)
        }}>
          <h3 className='text-lg font-medium mb-2'>What&apos;s your email</h3>
          <input
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
            }}
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
            type="email"
            placeholder='email@example.com'
          />

          <h3 className='text-lg font-medium mb-2'>Enter Password</h3>

          <input
            className='bg-[#eeeeee] mb-7 rounded-lg px-4 py-2 border w-full text-lg text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500'
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
            }}
            required type="password"
            placeholder='password'
          />

          <button
            disabled={loading}
            className='bg-[#111] text-white font-semibold mb-3 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base disabled:opacity-60'
          >{loading ? 'Logging in…' : 'Login'}</button>

          {error && (
            <p className="text-red-600 text-sm -mt-1 mb-3">{error}</p>
          )}

        </form>
        <p className='text-center'>Join a fleet? <Link to='/captain-signup' className='text-blue-600'>Register as a Captain</Link></p>
      </div>
      <div>
        <Link
          to='/login'
          className='bg-[#d5622d] flex items-center justify-center text-white font-semibold mb-5 rounded-lg px-4 py-2 w-full text-lg placeholder:text-base'
        >Sign in as User</Link>
      </div>
    </div>
  )
}

export default Captainlogin