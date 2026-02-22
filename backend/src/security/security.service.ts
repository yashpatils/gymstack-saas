import { Injectable } from '@nestjs/common';
import {
  RequestDisableTwoStepEmailDto,
  RequestEnableTwoStepEmailDto,
  TwoStepOtpChallengeResponseDto,
  TwoStepToggleResponseDto,
  VerifyDisableTwoStepEmailDto,
  VerifyEnableTwoStepEmailDto,
} from './dto/two-step-email.dto';

export type SecurityRequestMeta = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class SecurityService {
  async requestEnableTwoStepEmail(
    _requester: { id: string; email: string },
    _dto: RequestEnableTwoStepEmailDto,
    _meta?: SecurityRequestMeta,
  ): Promise<TwoStepOtpChallengeResponseDto> {
    throw new Error('Not implemented');
  }

  async verifyEnableTwoStepEmail(
    _requester: { id: string; email: string },
    _dto: VerifyEnableTwoStepEmailDto,
    _meta?: SecurityRequestMeta,
  ): Promise<TwoStepToggleResponseDto> {
    throw new Error('Not implemented');
  }

  async requestDisableTwoStepEmail(
    _requester: { id: string; email: string },
    _dto: RequestDisableTwoStepEmailDto,
    _meta?: SecurityRequestMeta,
  ): Promise<TwoStepOtpChallengeResponseDto> {
    throw new Error('Not implemented');
  }

  async verifyDisableTwoStepEmail(
    _requester: { id: string; email: string },
    _dto: VerifyDisableTwoStepEmailDto,
    _meta?: SecurityRequestMeta,
  ): Promise<TwoStepToggleResponseDto> {
    throw new Error('Not implemented');
  }
}
