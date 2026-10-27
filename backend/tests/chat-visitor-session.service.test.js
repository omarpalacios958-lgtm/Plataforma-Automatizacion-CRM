'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const repoPath = require.resolve('../src/modules/chat/repositories/visitor.repository');
const servicePath = require.resolve('../src/modules/chat/services/visitor.service');
const { validarInvitado } = require('../src/modules/chat/validations/visitor.validation');
const records = new Map();
let nextId = 1;
const repositoryMock = {
  async crearInvitadoConSesion({ nombre, correo, tokenHash, expiresAt }) {
    const id = nextId++;
    const visitor = { id, nombre, correo, registrado: false, activo: true };
    records.set(tokenHash, { id, visitor, expiresAt, revokedAt: null });
    return visitor;
  },
  async buscarSesionVigente(tokenHash, now) {
    const s = records.get(tokenHash);
    return s && !s.revokedAt && s.expiresAt > now && s.visitor.activo
      ? { id: s.id, expiresAt: s.expiresAt, visitor: s.visitor } : null;
  },
  async revocarSesion(id, now) {
    for (const s of records.values()) {
      if (s.id === id && !s.revokedAt && s.expiresAt > now) {
        s.revokedAt = now;
        return { count: 1 };
      }
    }
    return { count: 0 };
  },
};
require.cache[repoPath] = { id: repoPath, filename: repoPath, loaded: true, exports: repositoryMock };
const service = require(servicePath);
const hash = token => createHash('sha256').update(token).digest('hex');

test('valida y normaliza nombre y correo opcional', () => {
  assert.deepEqual(validarInvitado({ nombre: '  Ana  ', correo: '  ANA@Example.COM ' }),
    { nombre: 'Ana', correo: 'ana@example.com' });
  assert.equal(validarInvitado({ nombre: 'Visitante' }).correo, null);
});
test('rechaza datos invalidos', () => {
  for (const body of [null, [], {}, { nombre: 'A' }, { nombre: 'X'.repeat(121) },
    { nombre: 'Ana', correo: 'invalido' }, { nombre: 'Ana', correo: 5 }]) {
    assert.throws(() => validarInvitado(body), { status: 400 });
  }
});
test('crea token aleatorio, guarda solo hash y expira en 24 horas', async () => {
  const before = Date.now();
  const created = await service.crearSesion({ nombre: 'Ana', correo: 'ana@example.com' });
  assert.match(created.token, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(created.visitor.registrado, false);
  assert.equal(created.expiresAt.getTime() >= before + 86400000, true);
  assert.equal(created.expiresAt.getTime() <= Date.now() + 86400000, true);
  assert.equal(records.has(created.token), false);
  assert.equal(records.has(hash(created.token)), true);
});
test('crea identidades separadas aunque coincida el correo', async () => {
  const a = await service.crearSesion({ nombre: 'Alicia', correo: 'same@example.com' });
  const b = await service.crearSesion({ nombre: 'Alicia', correo: 'same@example.com' });
  assert.notEqual(a.visitor.id, b.visitor.id);
  assert.notEqual(a.token, b.token);
});
test('verifica una sesion vigente', async () => {
  const created = await service.crearSesion({ nombre: 'Ana' });
  const session = await service.verificarToken(created.token);
  assert.equal(session.visitor.id, created.visitor.id);
});
test('rechaza token malformado o inexistente', async () => {
  await assert.rejects(service.verificarToken('abc'), { status: 401 });
  await assert.rejects(service.verificarToken('A'.repeat(43)), { status: 401 });
});
test('rechaza sesiones expiradas e identidades inactivas', async () => {
  const created = await service.crearSesion({ nombre: 'Ana' });
  const entry = records.get(hash(created.token));
  entry.expiresAt = new Date(Date.now() - 1000);
  await assert.rejects(service.verificarToken(created.token), { status: 401 });
  entry.expiresAt = new Date(Date.now() + 10000);
  entry.visitor.activo = false;
  await assert.rejects(service.verificarToken(created.token), { status: 401 });
});
test('revoca sesion y bloquea consultas posteriores', async () => {
  const created = await service.crearSesion({ nombre: 'Ana' });
  const session = await service.verificarToken(created.token);
  await service.cerrarSesion(session.id);
  await assert.rejects(service.verificarToken(created.token), { status: 401 });
  await assert.rejects(service.cerrarSesion(session.id), { status: 401 });
});
