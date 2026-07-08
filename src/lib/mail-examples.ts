import { sendEmail } from './mail';

export async function sendWelcomeEmail(email: string, name: string) {
  return sendEmail({
    to: email,
    subject: 'Добро пожаловать!',
    html: `<h1>Добро пожаловать, ${name}!</h1>`,
  });
}

export async function sendContactFormEmail(name: string, email: string, message: string) {
  return sendEmail({
    to: process.env.SUPPORT_EMAIL || '',
    subject: `Сообщение от ${name}`,
    html: `<p>Имя: ${name}</p><p>Email: ${email}</p><p>${message}</p>`,
  });
}
