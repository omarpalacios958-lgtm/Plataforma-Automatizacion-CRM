-- CH-05.6.2.4: inicio del periodo actual de membresia.

-- Agregar el campo inicialmente nullable para preservar datos existentes.
ALTER TABLE "ChatParticipant"
ADD COLUMN "joinedAt" TIMESTAMP(3);

-- Conservar la fecha original de incorporacion.
UPDATE "ChatParticipant"
SET "joinedAt" = "createdAt";

-- Exigir joinedAt en todas las membresias.
ALTER TABLE "ChatParticipant"
ALTER COLUMN "joinedAt" SET NOT NULL;

-- Valor predeterminado para participantes nuevos.
ALTER TABLE "ChatParticipant"
ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;