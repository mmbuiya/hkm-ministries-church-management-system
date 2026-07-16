import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { portalAuthService } from '../services/portalAuth';

const PortalLogin: React.FC = () => {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const [pinRequested, setPinRequested] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRequestingPin) {
        await portalAuthService.requestPin(membershipNumber);
        setPinRequested(true);
      } else {
        await portalAuthService.loginWithMembership(membershipNumber, pin);
        navigate('/portal/dashboard');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Invalid membership number or PIN. Please try again.');
      if (!isRequestingPin) setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-10 rounded-xl shadow-lg">
        <div className="text-center">
          <h1 className="mt-2 text-3xl font-serif font-bold text-gray-900">Member Portal</h1>
          <p className="mt-2 text-sm text-gray-600">
            {isRequestingPin
              ? 'Enter your membership number to receive your auto-generated PIN.'
              : 'Sign in with your membership number and PIN to access resources.'}
          </p>
        </div>

        <div className="mt-8">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium flex items-center gap-2">
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {pinRequested && isRequestingPin ? (
            <div className="text-center space-y-4">
              <div className="bg-green-50 text-green-700 p-4 rounded-md flex items-start gap-3">
                <CheckCircle size={20} className="mt-0.5 shrink-0" />
                <p className="text-sm font-medium text-left">
                  Your PIN has been sent to your registered mobile number and email address.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsRequestingPin(false);
                  setPinRequested(false);
                }}
                className="text-church-600 hover:text-church-800 font-medium text-sm"
              >
                Return to Login
              </button>
            </div>
          ) : (
            <>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="rounded-md shadow-sm space-y-4">
                  <div>
                    <label htmlFor="membership-number" className="sr-only">
                      Membership Number
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        id="membership-number"
                        name="membershipNumber"
                        type="text"
                        required
                        className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                        placeholder="Membership Number (e.g. HKM-1234)"
                        value={membershipNumber}
                        onChange={(e) => setMembershipNumber(e.target.value)}
                      />
                    </div>
                  </div>
                  {!isRequestingPin && (
                    <div>
                      <label htmlFor="pin" className="sr-only">
                        PIN
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="pin"
                          name="pin"
                          type="password"
                          autoComplete="current-password"
                          required={!isRequestingPin}
                          className="appearance-none rounded-md relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                          placeholder="Personal PIN"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {!isRequestingPin && (
                  <div className="flex items-center justify-end text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setIsRequestingPin(true);
                        setError('');
                      }}
                      className="font-medium text-blue-600 hover:text-blue-500"
                    >
                      Don't have a PIN?
                    </button>
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-md text-white bg-blue-700 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                      {loading ? (
                        <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      ) : (
                        <Lock className="h-5 w-5 text-blue-400 group-hover:text-blue-300" />
                      )}
                    </span>
                    {loading
                      ? isRequestingPin
                        ? 'Verifying...'
                        : 'Signing in...'
                      : isRequestingPin
                        ? 'Request My PIN'
                        : 'Sign in'}
                  </button>
                </div>
              </form>

              {!isRequestingPin && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-800 text-center italic">
                    Access is restricted to registered HKM members. To obtain a membership number, please visit the
                    church office or contact your cell group leader.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        <div className="text-center mt-6">
          {isRequestingPin && !pinRequested ? (
            <button
              onClick={() => {
                setIsRequestingPin(false);
                setError('');
              }}
              className="text-sm text-gray-500 hover:text-blue-600"
            >
              Back to Login
            </button>
          ) : (
            <Link to="/" className="text-sm text-gray-500 hover:text-blue-600 flex items-center justify-center gap-1">
              <ArrowRight size={14} className="rotate-180" /> Back to Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;
