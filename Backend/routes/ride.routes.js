const express = require('express');
const { body, query } = require('express-validator');
const rideController = require('../controllers/ride.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/create',
    auth.authUser,
    body('pickupLocation').isString().isLength({ min: 3 }),
    body('dropLocation').isString().isLength({ min: 3 }),
    body('city').optional().isIn([ 'Pune', 'Kolhapur' ]),
    body('vehicleType').isString(),
    body('paymentMethod').isString(),
    body('price').isNumeric(),
    body('distanceKm').optional().isNumeric(),
    rideController.createRide
);

router.get('/get-fare',
    auth.authUser,
    query('pickup').optional().isString(),
    query('destination').optional().isString(),
    query('pickupLocation').optional().isString(),
    query('dropLocation').optional().isString(),
    rideController.getFare
);

router.get('/pending', auth.authCaptain, rideController.getPendingRides);
router.get('/user/history', auth.authUser, rideController.userRideHistory);
router.get('/:id/passenger-otp', auth.authUser, rideController.getPassengerOtp);

router.post('/pay-mock',
    auth.authUser,
    body('rideId').isMongoId(),
    body('method').isString(),
    rideController.payMock
);
router.post('/upi/verify',
    auth.authUser,
    body('rideId').isMongoId(),
    body('transactionRef').isString().isLength({ min: 3 }),
    body('status').isString(),
    body('amount').optional().isNumeric(),
    rideController.verifyUpiIntent
);

router.patch('/:id/accept', auth.authCaptain, rideController.acceptRide);
router.patch('/:id/reject', auth.authCaptain, rideController.rejectRide);
router.post('/confirm', auth.authCaptain, body('rideId').isMongoId(), rideController.confirmRide);
router.post('/arrive', auth.authCaptain, body('rideId').isMongoId(), rideController.arriveRide);
router.get('/start-ride', auth.authCaptain, query('rideId').isMongoId(), query('otp').isString().isLength({ min: 6, max: 6 }), rideController.startRide);
router.post('/end-ride', auth.authCaptain, body('rideId').isMongoId(), rideController.endRide);
router.post('/rate',
    auth.authUser,
    body('rideId').isMongoId(),
    body('rating').isNumeric(),
    body('comment').optional().isString().isLength({ max: 500 }),
    rideController.rateRide
);

router.post('/:id/retry-assign', auth.authUser, rideController.retryAssign);

router.get('/:id', auth.authUser, rideController.getRideById); // keep after /:id/passenger-otp

module.exports = router;
