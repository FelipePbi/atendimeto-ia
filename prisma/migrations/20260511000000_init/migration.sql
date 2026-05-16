-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ACTIVE', 'HUMAN_HANDOFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "ToolCallStatus" AS ENUM ('STARTED', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'RESCHEDULED', 'CANCELLED', 'FAILED');

-- CreateEnum
CREATE TYPE "HandoffStatus" AS ENUM ('OPEN', 'RESOLVED');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "whatsappPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "currentIntent" TEXT,
    "state" JSONB,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ACTIVE',
    "humanHandoff" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "role" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "whatsappMessageId" TEXT,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "id" TEXT NOT NULL,
    "whatsappMessageId" TEXT NOT NULL,
    "rawPayload" JSONB,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolCall" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "arguments" JSONB NOT NULL,
    "result" JSONB,
    "status" "ToolCallStatus" NOT NULL DEFAULT 'STARTED',
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ToolCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLink" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "minhaAgendaCustomerId" INTEGER,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalAppointment" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "minhaAgendaAppointmentId" INTEGER NOT NULL,
    "customerId" INTEGER NOT NULL,
    "serviceId" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalAppointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Handoff" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT,
    "phone" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "summary" TEXT,
    "status" "HandoffStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Handoff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_whatsappPhone_key" ON "Conversation"("whatsappPhone");

-- CreateIndex
CREATE UNIQUE INDEX "Message_whatsappMessageId_key" ON "Message"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedEvent_whatsappMessageId_key" ON "ProcessedEvent"("whatsappMessageId");

-- CreateIndex
CREATE INDEX "ToolCall_conversationId_createdAt_idx" ON "ToolCall"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLink_phone_key" ON "CustomerLink"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalAppointment_minhaAgendaAppointmentId_key" ON "ExternalAppointment"("minhaAgendaAppointmentId");

-- CreateIndex
CREATE INDEX "ExternalAppointment_customerId_date_idx" ON "ExternalAppointment"("customerId", "date");

-- CreateIndex
CREATE INDEX "Handoff_status_createdAt_idx" ON "Handoff"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Handoff_phone_idx" ON "Handoff"("phone");

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolCall" ADD CONSTRAINT "ToolCall_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalAppointment" ADD CONSTRAINT "ExternalAppointment_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Handoff" ADD CONSTRAINT "Handoff_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
