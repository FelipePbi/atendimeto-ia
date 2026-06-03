import type { PrismaClient } from "@prisma/client";
import {
  channelMessageLogContext,
  type DiagnosticLogger,
  maskPhone,
  noopDiagnosticLogger
} from "../../lib/diagnostic-log.js";
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
    private readonly logger: DiagnosticLogger = noopDiagnosticLogger,
    private readonly openAi = new OpenAiResponsesClient(),
    private readonly tools = new AssistantToolRegistry(prisma)
  ) {}

  async handleIncomingText(input: IncomingAssistantMessage): Promise<AssistantReply> {
    const channelMessage = input.channelMessage;
    const phone = channelMessage?.customerPhone ?? input.phone;
    const customerName = channelMessage?.customerName ?? input.customerName;
    const whatsappMessageId = channelMessage?.messageId ?? input.whatsappMessageId;
    const rawPayload = channelMessage?.raw ?? input.rawPayload;
    const baseContext = channelMessage
      ? channelMessageLogContext(channelMessage)
      : { phone: maskPhone(phone), textLength: input.text.length };

    this.logger.info(baseContext, "Assistant started inbound text handling");

    this.logger.info(baseContext, "Assistant upserting conversation");
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
    this.logger.info(
      {
        ...baseContext,
        conversationId: conversation.id
      },
      "Assistant upserted conversation"
    );

    this.logger.info(
      {
        ...baseContext,
        conversationId: conversation.id,
        whatsappMessageId
      },
      "Assistant saving inbound message"
    );
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
    this.logger.info(
      {
        ...baseContext,
        conversationId: conversation.id
      },
      "Assistant saved inbound message"
    );

    const recentMessages = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      take: 12
    });

    const chronologicalMessages = recentMessages.reverse().map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.body
    }));
    this.logger.info(
      {
        ...baseContext,
        conversationId: conversation.id,
        recentMessageCount: chronologicalMessages.length
      },
      "Assistant loaded conversation context"
    );

    const instructions = buildSystemPrompt(conversation.state);
    this.logger.info(
      {
        ...baseContext,
        conversationId: conversation.id,
        toolCount: this.tools.definitions.length
      },
      "Assistant calling OpenAI tool loop"
    );
    const reply = await this.runToolLoop({
      conversationId: conversation.id,
      phone,
      customerName,
      instructions,
      input: chronologicalMessages
    });
    this.logger.info(
      {
        ...baseContext,
        conversationId: conversation.id,
        replyLength: reply.length
      },
      "Assistant generated reply"
    );

    const assistantMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        direction: "OUTBOUND",
        role: "assistant",
        body: reply
      }
    });
    this.logger.info(
      {
        ...baseContext,
        conversationId: conversation.id,
        messageRecordId: assistantMessage.id
      },
      "Assistant saved outbound message"
    );

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
    this.logger.info(
      {
        messageRecordId: input.messageRecordId,
        providerMessageId: input.providerMessageId,
        hasRawPayload: input.rawPayload !== undefined
      },
      "Assistant marking outbound message"
    );
    await this.prisma.message.update({
      where: { id: input.messageRecordId },
      data: {
        whatsappMessageId: input.providerMessageId,
        rawPayload: input.rawPayload as object
      }
    });
    this.logger.info(
      {
        messageRecordId: input.messageRecordId,
        providerMessageId: input.providerMessageId,
        hasRawPayload: input.rawPayload !== undefined
      },
      "Assistant marked outbound message"
    );
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
      this.logger.info(
        {
          conversationId: args.conversationId,
          phone: maskPhone(args.phone),
          iteration,
          inputItems: input.length,
          toolCount: this.tools.definitions.length
        },
        "Assistant OpenAI request starting"
      );
      const response = await this.openAi.createResponse({
        instructions: args.instructions,
        input,
        tools: this.tools.definitions
      });

      lastResponse = response;
      const functionCalls = extractFunctionCalls(response);
      this.logger.info(
        {
          conversationId: args.conversationId,
          phone: maskPhone(args.phone),
          iteration,
          responseId: response.id,
          functionCallCount: functionCalls.length,
          outputTextLength: extractOutputText(response).length
        },
        "Assistant OpenAI response received"
      );
      if (functionCalls.length === 0) {
        return extractOutputText(response) || "Certo, vou te ajudar por aqui.";
      }

      input = [...input, ...(response.output ?? [])];

      for (const call of functionCalls) {
        const parsedArgs = safeParseJson(call.arguments);
        this.logger.info(
          {
            conversationId: args.conversationId,
            phone: maskPhone(args.phone),
            iteration,
            toolName: call.name,
            callId: call.call_id
          },
          "Assistant tool call started"
        );
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
          this.logger.info(
            {
              conversationId: args.conversationId,
              phone: maskPhone(args.phone),
              iteration,
              toolName: call.name,
              callId: call.call_id
            },
            "Assistant tool call succeeded"
          );
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
          this.logger.error(
            {
              conversationId: args.conversationId,
              phone: maskPhone(args.phone),
              iteration,
              toolName: call.name,
              callId: call.call_id,
              err: result.error
            },
            "Assistant tool call failed"
          );
        }
      }
    }

    this.logger.warn(
      {
        conversationId: args.conversationId,
        phone: maskPhone(args.phone)
      },
      "Assistant tool loop reached iteration limit"
    );
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
