
const nodemailer = require("nodemailer");
const env = require("../../../config/env");

class EmailService {
  constructor() {
    this.transporter = null;
  }

  obtenerTransporter() {
    const {
      SMTP_HOST,
      SMTP_PORT,
      SMTP_SECURE,
      SMTP_USER,
      SMTP_PASS
    } = env;

    if (
      !SMTP_HOST ||
      !SMTP_USER ||
      !SMTP_PASS ||
      !Number.isInteger(SMTP_PORT) ||
      SMTP_PORT <= 0
    ) {
      throw new Error(
        "La configuración SMTP está incompleta. Configure las variables de entorno del correo."
      );
    }

    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: {
          user: SMTP_USER,
          pass: SMTP_PASS
        }
      });
    }

    return this.transporter;
  }

  async enviarPorSMTP({ destinatario, asunto, mensaje }) {
    const transporter = this.obtenerTransporter();

    const resultado = await transporter.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: destinatario,
      subject: asunto,
      text: mensaje
    });

    return {
      messageId: resultado.messageId,
      aceptados: resultado.accepted,
      rechazados: resultado.rejected
    };
  }

  async enviarPorResend({ destinatario, asunto, mensaje }) {
    if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
      throw new Error(
        "La configuración de Resend está incompleta."
      );
    }

    let respuesta;

    try {
      respuesta = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from: env.RESEND_FROM,
          to: [destinatario],
          subject: asunto,
          text: mensaje
        }),
        signal: AbortSignal.timeout(15000)
      });
    } catch (error) {
      throw new Error(
        error.name === "TimeoutError"
          ? "Tiempo de espera agotado al conectar con Resend."
          : "No fue posible conectar con la API de Resend."
      );
    }

    if (!respuesta.ok) {
      let detalle = {};

      try {
        detalle = await respuesta.json();
      } catch {
        // Respuesta sin JSON válido.
      }

      const mensajeError =
        typeof detalle.message === "string"
          ? detalle.message
          : "No se pudo procesar el correo.";

      throw new Error(
        `Resend HTTP ${respuesta.status}: ${mensajeError}`
      );
    }

    const resultado = await respuesta.json();

    if (!resultado.id) {
      throw new Error(
        "Resend no devolvió el identificador del correo."
      );
    }

    return {
      messageId: resultado.id,
      aceptados: [destinatario],
      rechazados: []
    };
  }

  async enviar({ destinatario, asunto, mensaje }) {
    if (
      typeof destinatario !== "string" ||
      !destinatario.trim() ||
      typeof asunto !== "string" ||
      !asunto.trim() ||
      typeof mensaje !== "string" ||
      !mensaje.trim()
    ) {
      throw new Error(
        "El correo requiere destinatario, asunto y mensaje."
      );
    }

    const datos = {
      destinatario: destinatario.trim(),
      asunto: asunto.trim(),
      mensaje
    };

    if (env.EMAIL_PROVIDER === "resend") {
      return this.enviarPorResend(datos);
    }

    if (env.EMAIL_PROVIDER !== "smtp") {
      throw new Error("Proveedor de correo no soportado.");
    }

    return this.enviarPorSMTP(datos);
  }
}

module.exports = new EmailService();
