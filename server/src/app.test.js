const request = require('supertest');
const { createApp } = require('./app');

// These are lightweight smoke tests that don't require a database
// connection: they only exercise routing, JSON parsing, and validation
// that happens before any DB access.
describe('app', () => {
  const app = createApp();

  it('responds to the health check', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
  });

  it('rejects registration missing required fields before touching the DB', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'a@b.com' });
    expect(res.status).toBe(400);
  });

  it('rejects a short password before touching the DB', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'A', email: 'a@b.com', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('rejects requests without an Authorization header', async () => {
    const res = await request(app).get('/api/rooms');
    expect(res.status).toBe(401);
  });

  it('rejects requests with a malformed token', async () => {
    const res = await request(app).get('/api/rooms').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });
});
