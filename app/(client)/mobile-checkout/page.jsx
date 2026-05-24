"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";

export default function MobileCheckoutPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const razorpayOrderId = searchParams.get("razorpayOrderId");
  const redirectUrl = searchParams.get("redirectUrl");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const rzpRef = useRef(null);

  useEffect(() => {
    if (!orderId || !razorpayOrderId || !redirectUrl) {
      setError("Missing checkout parameters. Please go back to the app.");
      setLoading(false);
      return;
    }
  }, [orderId, razorpayOrderId, redirectUrl]);

  const handlePayment = async () => {
    if (!window.Razorpay) {
      setError("Payment gateway failed to load.");
      return;
    }

    try {
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, // Use public key here
        order_id: razorpayOrderId,
        name: "KrishiConnect",
        description: `Order #${orderId}`,
        image: "/logo.png", // Assuming logo exists
        handler: async function (response) {
          // Success! Redirect back to the mobile app
          window.location.href = `${redirectUrl}?status=success&paymentId=${response.razorpay_payment_id}&signature=${response.razorpay_signature}`;
        },
        modal: {
          ondismiss: function () {
            // User closed the modal
            window.location.href = `${redirectUrl}?status=cancelled`;
          },
        },
        theme: {
          color: "#16a34a",
        },
      };

      rzpRef.current = new window.Razorpay(options);
      rzpRef.current.open();
    } catch (err) {
      setError("An error occurred during payment initialization.");
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <Script
        id="razorpay-checkout-js"
        src="https://checkout.razorpay.com/v1/checkout.js"
        onReady={() => {
          setLoading(false);
          if (orderId && razorpayOrderId && redirectUrl) {
            handlePayment();
          }
        }}
      />
      
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-sm w-full text-center">
        <h1 className="text-2xl font-bold text-green-600 mb-4">KrishiConnect</h1>
        
        {loading && (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mb-4"></div>
            <p className="text-gray-600">Initializing payment gateway...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 mb-4">
            <p className="font-semibold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div>
            <p className="text-gray-600 mb-6">Please complete your payment in the popup window.</p>
            <button 
              onClick={handlePayment}
              className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition"
            >
              Retry Payment
            </button>
            <button 
              onClick={() => { window.location.href = `${redirectUrl}?status=cancelled`; }}
              className="w-full mt-3 text-gray-500 font-medium py-3 px-4 rounded-lg hover:bg-gray-100 transition"
            >
              Cancel and return to app
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
