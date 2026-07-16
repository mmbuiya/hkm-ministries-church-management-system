import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('storage settings merge', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  it('fills missing emailConfig from defaults', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({
        churchInfo: { name: 'Test Church', address: '', phone: '', email: '' },
        smsConfig: { apiKey: '', senderId: 'TEST', welcomeMessage: '', birthdayMessage: '' },
        aiApiKey: '',
        biometrics: {},
      }),
    );

    const { storage } = await import('./storage');
    const settings = await storage.appSettings.getAll();

    expect(settings.emailConfig).toBeDefined();
    expect(settings.emailConfig.resendApiKey).toBe('');
    expect(settings.emailConfig.resendFromEmail).toBe('noreply@hkmministries.org');
    expect(settings.emailConfig.portalUrl).toBe('https://hkmministries.org/login');
  });

  it('fills missing improvmxConfig from defaults', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({
        churchInfo: { name: 'Test', address: '', phone: '', email: '' },
        smsConfig: { apiKey: '', senderId: '', welcomeMessage: '', birthdayMessage: '' },
        emailConfig: { resendApiKey: '', resendFromEmail: '', portalUrl: '' },
        aiApiKey: '',
        biometrics: {},
      }),
    );

    const { storage } = await import('./storage');
    const settings = await storage.appSettings.getAll();

    expect(settings.improvmxConfig).toBeDefined();
    expect(settings.improvmxConfig.apiKey).toBe('');
    expect(settings.improvmxConfig.domain).toBe('hkmministries.org');
  });

  it('preserves stored values while filling missing nested fields', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({
        churchInfo: { name: 'My Church', address: '123 St', phone: '+123', email: 'info@church.org' },
        smsConfig: {
          apiKey: 'stored-key',
          senderId: 'MYID',
          textbeeApiKey: 'tb-key',
          textbeeDeviceId: 'tb-dev',
          welcomeMessage: 'Welcome!',
          birthdayMessage: 'Happy BD!',
        },
        emailConfig: {
          resendApiKey: 're-key',
          resendFromEmail: 'noreply@church.org',
          portalUrl: 'https://church.org/login',
        },
        improvmxConfig: { apiKey: 'mx-key', domain: 'church.org' },
        aiApiKey: 'ai-key',
        biometrics: { face: true },
      }),
    );

    const { storage } = await import('./storage');
    const settings = await storage.appSettings.getAll();

    expect(settings.churchInfo.name).toBe('My Church');
    expect(settings.smsConfig.apiKey).toBe('stored-key');
    expect(settings.emailConfig.resendApiKey).toBe('re-key');
    expect(settings.improvmxConfig.apiKey).toBe('mx-key');
    expect(settings.aiApiKey).toBe('ai-key');
    expect(settings.biometrics.face).toBe(true);
  });

  it('handles completely corrupt JSON by returning defaults', async () => {
    vi.mocked(localStorage.getItem).mockReturnValue('{{broken json');

    const { storage } = await import('./storage');
    const settings = await storage.appSettings.getAll();

    expect(settings.churchInfo.name).toBeTruthy();
    expect(settings.emailConfig).toBeDefined();
    expect(settings.improvmxConfig.domain).toBe('hkmministries.org');
  });
});
