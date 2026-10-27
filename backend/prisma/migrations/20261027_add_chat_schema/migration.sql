-- CreateEnum
CREATE TYPE "ChatConversationType" AS ENUM ('INTERNO_PRIVADO', 'INTERNO_GRUPAL', 'COMERCIAL');

-- CreateEnum
CREATE TYPE "ChatConversationStatus" AS ENUM ('PENDIENTE', 'ASIGNADA', 'EN_CURSO', 'RESUELTA');

-- CreateEnum
CREATE TYPE "ChatParticipantRole" AS ENUM ('MIEMBRO', 'ADMINISTRADOR', 'AGENTE', 'VISITANTE');

-- CreateTable
CREATE TABLE "ChatVisitor" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "correo" TEXT,
    "passwordHash" TEXT,
    "registrado" BOOLEAN NOT NULL DEFAULT false,
    "correoVerificadoAt" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatVisitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatVisitorSession" (
    "id" SERIAL NOT NULL,
    "visitorId" INTEGER NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatVisitorSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" SERIAL NOT NULL,
    "tipo" "ChatConversationType" NOT NULL,
    "estado" "ChatConversationStatus" NOT NULL DEFAULT 'PENDIENTE',
    "nombre" TEXT,
    "privatePairKey" TEXT,
    "createdByUserId" INTEGER,
    "assignedAgentId" INTEGER,
    "contactId" INTEGER,
    "leadId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatParticipant" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "userId" INTEGER,
    "visitorId" INTEGER,
    "rol" "ChatParticipantRole" NOT NULL DEFAULT 'MIEMBRO',
    "lastReadAt" TIMESTAMP(3),
    "leftAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "participantId" INTEGER NOT NULL,
    "contenido" TEXT NOT NULL,
    "clientMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "editedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatAssignmentHistory" (
    "id" SERIAL NOT NULL,
    "conversationId" INTEGER NOT NULL,
    "fromAgentId" INTEGER,
    "toAgentId" INTEGER,
    "changedByUserId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatVisitor_correo_idx" ON "ChatVisitor"("correo");

-- CreateIndex
CREATE UNIQUE INDEX "ChatVisitorSession_tokenHash_key" ON "ChatVisitorSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ChatVisitorSession_visitorId_expiresAt_idx" ON "ChatVisitorSession"("visitorId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatConversation_privatePairKey_key" ON "ChatConversation"("privatePairKey");

-- CreateIndex
CREATE INDEX "ChatConversation_tipo_estado_updatedAt_idx" ON "ChatConversation"("tipo", "estado", "updatedAt");

-- CreateIndex
CREATE INDEX "ChatConversation_assignedAgentId_estado_idx" ON "ChatConversation"("assignedAgentId", "estado");

-- CreateIndex
CREATE INDEX "ChatConversation_contactId_idx" ON "ChatConversation"("contactId");

-- CreateIndex
CREATE INDEX "ChatConversation_leadId_idx" ON "ChatConversation"("leadId");

-- CreateIndex
CREATE INDEX "ChatParticipant_userId_leftAt_idx" ON "ChatParticipant"("userId", "leftAt");

-- CreateIndex
CREATE INDEX "ChatParticipant_visitorId_leftAt_idx" ON "ChatParticipant"("visitorId", "leftAt");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_conversationId_id_key" ON "ChatParticipant"("conversationId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_conversationId_userId_key" ON "ChatParticipant"("conversationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatParticipant_conversationId_visitorId_key" ON "ChatParticipant"("conversationId", "visitorId");

-- CreateIndex
CREATE INDEX "ChatMessage_conversationId_createdAt_id_idx" ON "ChatMessage"("conversationId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "ChatMessage_participantId_clientMessageId_key" ON "ChatMessage"("participantId", "clientMessageId");

-- CreateIndex
CREATE INDEX "ChatAssignmentHistory_conversationId_createdAt_idx" ON "ChatAssignmentHistory"("conversationId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatVisitorSession" ADD CONSTRAINT "ChatVisitorSession_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "ChatVisitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_assignedAgentId_fkey" FOREIGN KEY ("assignedAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatParticipant" ADD CONSTRAINT "ChatParticipant_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "ChatVisitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_participantId_fkey" FOREIGN KEY ("conversationId", "participantId") REFERENCES "ChatParticipant"("conversationId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAssignmentHistory" ADD CONSTRAINT "ChatAssignmentHistory_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAssignmentHistory" ADD CONSTRAINT "ChatAssignmentHistory_fromAgentId_fkey" FOREIGN KEY ("fromAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAssignmentHistory" ADD CONSTRAINT "ChatAssignmentHistory_toAgentId_fkey" FOREIGN KEY ("toAgentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatAssignmentHistory" ADD CONSTRAINT "ChatAssignmentHistory_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- =====================================================
-- CH-01: Restricciones adicionales de integridad
-- =====================================================

-- Un participante debe representar exactamente
-- a un empleado o a un visitante.
ALTER TABLE "ChatParticipant"
ADD CONSTRAINT "ChatParticipant_exactly_one_identity_check"
CHECK (
    (
        "userId" IS NOT NULL
        AND "visitorId" IS NULL
    )
    OR
    (
        "userId" IS NULL
        AND "visitorId" IS NOT NULL
    )
);

-- Las conversaciones privadas deben tener una
-- clave de pareja; otros tipos no deben utilizarla.
ALTER TABLE "ChatConversation"
ADD CONSTRAINT "ChatConversation_private_pair_key_check"
CHECK (
    (
        "tipo" = 'INTERNO_PRIVADO'
        AND "privatePairKey" IS NOT NULL
    )
    OR
    (
        "tipo" <> 'INTERNO_PRIVADO'
        AND "privatePairKey" IS NULL
    )
);
