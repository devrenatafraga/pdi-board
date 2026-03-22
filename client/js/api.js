/* api.js — wrapper fetch para o backend */
const API = (() => {
  async function _headers(extra = {}) {
    const token = window.Auth ? await Auth.getToken() : null;
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
  }

  return {
    async get(path) {
      const r = await fetch(`/api${path}`, { headers: await _headers() });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async put(path, body) {
      const r = await fetch(`/api${path}`, {
        method: 'PUT',
        headers: await _headers(),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async post(path, body) {
      const r = await fetch(`/api${path}`, {
        method: 'POST',
        headers: await _headers(),
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
    async delete(path) {
      const r = await fetch(`/api${path}`, { method: 'DELETE', headers: await _headers() });
      if (!r.ok) throw new Error(await r.text());
      return r.json();
    },
  };
})();
