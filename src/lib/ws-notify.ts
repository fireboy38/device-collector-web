export async function wsNotify(type: string, title: string, message: string, data?: Record<string, unknown>) {
  try {
    await fetch('http://localhost:3003/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title, message, data }),
    });
  } catch {
    // WebSocket service may not be running, silently fail
  }
}
