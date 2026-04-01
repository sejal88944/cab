
import React, { createContext, useEffect } from 'react';
import { io } from 'socket.io-client';

export const SocketContext = createContext();

const BASE_URL = import.meta.env.VITE_BASE_URL || 'http://localhost:5001'
const socket = io(BASE_URL, {
    transports: [ 'websocket', 'polling' ],
    withCredentials: true,
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