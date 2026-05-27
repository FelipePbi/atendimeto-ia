export interface EvolutionWebhookPayload {
  event?: string;
  instanceId?: string;
  instanceToken?: string;
  data?: {
    Info?: {
      Chat?: string;
      Sender?: string;
      IsFromMe?: boolean;
      IsGroup?: boolean;
      ID?: string;
      Type?: string;
      PushName?: string;
      Timestamp?: string;
      MediaType?: string;
    };
    Message?: Record<string, unknown>;
  };
}

export interface EvolutionSendTextResponse {
  success?: boolean;
  message?: string;
  messageId?: string;
  data?: {
    Info?: {
      ID?: string;
    };
  };
  key?: {
    id?: string;
  };
}
