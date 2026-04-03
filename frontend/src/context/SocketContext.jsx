import React, { createContext, useEffect } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config/apiBaseUrl';

export const SocketContext = createContext();

/** Vercel serverless cannot keep Socket.IO connections; set VITE_DISABLE_SOCKET=true there. */
function createNoOpSocket() {
    const noop = () => {};
    return {
        connected: false,
        on: noop,
        off: noop,
        once: noop,
        emit: noop,
        disconnect: noop,
        removeAllListeners: noop,
    };
}

const socket =
    import.meta.env.VITE_DISABLE_SOCKET === 'true'
        ? createNoOpSocket()
        : io(API_BASE_URL, {
              transports: ['polling', 'websocket'],
              withCredentials: true,
              reconnectionAttempts: 8,
              reconnectionDelay: 1500,
          });

const SocketProvider = ({ children }) => {
    useEffect(() => {
        // Basic connection logic
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from server');
        });

    }, []);



    return (
        <SocketContext.Provider value={{ socket }}>
            {children}
        </SocketContext.Provider>
    );
};

export default SocketProvider;