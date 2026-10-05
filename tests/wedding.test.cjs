const test = require('node:test');
const assert = require('node:assert/strict');
const { createWeddingHandler, WeddingError, likeId } = require('../cloudfunctions/wedding/service');
const { createModerator } = require('../cloudfunctions/wedding/moderation');

function setup() {
  const records = new Map();
  let identity = 'wx-user-one';
  let now = 1700000000000;
  let failReads = false;
  const repository = {
    get: async id => { if (failReads) throw new Error('database unavailable'); return records.get(id) || null; },
    insertIfAbsent: async record => { if (!records.has(record._id)) records.set(record._id, record); },
    remove: async id => { records.delete(id); },
    count: async weddingId => [...records.values()].filter(row => row.weddingId === weddingId).length,
    list: async ({ weddingId, cursor, limit }) => [...records.values()]
      .filter(row => row.weddingId === weddingId && (!cursor || row.createdAt < cursor.createdAt || (row.createdAt === cursor.createdAt && row._id < cursor.id)))
      .sort((a, b) => b.createdAt - a.createdAt || b._id.localeCompare(a._id)).slice(0, limit)
  };
  const handler = createWeddingHandler({ repository, getIdentity: () => identity, now: () => now, moderate: async ({ nickname }) => {
    if (nickname === 'blocked') throw new WeddingError('NICKNAME_REJECTED', '审核未通过');
  } });
  const call = (action, data = {}) => handler({ action, weddingId: 'lin-and-chen', ...data });
  return { records, call, setIdentity: value => { identity = value; }, setTime: value => { now = value; }, failReads: () => { failReads = true; } };
}

test('same identity is idempotent; event.openid cannot impersonate another guest', async () => {
  const app = setup();
  const first = await app.call('like', { nickname: '小林', consent: true, openid: 'wx-user-two' });
  assert.equal(first.data.total, 1);
  assert.equal(first.data.liked, true);
  assert.ok(app.records.has(likeId('lin-and-chen', 'wx-user-one')));
  assert.ok(!app.records.has(likeId('lin-and-chen', 'wx-user-two')));
  app.setTime(1700000001000);
  const second = await app.call('like', { nickname: '改名', consent: true });
  assert.equal(second.data.total, 1);
  assert.equal(second.data.items[0].nickname, '小林');
  assert.deepEqual(Object.keys(second.data.items[0]).sort(), ['createdAt', 'id', 'nickname']);
  assert.equal((await app.call('unlike')).data.total, 0);
  assert.equal((await app.call('unlike')).data.total, 0);
});

test('nickname and consent checks reject bad input before persistence', async () => {
  const app = setup();
  assert.equal((await app.call('like', { nickname: '小陈' })).error.code, 'CONSENT_REQUIRED');
  for (const nickname of ['', '  ', 'x'.repeat(25), '含\n换行', '\ud800']) {
    assert.equal((await app.call('like', { nickname, consent: true })).error.code, 'INVALID_NICKNAME');
  }
  assert.equal((await app.call('like', { nickname: 'blocked', consent: true })).error.code, 'NICKNAME_REJECTED');
  assert.equal(app.records.size, 0);
  const accepted = await app.call('like', { nickname: '  小陈 💕  ', consent: true });
  assert.equal(accepted.data.items[0].nickname, '小陈 💕');
});

test('cursor pagination includes all guests when timestamps tie and caps page size', async () => {
  const app = setup();
  for (let i = 0; i < 45; i++) {
    app.setIdentity(`guest-${i}`);
    await app.call('like', { nickname: `宾客 ${i}`, consent: true });
  }
  const ids = [];
  let cursor;
  do {
    const result = await app.call('list', { limit: 999, cursor });
    assert.equal(result.ok, true);
    assert.equal(result.data.total, 45);
    assert.ok(result.data.items.length <= 20);
    ids.push(...result.data.items.map(item => item.id));
    cursor = result.data.nextCursor;
  } while (cursor);
  assert.equal(ids.length, 45);
  assert.equal(new Set(ids).size, 45);
  assert.equal((await app.call('list', { cursor: 'bad-cursor' })).error.code, 'INVALID_CURSOR');
  assert.equal((await app.call('list', { limit: 0 })).error.code, 'INVALID_LIMIT');
});

test('invalid invitation, identity and database failure never return false success', async () => {
  const app = setup();
  assert.equal((await app.call('list', { weddingId: 'other-wedding' })).error.code, 'INVALID_WEDDING');
  app.setIdentity('');
  assert.equal((await app.call('list')).error.code, 'UNAUTHENTICATED');
  app.setIdentity('wx-user-one'); app.failReads();
  const result = await app.call('like', { nickname: '小林', consent: true });
  assert.equal(result.ok, false);
  assert.equal(result.error.code, 'SERVICE_UNAVAILABLE');
  assert.equal(app.records.size, 0);
});

test('moderation accepts explicit pass and fails closed for timeout, risk and malformed responses', async () => {
  const args = { nickname: '小陈', openid: 'server-identity' };
  const moderator = response => createModerator({ openapi: { security: { msgSecCheck: async input => {
    assert.equal(input.openid, args.openid); assert.equal(input.version, 2);
    if (response instanceof Error) throw response;
    return response;
  } } } });
  await moderator({ errCode: 0, result: { suggest: 'pass' } })(args);
  await moderator({ errcode: 0, result: { suggest: 'pass' } })(args);
  await assert.rejects(moderator({ errCode: 0, result: { suggest: 'risky' } })(args), { code: 'NICKNAME_REJECTED' });
  await assert.rejects(moderator({ errCode: 0, result: { suggest: 'review' } })(args), { code: 'NICKNAME_REJECTED' });
  for (const response of [null, {}, { errCode: -1 }, new Error('timeout')]) {
    await assert.rejects(moderator(response)(args), { code: 'MODERATION_UNAVAILABLE' });
  }
});
