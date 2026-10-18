
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

    const transporter = this.obtenerTransporter();

    const resultado = await transporter.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: destinatario.trim(),
      subject: asunto.trim(),
      text: mensaje
    });

    return {
      messageId: resultado.messageId,
      aceptados: resultado.accepted,
      rechazados: resultado.rejected
    };
  }
}

module.exports = new EmailService();
