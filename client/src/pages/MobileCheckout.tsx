/**
 * Mobile Web Checkout Page
 *
 * This page allows mobile app users to complete purchases through Stripe
 * web checkout instead of using In-App Purchases.
 *
 * Benefits:
 * - Avoids 30% Apple App Store / Google Play fee
 * - Single payment system (Stripe) for web and mobile
 * - Better margins on subscriptions and token purchases
 *
 * How it works:
 * 1. Mobile app deep-links to /checkout?product=X&user_id=Y
 * 2. This page displays the purchase option and redirects to Stripe
 * 3. After payment, Stripe webhook updates the user's subscription
 * 4. Mobile app checks for updated entitlements via API
 */

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { TOKEN_PRODUCTS, SUBSCRIPTION_PRODUCTS } from '@shared/features';

interface CheckoutState {
  loading: boolean;
  error: string | null;
  product: typeof TOKEN_PRODUCTS[keyof typeof TOKEN_PRODUCTS] | typeof SUBSCRIPTION_PRODUCTS[keyof typeof SUBSCRIPTION_PRODUCTS] | null;
  productType: 'subscription' | 'tokens' | null;
}

export default function MobileCheckout() {
  // Use native URLSearchParams instead of react-router-dom (project uses wouter)
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const { isSignedIn, getToken } = useAuth();
  const [state, setState] = useState<CheckoutState>({
    loading: true,
    error: null,
    product: null,
    productType: null,
  });

  const productId = searchParams.get('product');
  const plan = searchParams.get('plan'); // 'monthly' or 'annual' for subscriptions
  const returnUrl = searchParams.get('return_url') || 'semaslim://checkout-complete';

  useEffect(() => {
    // Identify the product
    if (plan) {
      const subProduct = SUBSCRIPTION_PRODUCTS[plan as keyof typeof SUBSCRIPTION_PRODUCTS];
      if (subProduct) {
        setState({ loading: false, error: null, product: subProduct, productType: 'subscription' });
        return;
      }
    }

    if (productId && TOKEN_PRODUCTS[productId as keyof typeof TOKEN_PRODUCTS]) {
      setState({
        loading: false,
        error: null,
        product: TOKEN_PRODUCTS[productId as keyof typeof TOKEN_PRODUCTS],
        productType: 'tokens',
      });
      return;
    }

    setState({
      loading: false,
      error: 'Invalid product. Please try again from the app.',
      product: null,
      productType: null,
    });
  }, [productId, plan]);

  const handleCheckout = async () => {
    if (!isSignedIn) {
      setState(s => ({ ...s, error: 'Please sign in to continue' }));
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const token = await getToken();

      const endpoint = state.productType === 'subscription'
        ? '/api/subscription/checkout'
        : '/api/tokens/purchase';

      const body = state.productType === 'subscription'
        ? {
            plan,
            successUrl: `${window.location.origin}/checkout/success?return_url=${encodeURIComponent(returnUrl)}`,
            cancelUrl: `${window.location.origin}/checkout?product=${productId || ''}&plan=${plan || ''}&cancelled=true`,
          }
        : {
            productId,
            successUrl: `${window.location.origin}/checkout/success?return_url=${encodeURIComponent(returnUrl)}`,
            cancelUrl: `${window.location.origin}/checkout?product=${productId}&cancelled=true`,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (err) {
      setState(s => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Something went wrong',
      }));
    }
  };

  // Show loading
  if (state.loading && !state.product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show error
  if (state.error && !state.product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Error</h1>
          <p className="text-gray-600 mb-6">{state.error}</p>
          <a
            href={returnUrl}
            className="inline-block px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Return to App
          </a>
        </div>
      </div>
    );
  }

  const isCancelled = searchParams.get('cancelled') === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">SemaSlim</h1>
          <p className="text-gray-500 mt-1">Complete Your Purchase</p>
        </div>

        {/* Cancelled notice */}
        {isCancelled && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              Your previous checkout was cancelled. You can try again below.
            </p>
          </div>
        )}

        {/* Product details */}
        {state.product && (
          <div className="bg-gray-50 rounded-xl p-6 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-semibold text-gray-900">{state.product.name}</h2>
                <p className="text-sm text-gray-500">{state.product.description}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-emerald-600">
                  ${(state.product.amount / 100).toFixed(2)}
                </p>
                {state.productType === 'subscription' && (
                  <p className="text-xs text-gray-500">
                    {plan === 'annual' ? 'per year' : 'per month'}
                  </p>
                )}
              </div>
            </div>

            {/* Features for subscription */}
            {state.productType === 'subscription' && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Includes</p>
                <ul className="space-y-2">
                  <li className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited AI meal plans
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Unlimited barcode scans
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Full history & analytics
                  </li>
                  <li className="flex items-center text-sm text-gray-700">
                    <svg className="w-4 h-4 text-emerald-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    3 PDF exports/month included
                  </li>
                </ul>
                {plan === 'monthly' && (
                  <p className="text-xs text-gray-500 mt-3">
                    7-day free trial included. Cancel anytime.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{state.error}</p>
          </div>
        )}

        {/* Checkout button */}
        <button
          onClick={handleCheckout}
          disabled={state.loading || !isSignedIn}
          className="w-full py-4 bg-emerald-600 text-white rounded-xl font-semibold text-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state.loading ? (
            <span className="flex items-center justify-center">
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
              Processing...
            </span>
          ) : !isSignedIn ? (
            'Sign in to continue'
          ) : (
            'Continue to Payment'
          )}
        </button>

        {/* Security note */}
        <div className="mt-6 flex items-center justify-center text-xs text-gray-400">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Secure checkout powered by Stripe
        </div>

        {/* Return to app link */}
        <div className="mt-4 text-center">
          <a
            href={returnUrl}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel and return to app
          </a>
        </div>
      </div>
    </div>
  );
}
