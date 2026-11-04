-- AlterTable
ALTER TABLE "ChatParticipant" ADD COLUMN     "lastReadMessageId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_conversationId_id_key" ON "ChatMessage"("conversationId", "id");

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_conversationId_lastReadMessageId_fkey" FOREIGN KEY ("conversationId", "lastReadMessageId") REFERENCES "ChatMessage"("conversationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
