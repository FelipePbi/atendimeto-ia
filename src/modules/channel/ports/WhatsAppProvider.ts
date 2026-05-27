import type { ChannelProviderName } from "../domain/ChannelMessage.js";

export interface SendTextInput {
  to: string;
  text: string;
  quotedMessageId?: string;
  correlationId?: string;
}

export interface SendTextResult {
  provider: ChannelProviderName;
  messageId?: string;
  raw: unknown;
}

export interface WhatsAppProvider {
  sendText(input: SendTextInput): Promise<SendTextResult>;
}
