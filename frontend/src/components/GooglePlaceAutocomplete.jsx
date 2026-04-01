import React, { useRef, useContext } from 'react'
import { Autocomplete } from '@react-google-maps/api'
import { GoogleMapsContext } from '../context/GoogleMapsContext'

/**
 * Places Autocomplete — relies on GoogleMapsProvider for a single script load.
 */
export default function GooglePlaceAutocomplete({ placeholder, className, onSelect, disabled }) {
  const acRef = useRef(null)
  const { isLoaded, loadError, hasApiKey } = useContext(GoogleMapsContext)

  if (!hasApiKey) return null
  if (loadError) return <p className="text-xs text-amber-600">Maps failed to load</p>
  if (!isLoaded) return <input readOnly className={className} placeholder="Loading Google Places…" />

  return (
    <Autocomplete
      onLoad={(c) => { acRef.current = c }}
      onPlaceChanged={() => {
        const p = acRef.current?.getPlace?.()
        if (p && onSelect) onSelect(p)
      }}
    >
      <input
        type="text"
        disabled={disabled}
        className={className}
        placeholder={placeholder}
      />
    </Autocomplete>
  )
}
