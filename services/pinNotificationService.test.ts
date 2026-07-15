import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendPinNotification } from './pinNotificationService';

describe('pinNotificationService Retry Logic', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Mock local storage to provide fake keys
    vi.stubGlobal('localStorage', {
      getItem: vi.fn().mockReturnValue(
        JSON.stringify({
          smsConfig: { apiKey: 'test-sms-key', senderId: 'TEST' },
          emailConfig: { resendApiKey: 'test-email-key', resendFromEmail: 'test@hkm.org', portalUrl: 'http://test' },
        }),
      ),
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('retries on 500 error for Resend', async () => {
    let attempts = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('api.resend.com')) {
          attempts++;
          if (attempts < 3) {
            return { ok: false, status: 500, json: async () => ({ message: 'Server error' }) };
          }
          return { ok: true, status: 200, json: async () => ({ id: 'resend-id-123' }) };
        }

        // Stub SMS to succeed immediately
        if (url.includes('arkesel.com')) {
          return { ok: true, status: 200, json: async () => ({ status: 'success' }) };
        }

        return { ok: false, status: 404 };
      }),
    );

    const promise = sendPinNotification({
      memberId: 'M-123',
      memberName: 'John',
      email: 'john@test.com',
      phone: '+254700000000',
      pin: '123456',
    });

    await vi.runAllTimersAsync();
    const result = await promise;

    expect(attempts).toBe(3); // Should retry 3 times and succeed on 3rd
    expect(result.email.sent).toBe(true);
    expect(result.sms.sent).toBe(true);
  });
});
