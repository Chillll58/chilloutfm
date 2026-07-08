import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mail';

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, text } = await request.json();
    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    await sendEmail({ to, subject, html, text });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
