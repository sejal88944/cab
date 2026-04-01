const express = require('express');
const { body } = require('express-validator');
const captainController = require('../controllers/captain.controller');
const auth = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/register',
    body('name').isString().isLength({ min: 2 }),
    body('phone').isString().isLength({ min: 6 }),
    body('email').isEmail(),
    body('password').isString().isLength({ min: 6 }),
    body('vehicleType').isString(),
    body('vehicleNumber').isString().isLength({ min: 3 }),
    body('license').isString().isLength({ min: 5 }),
    body('city').optional().isIn([ 'Pune', 'Kolhapur' ]),
    body('subscriptionPlan').optional().isIn([ 'weekly', 'monthly', 'yearly' ]),
    captainController.registerCaptain
);

router.post('/login',
    body('email').isEmail(),
    body('password').isString().isLength({ min: 1 }),
    captainController.loginCaptain
);

router.post('/phone/send-otp', body('phone').isString().isLength({ min: 10 }), captainController.sendDriverPhoneOtp);
router.post('/phone/verify-otp',
    body('phone').isString().isLength({ min: 10 }),
    body('otp').isString().isLength({ min: 6, max: 6 }),
    captainController.verifyDriverPhoneOtp
);

router.get('/profile', auth.authCaptain, captainController.getCaptainProfile);
router.get('/rides/history', auth.authCaptain, captainController.getRideHistory);
router.get('/earnings', auth.authCaptain, captainController.getEarnings);
router.post('/status', auth.authCaptain, captainController.updateStatus);
router.get('/logout', auth.authCaptain, captainController.logoutCaptain);

module.exports = router;

