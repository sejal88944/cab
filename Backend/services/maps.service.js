const axios = require('axios');

function normalizeText(value) {
    return (typeof value === 'string' ? value : '').trim();
}

// Maharashtra-ish bbox (lon1,lat1,lon2,lat2)
const MH_BBOX = '72,16,76,20';

async function photonSearch(q, limit = 8) {
    const query = normalizeText(q);
    if (!query) throw new Error('Input required');

    const lang = query.match(/[\u0900-\u097F]/) ? 'mr' : 'en';

    const response = await axios.get('https://photon.komoot.io/api', {
        timeout: 8000,
        headers: { 'User-Agent': 'RideEasy/1.0' },
        params: {
            q: query,
            limit,
            lang,
            bbox: MH_BBOX,
            lat: 18.5204,
            lon: 73.8567,
            location_bias_scale: 0.6,
        }
    });

    return response.data?.features || [];
}

module.exports.getAutoCompleteSuggestions = async (input) => {
    const features = await photonSearch(input, 8);
    return features
        .map((f) => {
            const name = f.properties?.name || f.properties?.street || '';
            const label = f.properties?.label || '';
            const coords = f.geometry?.coordinates; // [lng, lat]
            return {
                name: label || name,
                lat: coords?.[1] ?? null,
                lng: coords?.[0] ?? null,
            };
        })
        .filter((s) => s.name);
};

module.exports.getAddressCoordinate = async (address) => {
    const features = await photonSearch(address, 1);
    const f = features[0];
    const coords = f?.geometry?.coordinates;
    if (!coords || coords.length < 2) throw new Error('Unable to fetch coordinates');
    return { lat: coords[1], lng: coords[0] };
};

module.exports.getDistanceTime = async (origin, destination) => {
    const o = await module.exports.getAddressCoordinate(origin);
    const d = await module.exports.getAddressCoordinate(destination);

    const osrmRes = await axios.get(
        `https://router.project-osrm.org/route/v1/driving/${o.lng},${o.lat};${d.lng},${d.lat}`,
        { timeout: 10000, params: { overview: 'false' } }
    );

    const route = osrmRes.data?.routes?.[0];
    if (!route) throw new Error('No routes found');

    return {
        distance: { value: Math.round(route.distance) },
        duration: { value: Math.round(route.duration) },
    };
};

// const axios = require('axios');
// const captainModel = require('../models/captain.model');

// module.exports.getAddressCoordinate = async (address) => {
//     const apiKey = process.env.GOOGLE_MAPS_API;
//     const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

//     try {
//         const response = await axios.get(url);
//         if (response.data.status === 'OK') {
//             const location = response.data.results[ 0 ].geometry.location;
//             return {
//                 ltd: location.lat,
//                 lng: location.lng
//             };
//         } else {
//             throw new Error('Unable to fetch coordinates');
//         }
//     } catch (error) {
//         console.error(error);
//         throw error;
//     }
// }

// module.exports.getDistanceTime = async (origin, destination) => {
//     if (!origin || !destination) {
//         throw new Error('Origin and destination are required');
//     }

//     const apiKey = process.env.GOOGLE_MAPS_API;

//     const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;

//     try {


//         const response = await axios.get(url);
//         if (response.data.status === 'OK') {

//             if (response.data.rows[ 0 ].elements[ 0 ].status === 'ZERO_RESULTS') {
//                 throw new Error('No routes found');
//             }

//             return response.data.rows[ 0 ].elements[ 0 ];
//         } else {
//             throw new Error('Unable to fetch distance and time');
//         }

//     } catch (err) {
//         console.error(err);
//         throw err;
//     }
// }

// module.exports.getAutoCompleteSuggestions = async (input) => {
//     if (!input) {
//         throw new Error('query is required');
//     }

//     const apiKey = process.env.GOOGLE_MAPS_API;
//     const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${apiKey}`;

//     try {
//         const response = await axios.get(url);
//         if (response.data.status === 'OK') {
//             return response.data.predictions.map(prediction => prediction.description).filter(value => value);
//         } else {
//             throw new Error('Unable to fetch suggestions');
//         }
//     } catch (err) {
//         console.error(err);
//         throw err;
//     }
// }

// module.exports.getCaptainsInTheRadius = async (ltd, lng, radius) => {

//     // radius in km


//     const captains = await captainModel.find({
//         location: {
//             $geoWithin: {
//                 $centerSphere: [ [ ltd, lng ], radius / 6371 ]
//             }
//         }
//     });

//     return captains;


// }
