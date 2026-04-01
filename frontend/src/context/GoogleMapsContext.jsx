import { createContext } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

/** Single global Maps/Places script load for the whole app. */
export const GoogleMapsContext = createContext({
    isLoaded: false,
    loadError: null,
    hasApiKey: false,
});

export function GoogleMapsProvider({ children }) {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'app-google-maps',
        googleMapsApiKey: key || 'unused',
        libraries: [ 'places' ],
        skip: !key,
    });

    return (
        <GoogleMapsContext.Provider value={{ isLoaded, loadError, hasApiKey: !!key }}>
            {children}
        </GoogleMapsContext.Provider>
    );
}
