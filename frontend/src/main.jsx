import { createRoot } from 'react-dom/client'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom';
import UserContext from './context/UserContext.jsx';
import CaptainContext from './context/CaptainContext.jsx';
import SocketProvider from './context/SocketContext.jsx';
import { GoogleMapsProvider } from './context/GoogleMapsContext.jsx';
import { initSentry } from './initSentry.js';

void initSentry();

createRoot(document.getElementById('root')).render(

  <GoogleMapsProvider>
    <CaptainContext>
      <UserContext>
        <SocketProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <App />
          </BrowserRouter>
        </SocketProvider>
      </UserContext>
    </CaptainContext>
  </GoogleMapsProvider>

)
