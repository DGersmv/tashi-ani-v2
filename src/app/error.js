'use client';

export default function Error({ error, reset }) {
  return (
    <div style={{ padding: '40px', textAlign: 'center', background: '#222c37', color: '#fff', borderRadius: '2rem', boxShadow: '0 0 32px #00fff944' }}>
      <h1 style={{ fontSize: '2em', fontWeight: 900, textShadow: '0 0 12px #00fff9' }}>Ошибка: {error.message}</h1>
      <button onClick={reset} style={{ padding: '12px 24px', background: 'linear-gradient(90deg, #29f2ff, #2dfcc1)', border: 'none', borderRadius: '1rem', cursor: 'pointer', boxShadow: '0 4px 16px #00fff944' }}>Перезагрузить</button>
    </div>
  );
}