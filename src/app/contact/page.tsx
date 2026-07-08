'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setStatus('success');
        setMessage('Спасибо! Сообщение отправлено.');
        setFormData({ name: '', email: '', message: '' });
      } else {
        setStatus('error');
        setMessage(data.error || 'Ошибка');
      }
    } catch (err) {
      setStatus('error');
      setMessage('Ошибка подключения');
    }

    setTimeout(() => { setStatus('idle'); setMessage(''); }, 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Контактная форма</h1>
          <p className="text-gray-600 mb-8">Отправьте нам сообщение</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ваше имя</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ваш email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Сообщение</label>
              <textarea name="message" value={formData.message} onChange={handleChange} required rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none" />
            </div>
            <button type="submit" disabled={status === 'loading'}
              className="w-full py-3 px-4 rounded-lg font-semibold text-white bg-indigo-600 hover:bg-indigo-700">
              {status === 'loading' ? 'Отправка...' : 'Отправить'}
            </button>
          </form>

          {message && (
            <div className={`mt-6 p-4 rounded-lg ${status === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
