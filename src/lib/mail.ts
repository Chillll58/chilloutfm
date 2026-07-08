import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: process.env.SMTP_PORT === '465',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

transporter.verify((error, success) => {
  if (error) console.error('SMTP error:', error);
  else console.log('SMTP ready');
});

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export async function sendEmail(options: MailOptions): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: options.from || process.env.SUPPORT_EMAIL,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error('Email error:', error);
    throw error;
  }
}

export async function sendContactFormEmail(name: string, email: string, message: string): Promise<boolean> {
  return sendEmail({
    to: process.env.SUPPORT_EMAIL || '',
    subject: `Новое сообщение от ${name}`,
    html: `<h2>Контактная форма</h2><p><strong>Имя:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Сообщение:</strong> ${message}</p>`,
    text: `Имя: ${name}\nEmail: ${email}\nСообщение: ${message}`,
  });
}

export async function sendWelcomeEmail(email: string, name: string): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: 'Добро пожаловать!',
    html: `<h1>Добро пожаловать, ${name}!</h1>`,
    text: `Добро пожаловать, ${name}!`,
  });
}
