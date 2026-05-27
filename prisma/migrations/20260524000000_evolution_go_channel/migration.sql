-- Add handoff pause state to conversations.
ALTER TABLE "Conversation" ADD COLUMN "handoffPausedUntil" TIMESTAMP(3);

-- Rework processed events from Meta message ids to provider-scoped event keys.
ALTER TABLE "ProcessedEvent" RENAME COLUMN "whatsappMessageId" TO "eventKey";
ALTER TABLE "ProcessedEvent" ADD COLUMN "provider" TEXT NOT NULL DEFAULT 'legacy-whatsapp';
ALTER TABLE "ProcessedEvent" ADD COLUMN "instanceId" TEXT;
ALTER TABLE "ProcessedEvent" ADD COLUMN "messageId" TEXT;
UPDATE "ProcessedEvent" SET "messageId" = "eventKey" WHERE "messageId" IS NULL;
ALTER TABLE "ProcessedEvent" ALTER COLUMN "messageId" SET NOT NULL;
ALTER TABLE "ProcessedEvent" ALTER COLUMN "provider" DROP DEFAULT;
ALTER INDEX "ProcessedEvent_whatsappMessageId_key" RENAME TO "ProcessedEvent_eventKey_key";
