'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { TEST_DATABASE, getTestDatabaseUrl, createTestPrisma, verifyTestDatabase } = require('./test-database');

const url = getTestDatabaseUrl();
const prisma = createTestPrisma();
process.env.DATABASE_URL = url;
const repo = require('../../src/modules/chat/repositories/chat.repository');
const sharedPrisma = require('../../src/config/database');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function withFixture(fn) {
  await verifyTestDatabase(prisma);
  const suffix = randomUUID();
  const role = await prisma.role.create({ data: { nombre: `TEST_ENVIO_INTERNO_${suffix}` } });
  let users = [];
  let conversation;
  try {
    for (const nombre of ['Administrador', 'Miembro']) {
      users.push(await prisma.user.create({ data: {
        nombre, apellido: 'Prueba', correo: `${nombre}-${suffix}@example.test`,
        password: 'NO_ES_UN_PASSWORD_REAL', roleId: role.id, activo: true,
      } }));
    }
    conversation = await prisma.chatConversation.create({ data: {
      tipo: 'INTERNO_GRUPAL', estado: 'EN_CURSO', nombre: `Grupo ${suffix}`,
      participants: { create: [
        { userId: users[0].id, rol: 'ADMINISTRADOR' },
        { userId: users[1].id, rol: 'MIEMBRO' },
      ] },
    } });
    const member = await prisma.chatParticipant.findUnique({
      where: { conversationId_userId: { conversationId: conversation.id, userId: users[1].id } },
    });
    await fn({ conversationId: conversation.id, adminId: users[0].id,
      memberId: users[1].id, participantId: member.id });
  } finally {
    if (conversation) {
      await prisma.chatParticipant.updateMany({
        where: { conversationId: conversation.id },
        data: { lastReadMessageId: null, lastReadAt: null },
      });
      await prisma.chatMessage.deleteMany({ where: { conversationId: conversation.id } });
      await prisma.chatParticipant.deleteMany({ where: { conversationId: conversation.id } });
      await prisma.chatConversation.delete({ where: { id: conversation.id } });
    }
    for (const user of users) await prisma.user.delete({ where: { id: user.id } });
    await prisma.role.delete({ where: { id: role.id } });
  }
}

function send(f) {
  return repo.crearMensaje({ conversationId: f.conversationId,
    participantId: f.participantId, contenido: 'Mensaje de concurrencia',
    clientMessageId: randomUUID() });
}

async function waitBlocked(blockerPid) {
  const deadline = Date.now() + 6000;
  while (Date.now() < deadline) {
    const rows = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_stat_activity AS activity
        WHERE activity.datname = current_database()
          AND activity.pid <> pg_backend_pid()
          AND ${blockerPid} = ANY(pg_blocking_pids(activity.pid))
          AND activity.query LIKE '%ChatParticipant%'
      ) AS blocked
    `;
    if (rows[0]?.blocked === true) return;
    await sleep(50);
  }
  assert.fail('No se observo bloqueo de la fila ChatParticipant');
}

test.before(async () => {
  assert.equal(await verifyTestDatabase(prisma), TEST_DATABASE);
  assert.equal(await verifyTestDatabase(sharedPrisma), TEST_DATABASE);
});
test.after(async () => {
  await Promise.all([prisma.$disconnect(), sharedPrisma.$disconnect()]);
});

test('CH-VAL-02.2-H01: retirada confirmada primero impide insertar mensaje', async () => {
  await withFixture(async (f) => {
    let release;
    let ready;
    const released = new Promise((resolve) => { release = resolve; });
    const started = new Promise((resolve) => { ready = resolve; });
    const blocker = prisma.$transaction(async (tx) => {
      const [{ pid }] = await tx.$queryRaw`SELECT pg_backend_pid() AS pid`;
      await tx.$queryRaw`
        SELECT id FROM "ChatParticipant" WHERE id = ${f.participantId} FOR UPDATE
      `;
      await tx.chatParticipant.update({
        where: { id: f.participantId }, data: { leftAt: new Date() },
      });
      ready(pid);
      await released;
    }, { timeout: 15000, maxWait: 5000 });
    let sending;
    try {
      const pid = await started;
      sending = send(f);
      await waitBlocked(pid);
    } finally {
      release();
      await Promise.allSettled([blocker, ...(sending ? [sending] : [])]);
    }
    await blocker;
    assert.deepEqual(await sending, { error: 'PARTICIPANT_NOT_FOUND' });
    assert.equal(await prisma.chatMessage.count({ where: { conversationId: f.conversationId } }), 0);
  });
});

test('CH-VAL-02.2-H01: mensaje confirmado primero se conserva tras retirada', async () => {
  await withFixture(async (f) => {
    const sent = await send(f);
    assert.ok(sent.id);
    const removed = await repo.modificarMembresia({ conversationId: f.conversationId,
      actorId: f.adminId, targetId: f.memberId, accion: 'RETIRAR' });
    assert.ok(removed.participante?.leftAt);
    assert.equal(await prisma.chatMessage.count({ where: { conversationId: f.conversationId } }), 1);
    assert.deepEqual(await send(f), { error: 'PARTICIPANT_NOT_FOUND' });
  });
});
