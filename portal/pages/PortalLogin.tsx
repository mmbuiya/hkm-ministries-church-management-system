import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, CheckCircle, ArrowRight, Shield, KeyRound } from 'lucide-react';
import { portalAuthService } from '../services/portalAuth';
import '../portal.css';

type LoginMode = 'pin' | 'password';

const PortalLogin: React.FC = () => {
  const [membershipNumber, setMembershipNumber] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRequestingPin, setIsRequestingPin] = useState(false);
  const [pinRequested, setPinRequested] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('pin');
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRequestingPin) {
        await portalAuthService.requestPin(membershipNumber);
        setPinRequested(true);
      } else if (loginMode === 'pin') {
        const session = await portalAuthService.loginWithMembership(membershipNumber, pin);
        if (session.needsPasswordSetup) {
          navigate('/portal/set-password');
        } else {
          navigate('/portal/dashboard');
        }
      } else {
        await portalAuthService.loginWithPassword(membershipNumber, password);
        navigate('/portal/dashboard');
      }
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Invalid credentials. Please try again.';
      setError(msg);
      if (loginMode === 'pin') {
        setPin('');
        // If server says they need to use password, switch mode
        if (msg.toLowerCase().includes('password')) {
          setLoginMode('password');
        }
      } else {
        setPassword('');
        // If server says no password set, switch to PIN mode
        if (msg.toLowerCase().includes('pin')) {
          setLoginMode('pin');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-login-root">
      {/* Background */}
      <div className="portal-bg">
        <div className="portal-bg-overlay" />
        <div className="portal-bg-pattern" />
      </div>

      {/* Card */}
      <div className="portal-card-wrapper">
        <div className="portal-card">
          {/* Header with Logo */}
          <div className="portal-header">
            <div className="portal-logo-wrap">
              <img src="/hkm-logo.webp" alt="Heavenly God Kingdom Churches Logo" className="portal-logo" />
            </div>
            <h1 className="portal-church-name">Heavenly God Kingdom Churches</h1>
            <div className="portal-divider" />
            <p className="portal-subtitle">Member Portal</p>
            <p className="portal-hint">
              {isRequestingPin
                ? 'Enter your membership number to receive a new PIN.'
                : 'Sign in to access your member dashboard.'}
            </p>
          </div>

          {/* Body */}
          <div className="portal-body">
            {error && (
              <div className="portal-alert portal-alert-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {pinRequested && isRequestingPin ? (
              <div className="portal-pin-sent">
                <div className="portal-alert portal-alert-success">
                  <CheckCircle size={18} />
                  <span>
                    Your PIN request has been received. Please contact the church office or wait for your SMS/email.
                  </span>
                </div>
                <button
                  className="portal-link-btn"
                  onClick={() => {
                    setIsRequestingPin(false);
                    setPinRequested(false);
                  }}
                >
                  ← Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="portal-form">
                {/* Mode toggle */}
                {!isRequestingPin && (
                  <div className="portal-mode-toggle">
                    <button
                      type="button"
                      className={`portal-mode-btn ${loginMode === 'pin' ? 'active' : ''}`}
                      onClick={() => {
                        setLoginMode('pin');
                        setError('');
                      }}
                    >
                      <KeyRound size={14} />
                      Use PIN
                    </button>
                    <button
                      type="button"
                      className={`portal-mode-btn ${loginMode === 'password' ? 'active' : ''}`}
                      onClick={() => {
                        setLoginMode('password');
                        setError('');
                      }}
                    >
                      <Lock size={14} />
                      Use Password
                    </button>
                  </div>
                )}

                {/* Membership Number */}
                <div className="portal-field">
                  <label htmlFor="membership-number" className="portal-label">
                    Membership Number
                  </label>
                  <div className="portal-input-wrap">
                    <User size={16} className="portal-input-icon" />
                    <input
                      id="membership-number"
                      type="text"
                      required
                      autoComplete="username"
                      placeholder="e.g. HKM-004 or HKM004"
                      className="portal-input"
                      value={membershipNumber}
                      onChange={(e) => setMembershipNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* PIN field (PIN mode) */}
                {!isRequestingPin && loginMode === 'pin' && (
                  <div className="portal-field">
                    <label htmlFor="pin" className="portal-label">
                      Personal PIN
                    </label>
                    <div className="portal-input-wrap">
                      <KeyRound size={16} className="portal-input-icon" />
                      <input
                        id="pin"
                        type="password"
                        required={loginMode === 'pin'}
                        autoComplete="off"
                        placeholder="Enter your PIN"
                        className="portal-input"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Password field (password mode) */}
                {!isRequestingPin && loginMode === 'password' && (
                  <div className="portal-field">
                    <label htmlFor="login-password" className="portal-label">
                      Password
                    </label>
                    <div className="portal-input-wrap">
                      <Lock size={16} className="portal-input-icon" />
                      <input
                        id="login-password"
                        type="password"
                        required={loginMode === 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        className="portal-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Forgot PIN */}
                {!isRequestingPin && loginMode === 'pin' && (
                  <div className="portal-forgot">
                    <button
                      type="button"
                      className="portal-link-btn"
                      onClick={() => {
                        setIsRequestingPin(true);
                        setError('');
                      }}
                    >
                      Don't have a PIN?
                    </button>
                  </div>
                )}

                {/* Submit */}
                <button type="submit" disabled={loading} className="portal-submit-btn">
                  {loading ? (
                    <span className="portal-spinner" />
                  ) : (
                    <>
                      <Shield size={16} />
                      {isRequestingPin
                        ? 'Request My PIN'
                        : loginMode === 'pin'
                          ? 'Sign In with PIN'
                          : 'Sign In with Password'}
                    </>
                  )}
                </button>

                {/* Cancel request */}
                {isRequestingPin && (
                  <button
                    type="button"
                    className="portal-cancel-btn"
                    onClick={() => {
                      setIsRequestingPin(false);
                      setError('');
                    }}
                  >
                    ← Back to Login
                  </button>
                )}
              </form>
            )}

            {/* Info note */}
            {!isRequestingPin && !pinRequested && (
              <p className="portal-note">
                Access is restricted to registered HKM members. Visit the church office to register.
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="portal-footer">
            <a href="https://hkmministries.org" className="portal-back-link">
              <ArrowRight size={13} style={{ transform: 'rotate(180deg)' }} />
              Back to HKM Ministries Website
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortalLogin;
