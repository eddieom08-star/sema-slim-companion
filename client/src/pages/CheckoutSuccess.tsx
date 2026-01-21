/**
 * Checkout Success Page
 *
 * Displayed after successful Stripe checkout, then redirects back to the mobile app.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function CheckoutSuccess() {
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(3);

  const returnUrl = searchParams.get('return_url') || 'semaslim://checkout-complete';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          clearInterval(timer);
          window.location.href = returnUrl;
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [returnUrl]);

  const handleReturnNow = () => {
    window.location.href = returnUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* Success icon */}
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Success message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Payment Successful!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. Your account has been upgraded.
        </p>

        {/* Countdown */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-500">
            Returning to the app in{' '}
            <span className="font-semibold text-emerald-600">{countdown}</span>
            {' '}second{countdown !== 1 ? 's' : ''}...
          </p>
        </div>

        {/* Manual return button */}
        <button
          onClick={handleReturnNow}
          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors"
        >
          Return to App Now
        </button>

        {/* What's next */}
        <div className="mt-8 text-left">
          <p className="text-xs font-medium text-gray-500 uppercase mb-3">What happens next?</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                <span className="text-xs font-bold text-emerald-600">1</span>
              </span>
              Your account is being updated with your new features
            </li>
            <li className="flex items-start">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                <span className="text-xs font-bold text-emerald-600">2</span>
              </span>
              You'll receive a confirmation email shortly
            </li>
            <li className="flex items-start">
              <span className="w-5 h-5 bg-emerald-100 rounded-full flex items-center justify-center mr-2 mt-0.5 flex-shrink-0">
                <span className="text-xs font-bold text-emerald-600">3</span>
              </span>
              Refresh the app if features don't appear immediately
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
