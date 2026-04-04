/* api.js - fetch wrapper for backend API */
const API = (() => {
  async function _headers(extra = {}) {
    const token = (typeof Auth !== 'undefined' && Auth && typeof Auth.getToken === 'function')
      ? await Auth.getToken()
      : null;
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extra,
    };
    return headers;
  }

  return {
    async get(path) {
      try {
        const r = await fetch(`/api${path}`, { headers: await _headers() });
        if (!r.ok) {
          const text = await r.text();
          Logger.error(`[API] GET ${path} failed`, { status: r.status, body: text });
          throw new Error(`HTTP ${r.status}: ${text}`);
        }
        return r.json();
      } catch (err) {
        Logger.error(`[API] GET ${path} request error`, { message: err && err.message });
        throw err;
      }
    },
    async put(path, body) {
      try {
        const r = await fetch(`/api${path}`, {
          method: 'PUT',
          headers: await _headers(),
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const text = await r.text();
          Logger.error(`[API] PUT ${path} failed`, { status: r.status, body: text });
          throw new Error(`HTTP ${r.status}: ${text}`);
        }
        return r.json();
      } catch (err) {
        Logger.error(`[API] PUT ${path} request error`, { message: err && err.message });
        throw err;
      }
    },
    async post(path, body) {
      try {
        const r = await fetch(`/api${path}`, {
          method: 'POST',
          headers: await _headers(),
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const text = await r.text();
          Logger.error(`[API] POST ${path} failed`, { status: r.status, body: text });
          throw new Error(`HTTP ${r.status}: ${text}`);
        }
        return r.json();
      } catch (err) {
        Logger.error(`[API] POST ${path} request error`, { message: err && err.message });
        throw err;
      }
    },
    async delete(path) {
      try {
        const r = await fetch(`/api${path}`, { method: 'DELETE', headers: await _headers() });
        if (!r.ok) {
          const text = await r.text();
          Logger.error(`[API] DELETE ${path} failed`, { status: r.status, body: text });
          throw new Error(`HTTP ${r.status}: ${text}`);
        }
        return r.json();
      } catch (err) {
        Logger.error(`[API] DELETE ${path} request error`, { message: err && err.message });
        throw err;
      }
    },
  };
})();
