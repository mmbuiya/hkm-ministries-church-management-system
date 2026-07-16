import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, CheckCircle, ArrowRight, Shield } from 'lucide-react';
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
                : 'Sign in with your membership number and PIN.'}
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
                      placeholder="e.g. HKM-1234"
                      className="portal-input"
                      value={membershipNumber}
                      onChange={(e) => setMembershipNumber(e.target.value)}
                    />
                  </div>
                </div>

                {/* PIN */}
                {!isRequestingPin && (
                  <div className="portal-field">
                    <label htmlFor="pin" className="portal-label">
                      Personal PIN
                    </label>
                    <div className="portal-input-wrap">
                      <Lock size={16} className="portal-input-icon" />
                      <input
                        id="pin"
                        type="password"
                        required={!isRequestingPin}
                        autoComplete="current-password"
                        placeholder="Enter your PIN"
                        className="portal-input"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {/* Forgot PIN */}
                {!isRequestingPin && (
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
                      {isRequestingPin ? 'Request My PIN' : 'Sign In Securely'}
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

      <style>{`
        /* ── Reset & Root ────────────────────────────────────── */
        .portal-login-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
          padding: 1.5rem;
          box-sizing: border-box;
        }

        /* ── Background ─────────────────────────────────────── */
        .portal-bg {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #0f172a 0%, #1e1a3c 40%, #2d1a4a 70%, #1a0f2e 100%);
          z-index: 0;
        }
        .portal-bg-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(ellipse at 20% 50%, rgba(180, 140, 20, 0.12) 0%, transparent 60%),
                      radial-gradient(ellipse at 80% 20%, rgba(139, 0, 0, 0.10) 0%, transparent 50%),
                      radial-gradient(ellipse at 60% 80%, rgba(180, 140, 20, 0.08) 0%, transparent 50%);
        }
        .portal-bg-pattern {
          position: absolute;
          inset: 0;
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 60px,
            rgba(255,255,255,0.015) 60px,
            rgba(255,255,255,0.015) 61px
          );
        }

        /* ── Card wrapper ──────────────────────────────────── */
        .portal-card-wrapper {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
        }
        .portal-card {
          background: rgba(255, 255, 255, 0.97);
          border-radius: 24px;
          overflow: hidden;
          box-shadow:
            0 32px 80px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(180, 140, 20, 0.2),
            inset 0 1px 0 rgba(255,255,255,0.9);
        }

        /* ── Header ─────────────────────────────────────────── */
        .portal-header {
          background: linear-gradient(160deg, #0f172a 0%, #1e1a3c 60%, #2d1a4a 100%);
          padding: 2.5rem 2rem 2rem;
          text-align: center;
          position: relative;
        }
        .portal-header::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0; right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #b8960c, #d4af37, #b8960c, transparent);
        }

        .portal-logo-wrap {
          width: 110px;
          height: 110px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          background: rgba(255,255,255,0.08);
          border: 2px solid rgba(212, 175, 55, 0.5);
          padding: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 30px rgba(212, 175, 55, 0.2);
        }
        .portal-logo {
          width: 100%;
          height: 100%;
          object-fit: contain;
          border-radius: 50%;
        }

        .portal-church-name {
          font-size: 0.8rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #d4af37;
          margin: 0 0 0.75rem;
          line-height: 1.3;
        }
        .portal-divider {
          width: 50px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #d4af37, transparent);
          margin: 0 auto 0.75rem;
        }
        .portal-subtitle {
          font-size: 1.5rem;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 0.4rem;
          letter-spacing: -0.01em;
        }
        .portal-hint {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.55);
          margin: 0;
          line-height: 1.5;
        }

        /* ── Body ───────────────────────────────────────────── */
        .portal-body {
          padding: 2rem 2rem 1.5rem;
        }

        /* Alerts */
        .portal-alert {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.75rem 1rem;
          border-radius: 10px;
          font-size: 0.82rem;
          line-height: 1.5;
          margin-bottom: 1.25rem;
        }
        .portal-alert-error {
          background: #fff1f2;
          color: #be123c;
          border: 1px solid #fecdd3;
        }
        .portal-alert-success {
          background: #f0fdf4;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        /* Form */
        .portal-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .portal-field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .portal-label {
          font-size: 0.78rem;
          font-weight: 600;
          color: #374151;
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }
        .portal-input-wrap {
          position: relative;
        }
        .portal-input-icon {
          position: absolute;
          left: 0.9rem;
          top: 50%;
          transform: translateY(-50%);
          color: #9ca3af;
          pointer-events: none;
        }
        .portal-input {
          width: 100%;
          padding: 0.75rem 0.9rem 0.75rem 2.5rem;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          font-size: 0.9rem;
          color: #111827;
          background: #f9fafb;
          transition: all 0.2s;
          outline: none;
          box-sizing: border-box;
        }
        .portal-input:focus {
          border-color: #d4af37;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.12);
        }
        .portal-input::placeholder { color: #9ca3af; }

        .portal-forgot {
          text-align: right;
          margin-top: -0.25rem;
        }
        .portal-link-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #854d0e;
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .portal-link-btn:hover { color: #6b3a08; }

        .portal-submit-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.875rem;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          background: linear-gradient(135deg, #1e1a3c 0%, #2d1a4a 100%);
          color: #fff;
          transition: all 0.2s;
          margin-top: 0.25rem;
          position: relative;
          overflow: hidden;
        }
        .portal-submit-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(212,175,55,0.15) 0%, transparent 60%);
        }
        .portal-submit-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(30, 26, 60, 0.4);
        }
        .portal-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .portal-spinner {
          width: 18px;
          height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .portal-cancel-btn {
          background: none;
          border: 1.5px solid #e5e7eb;
          border-radius: 10px;
          padding: 0.75rem;
          width: 100%;
          cursor: pointer;
          color: #6b7280;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s;
        }
        .portal-cancel-btn:hover { background: #f9fafb; border-color: #d1d5db; }

        .portal-pin-sent {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          align-items: flex-start;
        }

        .portal-note {
          margin-top: 1.25rem;
          padding: 0.875rem 1rem;
          background: linear-gradient(135deg, #fefce8, #fef9c3);
          border: 1px solid #fde68a;
          border-radius: 10px;
          font-size: 0.78rem;
          color: #713f12;
          line-height: 1.5;
          text-align: center;
        }

        /* ── Footer ─────────────────────────────────────────── */
        .portal-footer {
          padding: 1rem 2rem 1.5rem;
          text-align: center;
          border-top: 1px solid #f3f4f6;
        }
        .portal-back-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.78rem;
          color: #6b7280;
          text-decoration: none;
          transition: color 0.2s;
        }
        .portal-back-link:hover { color: #374151; }
      `}</style>
    </div>
  );
};

export default PortalLogin;
