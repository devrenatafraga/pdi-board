/**
 * Client API wrapper tests
 */

describe('Client API', () => {
  let fetchSpy;
  let Logger;
  let API;

  beforeEach(() => {
    fetchSpy = jest.fn();
    global.fetch = fetchSpy;

    Logger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };
    global.Logger = Logger;

    API = (() => {
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
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('API.get()', () => {
    it('makes GET request to correct URL', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ data: 'test' }) };
      fetchSpy.mockResolvedValue(mockResponse);

      const result = await API.get('/data');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/data',
        expect.objectContaining({ headers: expect.any(Object) })
      );
      expect(result).toEqual({ data: 'test' });
    });

    it('throws error on non-OK response', async () => {
      const mockResponse = { ok: false, status: 404, text: jest.fn().mockResolvedValue('Not found') };
      fetchSpy.mockResolvedValue(mockResponse);

      await expect(API.get('/invalid')).rejects.toThrow('HTTP 404');
      expect(Logger.error).toHaveBeenCalled();
    });

    it('includes Content-Type header', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({}) };
      fetchSpy.mockResolvedValue(mockResponse);

      await API.get('/data');

      const call = fetchSpy.mock.calls[0];
      expect(call[1].headers['Content-Type']).toBe('application/json');
    });

    it('handles network errors', async () => {
      fetchSpy.mockRejectedValue(new Error('Network error'));

      await expect(API.get('/data')).rejects.toThrow('Network error');
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('API.post()', () => {
    it('makes POST request with body', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ id: '123' }) };
      fetchSpy.mockResolvedValue(mockResponse);

      const result = await API.post('/data', { name: 'test' });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/data',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'test' }),
        })
      );
      expect(result).toEqual({ id: '123' });
    });

    it('throws error on non-OK response', async () => {
      const mockResponse = { ok: false, status: 400, text: jest.fn().mockResolvedValue('Bad request') };
      fetchSpy.mockResolvedValue(mockResponse);

      await expect(API.post('/data', {})).rejects.toThrow('HTTP 400');
    });
  });

  describe('API.put()', () => {
    it('makes PUT request with body', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ ok: true }) };
      fetchSpy.mockResolvedValue(mockResponse);

      const result = await API.put('/themes/123', { color: '#fff' });

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/themes/123',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ color: '#fff' }),
        })
      );
      expect(result).toEqual({ ok: true });
    });
  });

  describe('API.delete()', () => {
    it('makes DELETE request', async () => {
      const mockResponse = { ok: true, json: jest.fn().mockResolvedValue({ ok: true }) };
      fetchSpy.mockResolvedValue(mockResponse);

      const result = await API.delete('/evidence/123');

      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/evidence/123',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
      expect(result).toEqual({ ok: true });
    });

    it('throws error on non-OK response', async () => {
      const mockResponse = { ok: false, status: 404, text: jest.fn().mockResolvedValue('Not found') };
      fetchSpy.mockResolvedValue(mockResponse);

      await expect(API.delete('/evidence/999')).rejects.toThrow('HTTP 404');
    });
  });

  describe('Error logging', () => {
    it('logs API errors with path and status', async () => {
      const mockResponse = { ok: false, status: 500, text: jest.fn().mockResolvedValue('Server error') };
      fetchSpy.mockResolvedValue(mockResponse);

      try {
        await API.get('/data');
      } catch (e) {
        // Expected
      }

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[API] GET /data failed'),
        expect.any(Object)
      );
    });

    it('logs request errors with path', async () => {
      fetchSpy.mockRejectedValue(new Error('Network timeout'));

      try {
        await API.post('/data', {});
      } catch (e) {
        // Expected
      }

      expect(Logger.error).toHaveBeenCalledWith(
        expect.stringContaining('[API] POST /data request error'),
        expect.any(Object)
      );
    });
  });
});

