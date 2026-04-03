import React, { useContext, useEffect, useState } from 'react'
import { CaptainDataContext } from '../context/CaptainContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { API_BASE_URL } from '../config/apiBaseUrl'

const CaptainProtectWrapper = ({
    children
}) => {

    const token = localStorage.getItem('captainToken') || localStorage.getItem('captain-token')
    const navigate = useNavigate()
    const { setCaptain } = useContext(CaptainDataContext)
    const [ isLoading, setIsLoading ] = useState(true)




    useEffect(() => {
        if (!token) {
            setIsLoading(false)
            navigate('/captain-login')
            return
        }

        setIsLoading(true)
        axios.get(`${API_BASE_URL}/captains/profile`, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }).then(response => {
            if (response.status === 200) {
                setCaptain(response.data.captain)
            }
        })
            .catch(() => {
                localStorage.removeItem('captainToken')
                localStorage.removeItem('captain-token')
                navigate('/captain-login')
            })
            .finally(() => setIsLoading(false))
    }, [ token, navigate, setCaptain ])

    

    if (isLoading) {
        return (
            <div>Loading...</div>
        )
    }



    return (
        <>
            {children}
        </>
    )
}

export default CaptainProtectWrapper