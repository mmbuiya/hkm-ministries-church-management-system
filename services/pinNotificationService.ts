/**
 * PIN Notification Service
 *
 * Sends the auto-generated Member Portal PIN to a member via:
 *   1. SMS  — using Africa's Talking (https://africastalking.com) — Kenya/Africa native
 *   2. SMS  — using Textbee (https://textbee.dev) — Free Android phone gateway (fallback)
 *   2. Email — using Resend  (https://resend.com) — transactional email
 *
 * API keys are stored in the CMS Settings page (Settings → SMS Config / Email Config)
 * and persisted in localStorage under the 'hkm_sms_settings' / 'hkm_notification_settings' keys.
 *
 * Both channels are attempted independently. Failure in one does not block the other.
 * All errors are logged to the console but never thrown — the Registration Fee transaction
 * must always succeed even if a notification fails.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface NotificationSettings {
  atApiKey: string; // Africa's Talking API key (Settings → SMS Config)
  atUsername: string; // Africa's Talking username (e.g. "hkmministries" or "sandbox")
  atSenderId: string; // Alphanumeric sender ID, e.g. "HKM MIN" (must be registered)
  textbeeApiKey?: string; // Textbee API Key
  textbeeDeviceId?: string; // Textbee Device ID
  resendApiKey: string; // Resend email API key (Settings → Email Config)
  resendFromEmail: string; // Verified sender email, e.g. "noreply@hkmministries.org"
  portalUrl: string; // e.g. "https://hkmministries.org/login"
}

export interface PinNotificationPayload {
  memberId: string;
  memberName: string;
  phone?: string | null;
  email?: string | null;
  pin: string;
  orgEmail?: string;
}

export interface NotificationResult {
  sms: { sent: boolean; error?: string };
  email: { sent: boolean; error?: string };
}

// ─── Settings Loader ─────────────────────────────────────────────────────────

function loadNotificationSettings(): NotificationSettings {
  let smsKey = '';
  let smsFrom = 'HKM MIN';
  let atUsername = 'sandbox';
  let textbeeApiKey = '';
  let textbeeDeviceId = '';
  let emailKey = '';
  let emailFrom = 'noreply@hkmministries.org';
  let portalUrl = 'https://hkmministries.org/login';

  try {
    const raw = localStorage.getItem('hkm_app_settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.smsConfig) {
        smsKey = parsed.smsConfig.apiKey || '';
        smsFrom = parsed.smsConfig.senderId || 'HKM MIN';
        atUsername = parsed.smsConfig.atUsername || 'sandbox';
        textbeeApiKey = parsed.smsConfig.textbeeApiKey || '';
        textbeeDeviceId = parsed.smsConfig.textbeeDeviceId || '';
      }
      if (parsed.emailConfig) {
        emailKey = parsed.emailConfig.resendApiKey || '';
        emailFrom = parsed.emailConfig.resendFromEmail || 'noreply@hkmministries.org';
        portalUrl = parsed.emailConfig.portalUrl || 'https://hkmministries.org/login';
      }
    }
  } catch {
    console.warn('[PinNotification] Could not parse hkm_app_settings');
  }

  return {
    atApiKey: smsKey,
    atUsername,
    atSenderId: smsFrom,
    textbeeApiKey,
    textbeeDeviceId,
    resendApiKey: emailKey,
    resendFromEmail: emailFrom,
    portalUrl,
  };
}

// ─── Retry Helper ────────────────────────────────────────────────────────────

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 2000,
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await operation();
    } catch (error: any) {
      attempt++;
      console.warn(`[PinNotification] Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
      if (attempt >= maxRetries) {
        throw error;
      }
      // Exponential backoff: 2s, 4s, 8s
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry loop failed unexpectedly');
}

// ─── SMS via Textbee ─────────────────────────────────────────────────────────

async function sendSmsViaTextbee(
  payload: PinNotificationPayload,
  settings: NotificationSettings,
): Promise<{ sent: boolean; error?: string }> {
  if (!payload.phone) {
    return { sent: false, error: 'Member has no phone number on file.' };
  }
  if (!settings.textbeeApiKey || !settings.textbeeDeviceId) {
    return { sent: false, error: 'Textbee API key or Device ID not configured.' };
  }

  try {
    const backendUrl = import.meta.env.VITE_SMS_BACKEND_URL || 'http://localhost:3000/api/sms/send';

    const response = await withRetry(async () => {
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberId: payload.memberId,
          memberName: payload.memberName,
          phone: payload.phone!.replace(/\s+/g, ''),
          pin: payload.pin,
          portalUrl: settings.portalUrl,
          textbeeApiKey: settings.textbeeApiKey,
          textbeeDeviceId: settings.textbeeDeviceId,
        }),
      });
      if (!res.ok && res.status >= 500) {
        throw new Error(`SMS Backend API returned ${res.status}`);
      }
      return res;
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`[PinNotification] SMS Backend API Error: ${response.status}`, result);
      return { sent: false, error: `SMS Backend API returned ${response.status}: ${JSON.stringify(result)}` };
    }

    console.log(`[PinNotification] SMS successfully queued on backend for ${payload.phone}.`);
    return { sent: true };
  } catch (err: any) {
    console.error('[PinNotification] Unexpected error calling SMS Backend API:', err);
    return { sent: false, error: err.message };
  }
}

// ─── SMS via Africa's Talking ────────────────────────────────────────────────
// Africa's Talking is the industry standard for Kenya.
// It natively supports Safaricom, Airtel Kenya, and custom alphanumeric Sender IDs.
// Sign up at: https://africastalking.com | Docs: https://developers.africastalking.com/docs/sms

async function sendSmsViaAfricasTalking(
  payload: PinNotificationPayload,
  settings: NotificationSettings,
): Promise<{ sent: boolean; error?: string }> {
  if (!payload.phone) {
    return { sent: false, error: 'Member has no phone number on file.' };
  }
  if (!settings.atApiKey) {
    return { sent: false, error: "Africa's Talking API key not configured. Go to Settings → SMS Config." };
  }

  const message =
    `HKM Ministries: Dear ${payload.memberName}, your Member Portal has been activated! ` +
    `Your Member ID: ${payload.memberId} | PIN: ${payload.pin} ` +
    `Login at: ${settings.portalUrl} — Keep your PIN private.`;

  // Format phone number to E.164 format (e.g. +254712345678)
  let phone = payload.phone!.replace(/\s+/g, '');
  if (phone.startsWith('0')) {
    phone = '+254' + phone.substring(1);
  } else if (!phone.startsWith('+')) {
    phone = '+' + phone;
  }

  try {
    const response = await withRetry(async () => {
      // Africa's Talking uses URL-encoded form data
      const params = new URLSearchParams();
      params.append('username', settings.atUsername || 'sandbox');
      params.append('to', phone);
      params.append('message', message);
      if (settings.atSenderId) {
        params.append('from', settings.atSenderId);
      }

      const res = await fetch('https://api.africastalking.com/version1/messaging', {
        method: 'POST',
        headers: {
          apiKey: settings.atApiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          Accept: 'application/json',
        },
        body: params.toString(),
      });
      if (!res.ok && res.status >= 500) {
        throw new Error(`Africa's Talking API returned ${res.status}`);
      }
      return res;
    });

    const result = await response.json();
    const recipients = result?.SMSMessageData?.Recipients;

    if (response.ok && recipients?.length > 0 && recipients[0].status === 'Success') {
      console.log(`[PinNotification] SMS sent to ${phone} via Africa's Talking.`);
      return { sent: true };
    }

    const errMsg = recipients?.[0]?.status || result?.SMSMessageData?.Message || `HTTP ${response.status}`;
    console.error("[PinNotification] Africa's Talking error:", result);
    return { sent: false, error: `Africa's Talking: ${errMsg}` };
  } catch (err: any) {
    console.error('[PinNotification] SMS network error:', err);
    return { sent: false, error: `Network error: ${err.message}` };
  }
}

// ─── Email via Resend ─────────────────────────────────────────────────────────

function buildPinEmailHtml(
  memberName: string,
  memberId: string,
  pin: string,
  portalUrl: string,
  orgEmail?: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your HKM Member Portal PIN</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a,#15803d);padding:36px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:bold;letter-spacing:0.5px;">
                HKM Ministries International
              </h1>
              <p style="margin:8px 0 0;color:#bbf7d0;font-size:14px;">Member Portal Access</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 20px;color:#1f2937;font-size:17px;">Dear ${memberName},</p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
                Welcome to the HKM Ministries Member Portal! Your account has been
                activated following confirmation of your Registration Fee.
              </p>
              ${
                orgEmail
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#eef2ff;border:1px solid #6366f1;border-radius:12px;margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 24px;text-align:center;">
                    <p style="margin:0 0 4px;color:#4338ca;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;font-weight:bold;">Your Church Email Address</p>
                    <p style="margin:0;color:#1e1b4b;font-size:18px;font-weight:bold;">${orgEmail}</p>
                    <p style="margin:8px 0 0;color:#4338ca;font-size:13px;">This email forwards to your personal inbox.</p>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
                Use the details below to sign in:
              </p>

              <!-- Credentials Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:2px solid #16a34a;border-radius:12px;margin:0 0 28px;">
                <tr>
                  <td style="padding:28px;text-align:center;">
                    <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Member ID</p>
                    <p style="margin:0 0 20px;color:#1f2937;font-size:22px;font-weight:bold;font-family:monospace;letter-spacing:3px;">${memberId}</p>
                    <hr style="border:none;border-top:1px solid #bbf7d0;margin:0 0 20px;" />
                    <p style="margin:0 0 6px;color:#6b7280;font-size:11px;text-transform:uppercase;letter-spacing:1.5px;">Your PIN</p>
                    <p style="margin:0;color:#16a34a;font-size:44px;font-weight:bold;font-family:monospace;letter-spacing:14px;">${pin}</p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center">
                    <a href="${portalUrl}"
                       style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:bold;padding:14px 36px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                      Sign In to Member Portal →
                    </a>
                  </td>
                </tr>
              </table>

              <div style="background:#fefce8;border:1px solid #fbbf24;border-radius:8px;padding:14px 18px;margin:0 0 24px;">
                <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                  ⚠️ <strong>Keep your PIN private.</strong> The church office will never ask you to share it. If you did not expect this email, please contact us immediately.
                </p>
              </div>

              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />
              <p style="margin:0;color:#9ca3af;font-size:12px;text-align:center;line-height:1.6;">
                HKM Ministries International · Utawala, Mihango, Nairobi, Kenya<br />
                <a href="https://hkmministries.org" style="color:#9ca3af;">hkmministries.org</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendEmailViaResend(
  payload: PinNotificationPayload,
  settings: NotificationSettings,
): Promise<{ sent: boolean; error?: string }> {
  if (!payload.email) {
    return { sent: false, error: 'Member has no email address on file.' };
  }
  if (!settings.resendApiKey) {
    return {
      sent: false,
      error: 'Resend API key not configured. Go to Settings → Email Config.',
    };
  }

  const html = buildPinEmailHtml(
    payload.memberName,
    payload.memberId,
    payload.pin,
    settings.portalUrl,
    payload.orgEmail,
  );

  try {
    const response = await withRetry(async () => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `HKM Ministries <${settings.resendFromEmail}>`,
          to: [payload.email],
          subject: 'Your HKM Member Portal PIN — Keep This Private',
          html,
        }),
      });
      if (!res.ok && res.status >= 500) {
        // Trigger retry on 5xx errors
        throw new Error(`Resend API returned ${res.status}`);
      }
      return res;
    });

    const result = await response.json();

    if (response.ok && result.id) {
      console.log(`[PinNotification] Email sent to ${payload.email} via Resend. ID: ${result.id}`);
      return { sent: true };
    }

    const errMsg = result.message || result.name || `HTTP ${response.status}`;
    console.error('[PinNotification] Resend error:', result);
    return { sent: false, error: `Resend: ${errMsg}` };
  } catch (err: any) {
    console.error('[PinNotification] Email network error:', err);
    return { sent: false, error: `Network error: ${err.message}` };
  }
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Send the auto-generated portal PIN to a member via SMS and Email.
 *
 * Both channels run in parallel. Failure in one channel does not affect the other.
 * Returns a result object so the caller can log or display outcomes.
 *
 * @example
 * const result = await sendPinNotification({
 *   memberId: 'HKM-1234567890',
 *   memberName: 'Jane Wanjiku',
 *   phone: '+254712345678',
 *   email: 'jane@example.com',
 *   pin: '847291',
 * });
 * console.log(result); // { sms: { sent: true }, email: { sent: true } }
 */
export async function sendPinNotification(payload: PinNotificationPayload): Promise<NotificationResult> {
  const settings = loadNotificationSettings();

  const results: NotificationResult = {
    sms: { sent: false, error: 'Not attempted' },
    email: { sent: false, error: 'Not attempted' },
  };

  // 1. Send SMS — Priority: Textbee (free) → Africa's Talking (paid, custom sender name)
  if (settings.textbeeApiKey && settings.textbeeDeviceId) {
    results.sms = await sendSmsViaTextbee(payload, settings);
  } else if (settings.atApiKey) {
    results.sms = await sendSmsViaAfricasTalking(payload, settings);
  } else {
    results.sms = {
      sent: false,
      error: "Neither Textbee nor Africa's Talking are configured. Go to Settings → SMS Config.",
    };
  }

  // 2. Send Email
  results.email = await sendEmailViaResend(payload, settings);

  console.log('[PinNotification] Results:', results);
  return results;
}
