export interface WhatsAppWebhookBody {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: {
          display_phone_number?: string;
          phone_number_id?: string;
        };
        contacts?: Array<{
          wa_id: string;
          profile?: {
            name?: string;
          };
        }>;
        messages?: WhatsAppInboundMessage[];
        statuses?: unknown[];
      };
    }>;
  }>;
}

export interface WhatsAppInboundMessage {
  from: string;
  id: string;
  timestamp?: string;
  type: string;
  text?: {
    body?: string;
  };
}

export interface ParsedWhatsAppMessage {
  id: string;
  from: string;
  type: string;
  text?: string;
  profileName?: string | null;
  raw: WhatsAppInboundMessage;
}
