
const prisma = require("../../../config/database");
const automationExecutionService = require("./automation-execution.service");

const INTERVALO_REVISION_MS = 60 * 1000;

class AutomationSchedulerService {
    constructor() {
        this.intervalo = null;
        this.procesando = false;
    }

    async procesarSeguimientosVencidos() {
        if (this.procesando) {
            return;
        }

        this.procesando = true;

        try {
            const ahora = new Date();

            const leads = await prisma.lead.findMany({
                where: {
                    activo: true,
                    fechaSeguimiento: {
                        lte: ahora
                    },
                    estado: {
                        notIn: ["Convertido", "Perdido"]
                    }
                },
                select: {
                    id: true,
                    userId: true,
                    fechaSeguimiento: true
                },
                orderBy: {
                    fechaSeguimiento: "asc"
                }
            });

            for (const lead of leads) {
                try {
                    await automationExecutionService.procesarEvento({
                        evento: "SEGUIMIENTO_VENCIDO",
                        leadId: lead.id,
                        userId: lead.userId,
                        fechaEvento: lead.fechaSeguimiento
                    });
                } catch (error) {
                    console.error(
                        `Error al procesar el seguimiento del lead ${lead.id}:`,
                        error.message
                    );
                }
            }
        } catch (error) {
            console.error(
                "Error al consultar seguimientos vencidos:",
                error.message
            );
        } finally {
            this.procesando = false;
        }
    }

    iniciar() {
        if (this.intervalo) {
            return;
        }

        console.log(
            "Programador de seguimientos vencidos iniciado."
        );

        // Primera revisión al iniciar el servicio.
        void this.procesarSeguimientosVencidos();

        // Revisiones posteriores cada minuto.
        this.intervalo = setInterval(() => {
            void this.procesarSeguimientosVencidos();
        }, INTERVALO_REVISION_MS);
    }

    detener() {
        if (this.intervalo) {
            clearInterval(this.intervalo);
            this.intervalo = null;
        }

        console.log(
            "Programador de seguimientos vencidos detenido."
        );
    }
}

module.exports = new AutomationSchedulerService();
