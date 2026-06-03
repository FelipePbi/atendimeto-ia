export interface DiagnosticLogger {
  info(payload: Record<string, unknown>, message?: string): void;
  warn(payload: Record<string, unknown>, message?: string): void;
  error(payload: Record<string, unknown>, message?: string): void;
  debug?(payload: Record<string, unknown>, message?: string): void;
}

export const noopDiagnosticLogger: DiagnosticLogger = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined
};

interface ChannelMessageLogInput {
  provider?: string;
  instanceId?: string;
  messageId?: string;
  chatId?: string;
  customerPhone?: string;
  fromMe?: boolean;
  isGroup?: boolean;
  kind?: string;
  text?: string;
  timestamp?: string;
}

export function channelMessageLogContext(message: ChannelMessageLogInput): Record<string, unknown> {
  return {
    provider: message.provider,
    instanceId: message.instanceId,
    messageId: message.messageId,
    chatId: message.chatId,
    phone: maskPhone(message.customerPhone),
    fromMe: message.fromMe,
    isGroup: message.isGroup,
    kind: message.kind,
    textLength: message.text?.length ?? 0,
    timestamp: message.timestamp
  };
}

export function maskPhone(phone: string | undefined): string | undefined {
  if (!phone) return undefined;
  const visible = phone.slice(-4);
  return `${"*".repeat(Math.max(phone.length - visible.length, 0))}${visible}`;
}

export function truncateDiagnostic(value: unknown, maxLength = 500): string {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}
