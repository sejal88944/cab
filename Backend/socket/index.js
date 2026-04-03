const socketIo = require('socket.io');
const { socketIoCorsConfig } = require('../config/cors.config');
const userModel = require('../models/user.model');
const captainModel = require('../models/captain.model');
const rideModel = require('../models/rideCore.model');

let io;

function roomId(ref) {
    if (ref == null) return '';
    if (typeof ref === 'string' || typeof ref === 'number') return String(ref);
    if (ref._id != null) return ref._id.toString();
    return ref.toString();
}

function emitToUser(userId, event, data) {
    if (!io || userId == null) return;
    const id = roomId(userId);
    if (!id) return;
    io.to(`user:${id}`).emit(event, data);
}

function emitToCaptain(captainId, event, data) {
    if (!io || captainId == null) return;
    const id = roomId(captainId);
    if (!id) return;
    io.to(`driver:${id}`).emit(event, data);
}

function getIo() {
    return io;
}

function initializeSocket(server, app) {
    io = socketIo(server, {
        cors: socketIoCorsConfig(),
    });

    if (app) app.set('io', io);

    io.on('connection', (socket) => {
        socket.on('join', async (data) => {
            const { userId, userType } = data || {};
            if (!userId || !userType) return;

            if (userType === 'user') {
                const uid = roomId(userId);
                if (!uid) return;
                await userModel.findByIdAndUpdate(uid, { socketId: socket.id });
                socket.join(`user:${uid}`);
            } else if (userType === 'captain') {
                const cid = roomId(userId);
                if (!cid) return;
                await captainModel.findByIdAndUpdate(cid, { socketId: socket.id });
                socket.join(`driver:${cid}`);
            }
        });

        socket.on('driver:join', async (payload) => {
            const { driverId, city, lat, lng } = payload || {};
            if (!driverId) return;
            const did = roomId(driverId);
            if (!did) return;
            const update = { socketId: socket.id };
            if (city) update.city = city;
            if (lat != null && lng != null) {
                update.location = { type: 'Point', coordinates: [ lng, lat ] };
            }
            await captainModel.findByIdAndUpdate(did, update);
            socket.join(`driver:${did}`);
        });

        const handleCaptainLocation = async (driverId, lat, lng) => {
            if (!driverId || lat == null || lng == null) return;
            await captainModel.findByIdAndUpdate(driverId, {
                location: { type: 'Point', coordinates: [ lng, lat ] },
                lastLocationUpdatedAt: new Date(),
                socketId: socket.id,
            });
            const ride = await rideModel.findOne({
                captain: driverId,
                status: { $in: [ 'accepted', 'arrived', 'started' ] },
            });
            if (ride?.user) {
                emitToUser(ride.user, 'ride:status-update', {
                    rideId: ride._id,
                    status: ride.status,
                    driverLocation: { lat, lng },
                });
            }
        };

        socket.on('driver:location-update', async (payload) => {
            const { driverId, lat, lng } = payload || {};
            await handleCaptainLocation(driverId, lat, lng);
        });

        socket.on('disconnect', async () => {
            await captainModel.findOneAndUpdate(
                { socketId: socket.id },
                { $unset: { socketId: '' }, status: 'inactive' }
            );
        });
    });
}

function sendMessageToSocketId(socketId, messageObject) {
    if (!io || !socketId || !messageObject?.event) return;
    io.to(socketId).emit(messageObject.event, messageObject.data);
}

module.exports = {
    initializeSocket,
    sendMessageToSocketId,
    emitToUser,
    emitToCaptain,
    getIo,
};
