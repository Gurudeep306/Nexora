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
  ])
    assert.equal(isPublicPath(p), false, p);
});
