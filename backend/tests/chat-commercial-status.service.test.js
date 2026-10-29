
'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const servicePath = require.resolve(
  '../src/modules/chat/services/commercial.service'
);

const repositoryPath = require.resolve(
  '../src/modules/chat/repositories/commercial.repository'
);

function cargarServicio(repositoryMock) {
  const originalRepository = require.cache[repositoryPath];
  const originalService = require.cache[servicePath];

  require.cache[repositoryPath] = {
    id: repositoryPath,
    filename: repositoryPath,
    loaded: true,
    exports: repositoryMock,
  };

  delete require.cache[servicePath];

  const service = require(servicePath);

  return {
    service,
    restaurar() {
      delete require.cache[servicePath];

      if (originalService) {
        require.cache[servicePath] = originalService;
      }

      if (originalRepository) {
        require.cache[repositoryPath] = originalRepository;
      } else {
        delete require.cache[repositoryPath];
      }
    },
  };
}

function crearRepositorio() {
  return {
    async buscarEmpleado(id) {
      return {
        id,
        activo: true,
        role: { nombre: 'Vendedor' },
      };
    },

    async cambiarEstado(conversationId, agentId, anterior, nuevo) {
      return {
        conversation: {
          id: conversationId,
          assignedAgentId: agentId,
          estado: nuevo,
        },
      };
    },
  };
}

test('permite iniciar una conversacion asignada', async () => {
  const repo = crearRepositorio();
  const { service, restaurar } = cargarServicio(repo);

  try {
    const result = await service.cambiarEstado(
      { id: 1 },
      '3',
      { estado: 'EN_CURSO' }
    );

    assert.equal(result.estado, 'EN_CURSO');
    assert.equal(result.assignedAgentId, 1);
  } finally {
    restaurar();
  }
});

test('permite resolver una conversacion en curso', async () => {
  const repo = crearRepositorio();
  const { service, restaurar } = cargarServicio(repo);

  try {
    const result = await service.cambiarEstado(
      { id: 1 },
      '3',
      { estado: 'RESUELTA' }
    );

    assert.equal(result.estado, 'RESUELTA');
  } finally {
    restaurar();
  }
});

test('rechaza estados de destino invalidos', async () => {
  const repo = crearRepositorio();
  const { service, restaurar } = cargarServicio(repo);

  try {
    await assert.rejects(
      service.cambiarEstado(
        { id: 1 },
        '3',
        { estado: 'PENDIENTE' }
      ),
      { status: 400 }
    );
  } finally {
    restaurar();
  }
});

test('oculta conversaciones ajenas o inexistentes', async () => {
  const repo = crearRepositorio();

  repo.cambiarEstado = async () => ({
    error: 'NOT_FOUND',
  });

  const { service, restaurar } = cargarServicio(repo);

  try {
    await assert.rejects(
      service.cambiarEstado(
        { id: 1 },
        '3',
        { estado: 'EN_CURSO' }
      ),
      { status: 404 }
    );
  } finally {
    restaurar();
  }
});

test('rechaza transiciones invalidas', async () => {
  const repo = crearRepositorio();

  repo.cambiarEstado = async () => ({
    error: 'CONFLICT',
  });

  const { service, restaurar } = cargarServicio(repo);

  try {
    await assert.rejects(
      service.cambiarEstado(
        { id: 1 },
        '3',
        { estado: 'RESUELTA' }
      ),
      { status: 409 }
    );
  } finally {
    restaurar();
  }
});
