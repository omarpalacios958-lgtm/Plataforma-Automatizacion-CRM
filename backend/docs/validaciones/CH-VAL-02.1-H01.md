# CH-VAL-02.1-H01 — Restricción del historial por membresía

## Información general

- Módulo: Chat web — Comunicación interna
- Rama: feature/chat-web
- Estado: Validación técnica aprobada
- Fecha: 2026-11-06

## Problema identificado

Un empleado incorporado o reincorporado a una conversación interna
grupal podía consultar mensajes anteriores a su periodo de membresía.

Los contadores de mensajes no leídos y los marcadores de lectura ya
consideraban la fecha de incorporación, por lo que existía una
inconsistencia en el control de acceso al historial.

## Regla funcional

En conversaciones internas grupales, cada empleado solamente puede
consultar mensajes posteriores a su última incorporación al grupo.

Las conversaciones internas privadas conservan el historial completo.

Las conversaciones comerciales y de visitantes mantienen su
comportamiento anterior.

## Solución implementada

Se incorporó el método listarMensajesInternos en el repositorio de chat.

La consulta comprueba la membresía activa y utiliza joinedAt como
límite temporal exclusivamente para conversaciones internas grupales.

La autorización y la lectura se realizan dentro de una transacción
de Prisma. Se conserva la paginación mediante cursor y afterId.

No se modificó el esquema de Prisma ni se crearon migraciones.

## Archivos modificados

- src/modules/chat/repositories/chat.repository.js
- src/modules/chat/services/chat.service.js
- tests/chat-messages.service.test.js

## Archivos nuevos

- tests/chat-membership-history.repository.test.js
- tests/integration/chat-membership-history.test.js

## Evidencia de validación

Pruebas unitarias:

- Comando: npm test
- Ejecutadas: 243
- Aprobadas: 243
- Fallidas: 0

Pruebas de integración PostgreSQL:

- Comando: npm run test:integration
- Ejecutadas: 29
- Aprobadas: 29
- Fallidas: 0

Escenarios específicos comprobados:

1. Exclusión del historial anterior al ingreso.
2. Exclusión del historial anterior a la reincorporación.
3. Paginación con cursor y afterId.
4. Denegación de acceso a participantes retirados.
5. Conservación del historial en conversaciones privadas.

Verificación Git:

- git diff --check: sin errores.
- git diff --cached --check: sin errores.

## Resultado

La corrección CH-VAL-02.1-H01 superó las pruebas unitarias
y de integración previstas.

Estado del control de versiones: pendiente de commit.
