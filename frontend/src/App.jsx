import React, { Suspense, lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import InstallPWAButton from './components/InstallPWAButton'
import BottomNav from './components/BottomNav'
import 'remixicon/fonts/remixicon.css'

const Landing = lazy(() => import('./pages/Landing'))
const UserLogin = lazy(() => import('./pages/UserLogin'))
const UserSignup = lazy(() => import('./pages/UserSignup'))
const Captainlogin = lazy(() => import('./pages/Captainlogin'))
const CaptainSignup = lazy(() => import('./pages/CaptainSignup'))
const Home = lazy(() => import('./pages/Home'))
const UserProtectWrapper = lazy(() => import('./pages/UserProtectWrapper'))
const UserLogout = lazy(() => import('./pages/UserLogout'))
const CaptainHome = lazy(() => import('./pages/CaptainHome'))
const CaptainProtectWrapper = lazy(() => import('./pages/CaptainProtectWrapper'))
const CaptainLogout = lazy(() => import('./pages/CaptainLogout'))
const Riding = lazy(() => import('./pages/Riding'))
const CaptainRiding = lazy(() => import('./pages/CaptainRiding'))
const AdminLogin = lazy(() => import('./pages/AdminLogin'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const AdminProtectWrapper = lazy(() => import('./pages/AdminProtectWrapper'))

const App = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-slate-400 text-sm">Loading RideEasy…</div>}>
        <Routes>
          <Route path='/' element={<Landing />} />
          <Route path='/login' element={<UserLogin />} />
          <Route path='/riding' element={<UserProtectWrapper><Riding /></UserProtectWrapper>} />
          <Route path='/captain-riding' element={<CaptainProtectWrapper><CaptainRiding /></CaptainProtectWrapper>} />

          <Route path='/signup' element={<UserSignup />} />
          <Route path='/captain-login' element={<Captainlogin />} />
          <Route path='/captain-signup' element={<CaptainSignup />} />
          <Route path='/home'
            element={
              <UserProtectWrapper>
                <Home />
              </UserProtectWrapper>
            } />
          <Route path='/user/logout'
            element={<UserProtectWrapper>
              <UserLogout />
            </UserProtectWrapper>
            } />
          <Route path='/captain-home' element={
            <CaptainProtectWrapper>
              <CaptainHome />
            </CaptainProtectWrapper>

          } />
          <Route path='/captain/logout' element={
            <CaptainProtectWrapper>
              <CaptainLogout />
            </CaptainProtectWrapper>
          } />
          <Route path='/admin' element={<AdminLogin />} />
          <Route path='/admin/dashboard' element={<AdminProtectWrapper><AdminDashboard /></AdminProtectWrapper>} />
        </Routes>
      </Suspense>
      <InstallPWAButton />
      <BottomNav />
    </div>
  )
}

export default App