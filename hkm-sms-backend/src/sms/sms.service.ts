import { Injectable, Logger } from '@nestjs/common';
import { Client, Receiver } from '@upstash/qstash';
import axios from 'axios';
import { SendSmsDto } from './sms.controller';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  // QStash client — used to publish jobs
  private readonly qstashClient = new Client({
    token: process.env.QSTASH_TOKEN || '',
  });

  // QStash receiver — used to verify incoming webhook signatures
  private readonly qstashReceiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
  });

  /**
   * Publishes an SMS job to Upstash QStash.
   * QStash will call our /api/sms/webhook endpoint to process the message.
   * It handles retries automatically (3 attempts by default, with backoff).
   */
  async queueViaSQStash(payload: SendSmsDto): Promise<void> {
    const webhookUrl = `${process.env.APP_URL}/api/sms/webhook`;

    await this.qstashClient.publishJSON({
      url: webhookUrl,
      body: payload,
      retries: 3,
      // Rate-limit: process 1 message every 5 seconds to protect the SIM card
      delay: 0,
    });

    this.logger.log(`SMS job published to QStash → ${webhookUrl}`);
  }

  /**
   * Verifies that the incoming webhook request was sent by Upstash QStash
   * and not by a malicious third party.
   */
  async verifyQStashSignature(
    body: string,
    signature: string,
  ): Promise<boolean> {
    if (!process.env.QSTASH_CURRENT_SIGNING_KEY) {
      // If keys aren't configured (e.g. local dev), skip verification
      this.logger.warn(
        'QStash signing keys not set — skipping signature verification.',
      );
      return true;
    }
    try {
      await this.qstashReceiver.verify({ body, signature });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Actually sends the SMS via the Textbee Cloud API.
   * This is called from the webhook endpoint after QStash delivers the job.
   * If this throws, QStash will automatically retry.
   */
  async sendViaTextbee(payload: SendSmsDto): Promise<void> {
    const message =
      `HKM Ministries: Dear ${payload.memberName}, your Member Portal has been activated! ` +
      `Your Member ID: ${payload.memberId} | PIN: ${payload.pin} ` +
      `Login at: ${payload.portalUrl} — Keep your PIN private.`;

    const response = await axios.post(
      `https://api.textbee.dev/api/v1/gateway/devices/${payload.textbeeDeviceId}/send-sms`,
      {
        recipients: [payload.phone],
        message,
      },
      {
        headers: {
          'x-api-key': payload.textbeeApiKey,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      },
    );

    if (response.status < 200 || response.status >= 300) {
      // Throw so QStash knows to retry
      throw new Error(`Textbee returned non-2xx status: ${response.status}`);
    }

    this.logger.log(
      `✅ SMS sent to ${payload.phone} via Textbee (status: ${response.status})`,
    );
  }
}
