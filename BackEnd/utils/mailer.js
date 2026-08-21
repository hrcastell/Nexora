const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error('SMTP is not configured (missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS)');
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  return transporter;
}

exports.sendPasswordResetEmail = async (to, resetLink, fullName) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const greetingName = fullName ? fullName.split(' ')[0] : '';

  await getTransporter().sendMail({
    from,
    to,
    subject: 'Recuperación de contraseña — Nexora',
    text: `Hola ${greetingName},\n\nRecibimos una solicitud para restablecer tu contraseña. Este link es válido por 60 minutos:\n\n${resetLink}\n\nSi no fuiste vos, ignorá este correo.`,
    html: `
      <p>Hola ${greetingName},</p>
      <p>Recibimos una solicitud para restablecer tu contraseña. Este link es válido por 60 minutos:</p>
      <p><a href="${resetLink}">${resetLink}</a></p>
      <p>Si no fuiste vos, ignorá este correo.</p>
    `,
  });
};
