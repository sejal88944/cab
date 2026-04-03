import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config/apiBaseUrl';

const CaptainDashboard = () => {
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(true);
    const [renewing, setRenewing] = useState(false);

    // Assuming driverId is stored in localStorage or context
    const driverId = localStorage.getItem('driverId'); // Replace with actual way to get driverId

    useEffect(() => {
        fetchSubscriptionStatus();
    }, []);

    const fetchSubscriptionStatus = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/driver-subscriptions/status/${driverId}`);
            setSubscription(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRenew = async () => {
        setRenewing(true);
        try {
            // For demo, assume Razorpay payment
            await axios.post(`${API_BASE_URL}/payments/create-subscription-order`, {
                driverId,
                amount: 30 // Daily amount
            });

            // Integrate Razorpay payment here
            // For now, assume payment successful
            await axios.post(`${API_BASE_URL}/driver-subscriptions/renew`, {
                driverId,
                paymentMode: 'Razorpay',
                transactionId: 'demo_txn_' + Date.now()
            });

            fetchSubscriptionStatus();
        } catch (error) {
            console.error(error);
        } finally {
            setRenewing(false);
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Driver Dashboard</h1>

            {subscription.active ? (
                <div className="bg-green-100 p-4 rounded">
                    <h2 className="text-lg font-semibold">Subscription Active</h2>
                    <p>Expires on: {new Date(subscription.subscription.expiryDate).toLocaleDateString()}</p>
                    <p>Days left: {Math.ceil((new Date(subscription.subscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))}</p>
                </div>
            ) : (
                <div className="bg-red-100 p-4 rounded">
                    <h2 className="text-lg font-semibold">Subscription Expired</h2>
                    <p>Please renew to continue using the platform.</p>
                    <button
                        onClick={handleRenew}
                        disabled={renewing}
                        className="bg-blue-500 text-white px-4 py-2 rounded mt-2"
                    >
                        {renewing ? 'Renewing...' : 'Renew Subscription (₹30)'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default CaptainDashboard;
