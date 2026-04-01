const { validationResult } = require('express-validator')
const captainModel = require('../models/captain.model')
const { expiresAfterPlan, syncSubscriptionState } = require('../services/subscriptionDriver.service')

const PLANS = {
  BIKE: { weekly: 29, monthly: 99, yearly: 999 },
  AUTO: { weekly: 49, monthly: 149, yearly: 1299 },
  MINI: { weekly: 69, monthly: 179, yearly: 1599 },
  CAR: { weekly: 79, monthly: 199, yearly: 1799 },
  SEDAN: { weekly: 79, monthly: 199, yearly: 1799 },
}

module.exports.getPlans = async (req, res) => {
  return res.status(200).json({ plans: PLANS })
}

module.exports.getMyStatus = async (req, res) => {
  let captain = await captainModel.findById(req.captain._id)
  captain = await syncSubscriptionState(captain)

  const now = new Date()
  const exp = captain?.subscriptionExpiresAt
  const notExpired = !exp || new Date(exp) > now
  const active = captain?.subscriptionStatus === 'active' && notExpired

  const msRemaining = active && exp ? Math.max(0, new Date(exp).getTime() - now.getTime()) : 0

  return res.status(200).json({
    active,
    subscription: captain?.subscriptionStatus === 'none'
      ? null
      : {
          status: captain.subscriptionStatus,
          plan: captain.subscriptionPlan || null,
          startedAt: captain.subscriptionStartedAt || null,
          expiresAt: exp || null,
          expiresInMs: msRemaining,
          updatedAt: captain.updatedAt,
        },
  })
}

module.exports.createSubscription = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() })

  const plan = [ 'weekly', 'monthly', 'yearly' ].includes(req.body?.plan) ? req.body.plan : 'weekly'
  const captain = await captainModel.findById(req.captain._id)
  if (!captain) return res.status(404).json({ message: 'Driver not found' })

  const now = new Date()
  const base = captain.subscriptionExpiresAt && new Date(captain.subscriptionExpiresAt) > now
    ? new Date(captain.subscriptionExpiresAt)
    : now

  const subscriptionExpiresAt = expiresAfterPlan(plan, base)
  const subscriptionStartedAt = captain.subscriptionStartedAt || now

  await captainModel.findByIdAndUpdate(req.captain._id, {
    subscriptionStatus: 'active',
    subscriptionPlan: plan,
    subscriptionStartedAt,
    subscriptionExpiresAt,
  })

  const fresh = await captainModel.findById(req.captain._id)
  return res.status(200).json({
    active: true,
    subscription: {
      status: fresh.subscriptionStatus,
      plan: fresh.subscriptionPlan,
      startedAt: fresh.subscriptionStartedAt,
      expiresAt: fresh.subscriptionExpiresAt,
      expiresInMs: Math.max(0, new Date(fresh.subscriptionExpiresAt).getTime() - Date.now()),
    },
  })
}
