// Pages and APIs a signed-out tablet or phone opens by QR must pass private
// mode (src/authz/access.js), and nothing next to them should.
const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublicPath } = require('../src/authz/access');

const T = 'AbCdEfGhIjKlMnOpQrStUvWx';
const V = 'abcdefghijklmnop';

test('device links pass private mode', () => {
  for (const p of [
    `/pad/${T}`,
    `/snap/${T}`,
    `/live/d/${T}`,
    `/explain/pad/${T}`,
    `/api/hand/device/${T}`,
    `/api/live/device/${T}`,
    `/api/explain/device/${T}`,
    `/api/explain/device/${T}/videos`,
    `/api/explain/device/${T}/videos/${V}/data`,
    `/api/explain/device/${T}/videos/${V}/finish`,
    `/pratibimb/capture/${T}`,
    `/api/pratibimb/device/${T}`,
    `/api/pratibimb/device/${T}/files/photo`,
    `/api/pratibimb/device/${T}/files/video`,
  ])
    assert.equal(isPublicPath(p), true, p);
});

test('nothing else around them does', () => {
  for (const p of [
    '/explain/pad',
    `/explain/pad/${T}/x`,
    '/api/explain/videos',
    '/api/explain/links',
    `/api/explain/links/${T}`,
    `/api/explain/device/${T}/videos/${V}`,
    `/api/explain/device/${T}/other`,
    '/api/explain/mine',
    '/pratibimb',
    `/pratibimb/capture/${T}/x`,
    `/api/pratibimb/device/${T}/files/consent`,
    `/api/pratibimb/device/${T}/files/voice`,
    `/api/pratibimb/models`,
    `/api/pratibimb/models/abcdef012345678901234567/link`,
  ])
    assert.equal(isPublicPath(p), false, p);
});
