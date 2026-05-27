import type { PrismaClient } from "@prisma/client";
import { toErrorMessage } from "../../lib/errors.js";
import { buildSystemPrompt } from "../openai/prompts.js";
import {
  extractFunctionCalls,
  extractOutputText,
  OpenAiResponsesClient,
  type ResponsesApiResponse
} from "../openai/openai-client.js";
import { AssistantToolRegistry } from "../openai/tools.js";
import type { ChannelInboundMessage } from "../channel/domain/ChannelMessage.js";

export interface IncomingAssistantMessage {
  phone: string;
  text: string;
  channelMessage?: ChannelInboundMessage;
  whatsappMessageId?: string;
  customerName?: string | null;
  rawPayload?: unknown;
}

export interface AssistantReply {
  text: string;
  conversationId: string;
  messageRecordId: string;
}

export class AssistantService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly openAi = new OpenAiResponsesClient(),
    private readonly tools = new AssistantToolRegistry(prisma)
  ) {}

  async handleIncomingText(input: IncomingAssistantMessage): Promise<AssistantReply> {
    const channelMessage = input.channelMessage;
    const phone = channelMessage?.customerPhone ?? input.phone;
    const customerName = channelMessage?.customerName ?? input.customerName;
    const whatsappMessageId = channelMessage?.messageId ?? input.whatsappMessageId;
    const rawPayload = channelMessage?.raw ?? input.rawPayload;

    const conversation = await this.prisma.conversation.upsert({
      where: { whatsappPhone: phone },
      update: {
        customerName: customerName ?? undefined,
        status: "ACTIVE",
        humanHandoff: false,
        handoffPausedUntil: null
      },
      create: {
        whatsappPhone: phone,
        customerName: customerName ?? null,
        state: {}
      }
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "INBOUND",
        role: "user",
        body: input.text,
        whatsappMessageId,
        rawPayload: rawPayload as object
      }
    });

    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 12
    });

    const chronologicalMessages = recentMessages.reverse().map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.body
    }));

    const instructions = buildSystemPrompt(conversation.state);
    const reply = await this.runToolLoop({
      conversationId: conversation.id,
      phone,
      customerName,
      instructions,
      input: chronologicalMessages
    });

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        role: "assistant",
        body: reply
      }
    });

    return {
      text: reply,
      conversationId: conversation.id,
      messageRecordId: assistantMessage.id
    };
  }

  async markOutboundMessageSent(input: {
    messageRecordId: string;
    providerMessageId?: string;
    rawPayload?: unknown;
  }): Promise<void> {
    await this.prisma.message.update({
      where: { id: input.messageRecordId },
      data: {
        whatsappMessageId: input.providerMessageId,
        rawPayload: input.rawPayload as object
      }
    });
  }

  private async runToolLoop(args: {
    conversationId: string;
    phone: string;
    customerName?: string | null;
    instructions: string;
    input: unknown[];
  }): Promise<string> {
    let input = [...args.input];
    let lastResponse: ResponsesApiResponse | null = null;

    for (let iteration = 0; iteration < 5; iteration += 1) {
      const response = await this.openAi.createResponse({
        instructions: args.instructions,
        input,
        tools: this.tools.definitions
      });

      lastResponse = response;
      const functionCalls = extractFunctionCalls(response);
      if (functionCalls.length === 0) {
        return extractOutputText(response) || "Certo, vou te ajudar por aqui.";
      }

      input = [...input, ...(response.output ?? [])];

      for (const call of functionCalls) {
        const parsedArgs = safeParseJson(call.arguments);
        const toolCall = await this.prisma.toolCall.create({
          data: {
            conversationId: args.conversationId,
            name: call.name,
            arguments: parsedArgs as object,
            status: "STARTED"
          }
        });

        try {
          const result = await this.tools.execute(call.name, parsedArgs, {
            conversationId: args.conversationId,
            phone: args.phone,
            customerName: args.customerName
          });

          await this.prisma.toolCall.update({
            where: { id: toolCall.id },
            data: {
              result: result as object,
              status: "SUCCEEDED",
              completedAt: new Date()
            }
          });

          input.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(result)
          });
        } catch (error) {
          const result = { ok: false, error: toErrorMessage(error) };
          await this.prisma.toolCall.update({
            where: { id: toolCall.id },
            data: {
              result,
              status: "FAILED",
              error: result.error,
              completedAt: new Date()
            }
          });

          input.push({
            type: "function_call_output",
            call_id: call.call_id,
            output: JSON.stringify(result)
          });
        }
      }
    }

    return extractOutputText(lastResponse ?? { id: "none" }) || "Vou chamar a profissional para continuar seu atendimento.";
  }
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}
