import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5001'

const AdminProtectWrapper = ({ children }) => {
  const token = localStorage.getItem('adminToken')
  const navigate = useNavigate()
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (!token) {
      navigate('/admin')
      return
    }
    axios.get(`${BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(() => setAllowed(true))
      .catch((err) => {
        // Only invalid/expired token should log out; network / 500 still show dashboard with error.
        if (err.response?.status === 401) {
          localStorage.removeItem('adminToken')
          navigate('/admin')
          return
        }
        setAllowed(true)
      })
  }, [token, navigate])

  if (!token) return null
  if (!allowed) return <div className="p-8 text-slate-700">Loading admin…</div>
  return <>{children}</>
}

export default AdminProtectWrapper
