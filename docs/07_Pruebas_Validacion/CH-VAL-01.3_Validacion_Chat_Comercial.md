# CH-VAL-01.3 — Validación integral del chat comercial

## 1. Información general

- Proyecto: Plataforma Web para Automatización de Comunicación Empresarial con enfoque CRM.
- Módulo: Chat web comercial.
- Rama: feature/chat-web.
- Referencia Git: a2f8e1a.
- Fecha de validación: 2026-11-06.
- Estado: Aprobado para el alcance evaluado.

## 2. Objetivo

Validar la integración entre el frontend y el backend del chat comercial, incluyendo el acceso de visitantes, la asignación de agentes, el intercambio bidireccional de mensajes, la resolución de conversaciones y las restricciones posteriores al cierre.

## 3. Entorno de validación

- Backend: Node.js, Prisma y PostgreSQL.
- Frontend: React y Vite.
- Base de datos de pruebas: crm_chat_integration_test.
- Backend manual: http://127.0.0.1:3100.
- Frontend manual: http://localhost:5173.
- Base principal excluida de las pruebas: crm_automatizacion.
- Programador de automatizaciones: no iniciado durante la prueba manual.

## 4. Validación funcional E2E

Conversación de referencia: #446.

Agente de prueba: #515, con rol Vendedor.

Procedimiento ejecutado:

1. Inicio de sesión del agente en el CRM.
2. Acceso de un visitante mediante la página pública del chat.
3. Creación de una conversación comercial con mensaje inicial.
4. Visualización de la conversación en la bandeja comercial.
5. Asignación de la conversación al agente.
6. Transición de estado a EN_CURSO.
7. Envío de un mensaje del agente al visitante.
8. Respuesta del visitante al agente.
9. Comprobación del historial en ambas interfaces.
10. Resolución de la conversación.
11. Verificación del estado RESUELTA y conservación del historial.
12. Verificación de las restricciones de escritura mediante inspección de código y pruebas automatizadas.

Resultado: flujo principal aprobado.

Se observaron tres mensajes conservados, en orden cronológico y sin duplicados.

## 5. Pruebas automatizadas

| Componente | Pruebas aprobadas | Fallidas |
|---|---:|---:|
| Backend — unitarias | 237 | 0 |
| Backend — integración | 25 | 0 |
| Frontend — Vitest | 238 | 0 |
| Total | 500 | 0 |

Las 237 pruebas unitarias y las 25 pruebas de integración fueron ejecutadas nuevamente durante esta etapa.

Las 238 pruebas del frontend corresponden a la última ejecución satisfactoria reportada anteriormente.

La compilación del frontend también había sido validada previamente.

## 6. Validaciones de concurrencia

Las pruebas de integración confirmaron:

- Una sola asignación ganadora entre agentes concurrentes.
- Rechazo de mensajes después de resolver la conversación.
- Conservación de mensajes confirmados antes del cierre.
- Control de cierres simultáneos.
- Persistencia de mensajes simultáneos válidos.
- Idempotencia de mensajes con el mismo identificador.
- Coordinación mediante bloqueos FOR UPDATE.
- Rechazo de mensajes del agente y del visitante cuando el cierre se confirma primero.

Resultado: 25 de 25 pruebas de integración aprobadas.

## 7. Observaciones y limitaciones

- La interfaz comercial mostró identificadores de participantes en lugar de nombres descriptivos.
- No se documentó una prueba manual de reconexión prolongada o pérdida de conectividad.
- No se documentó una prueba manual de múltiples navegadores concurrentes sobre la misma sesión.
- El alcance validado corresponde al flujo comercial principal y sus restricciones; no representa una certificación completa de toda la plataforma.

## 8. Conclusión técnica

La validación CH-VAL-01.3 se considera completada para el alcance evaluado.

El flujo comercial principal funcionó correctamente en la prueba manual E2E. Las pruebas automatizadas confirmaron las restricciones de escritura, las transiciones de estado y los principales escenarios de concurrencia.

No se identificó la necesidad de modificar el código funcional como resultado de esta validación.

La implementación en servidor de producción permanece pendiente dentro del alcance general del proyecto.
