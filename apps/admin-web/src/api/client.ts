const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const raw = localStorage.getItem('admin-auth');
  const token = raw ? JSON.parse(raw).state?.token : null;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || 'Erro de conexão');
  }
  return res.json();
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) => request<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(p: string, body?: unknown) => request<T>(p, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};
