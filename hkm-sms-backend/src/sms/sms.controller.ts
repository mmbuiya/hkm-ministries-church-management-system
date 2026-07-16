import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Req,
  Logger,
} from '@nestjs/common';
import { SmsService } from './sms.service';
import type { Request } from 'express';

// ─── DTO for incoming send requests from the CMS frontend ──────────────────
export interface SendSmsDto {
  memberId: string;
  memberName: string;
  phone: string;
  pin: string;
  portalUrl: string;
  textbeeApiKey: string;
  textbeeDeviceId: string;
}

@Controller('api/sms')
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(private readonly smsService: SmsService) {}

  /**
   * POST /api/sms/send
   * Called by the CMS frontend when a member's registration fee is completed.
   * Publishes the SMS job to QStash and immediately returns 202 Accepted.
   */
  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  async sendSms(@Body() payload: SendSmsDto) {
    this.logger.log(`Queuing SMS for ${payload.memberName} (${payload.phone})`);
    await this.smsService.queueViaSQStash(payload);
    return { status: 'queued', message: 'SMS job queued via QStash.' };
  }

  /**
   * POST /api/sms/webhook
   * Called by QStash when it is time to deliver the SMS.
   * QStash handles retries automatically if we return a non-2xx status.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Req() req: Request,
    @Headers('upstash-signature') signature: string,
    @Body() payload: SendSmsDto,
  ) {
    // Verify this request genuinely came from Upstash QStash
    const isValid = await this.smsService.verifyQStashSignature(
      JSON.stringify(payload),
      signature,
    );

    if (!isValid) {
      this.logger.warn('Rejected webhook: invalid QStash signature');
      return { status: 'unauthorized' };
    }

    this.logger.log(`Webhook received: sending SMS to ${payload.phone}`);
    await this.smsService.sendViaTextbee(payload);
    return { status: 'sent' };
  }
}
