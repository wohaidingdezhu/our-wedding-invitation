'use strict';

const { createHash } = require('node:crypto');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 20;
const WEDDING_ID = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const DOCUMENT_ID = /^[a-f0-9]{32}$/;

class WeddingError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WeddingError';
    this.code = code;
  }
}

function likeId(weddingId, openid) {
  // 128-bit digest: stable within one invitation; never exposes an OpenID.
  return createHash('sha256')
    .update(JSON.stringify(['wedding-like-v1', weddingId, openid]))
    .digest('hex').slice(0, 32);
}

function parseWeddingIds(value = 'lin-and-chen') {
  const ids = String(value).split(',').map((id) => id.trim()).filter(Boolean);
  if (!ids.length || ids.some((id) => !WEDDING_ID.test(id))) {
    throw new Error('WEDDING_IDS must be a comma-separated list of valid invitation IDs.');
  }
  return new Set(ids);
}

function validateNickname(value) {
  if (typeof value !== 'string') {
    throw new WeddingError('INVALID_NICKNAME', '请填写 1–24 个字符的昵称');
  }
  const nickname = value.trim();
  const length = Array.from(nickname).length;
  // Reject controls, line breaks, bidi overrides, and isolated surrogates.
  if (length < 1 || length > 24 || /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/u.test(nickname)
      || Array.from(nickname).some((character) => /^[\ud800-\udfff]$/u.test(character))) {
    throw new WeddingError('INVALID_NICKNAME', '请填写 1–24 个字符的有效昵称');
  }
  return nickname;
}

function pageLimit(value) {
  if (value === undefined) return DEFAULT_LIMIT;
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new WeddingError('INVALID_LIMIT', '分页数量必须是正整数');
  }
  return Math.min(value, MAX_LIMIT);
}

function encodeCursor(weddingId, item) {
  return Buffer.from(JSON.stringify({ v: 1, w: weddingId, t: item.createdAt, i: item._id }))
    .toString('base64url');
}

function decodeCursor(value, weddingId) {
  if (value === undefined || value === null || value === '') return null;
  try {
    if (typeof value !== 'string' || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new Error('invalid encoding');
    }
    const cursor = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!cursor || cursor.v !== 1 || cursor.w !== weddingId || !Number.isSafeInteger(cursor.t)
        || cursor.t < 0 || !DOCUMENT_ID.test(cursor.i)) throw new Error('invalid cursor');
    return { createdAt: cursor.t, id: cursor.i };
  } catch {
    throw new WeddingError('INVALID_CURSOR', '名单已更新，请重新加载');
  }
}

/** Dependencies are injected so identity, moderation, persistence and failures are testable. */
function createWeddingHandler({ repository, getIdentity, moderate, weddingIds = new Set(['lin-and-chen']), now = Date.now, onError = () => {} }) {
  async function readList(weddingId, id, limit, cursor) {
    const [rows, total, ownLike] = await Promise.all([
      repository.list({ weddingId, cursor, limit: limit + 1 }),
      repository.count(weddingId),
      repository.get(id)
    ]);
    const page = rows.slice(0, limit);
    return {
      total,
      liked: Boolean(ownLike),
      items: page.map((row) => ({ id: row._id, nickname: row.nickname, createdAt: row.createdAt })),
      nextCursor: rows.length > limit ? encodeCursor(weddingId, page[page.length - 1]) : null
    };
  }

  return async function wedding(event = {}) {
    try {
      if (!event || typeof event !== 'object' || Array.isArray(event)) {
        throw new WeddingError('INVALID_REQUEST', '请求格式错误');
      }
      if (!['list', 'like', 'unlike'].includes(event.action)) {
        throw new WeddingError('INVALID_ACTION', '不支持的操作');
      }
      if (typeof event.weddingId !== 'string' || !weddingIds.has(event.weddingId)) {
        throw new WeddingError('INVALID_WEDDING', '请帖不存在');
      }
      // Only the cloud runtime is trusted. event.openid / event.userId are ignored.
      const openid = await getIdentity();
      if (typeof openid !== 'string' || !openid.trim()) {
        throw new WeddingError('UNAUTHENTICATED', '请在微信小程序中打开后重试');
      }
      const weddingId = event.weddingId;
      const id = likeId(weddingId, openid);
      const limit = pageLimit(event.limit);
      const cursor = event.action === 'list' ? decodeCursor(event.cursor, weddingId) : null;

      if (event.action === 'like') {
        if (event.consent !== true) {
          throw new WeddingError('CONSENT_REQUIRED', '请先同意在祝福名单中展示昵称');
        }
        const nickname = validateNickname(event.nickname);
        // Repeated requests preserve both the original nickname and timestamp.
        if (!(await repository.get(id))) {
          await moderate({ nickname, openid });
          const createdAt = now();
          if (!Number.isSafeInteger(createdAt) || createdAt < 0) throw new Error('Invalid server clock');
          await repository.insertIfAbsent({ _id: id, weddingId, openid, nickname, createdAt, consentVersion: 1 });
        }
      } else if (event.action === 'unlike') {
        await repository.remove(id);
      }

      return { ok: true, data: await readList(weddingId, id, limit, cursor) };
    } catch (error) {
      if (error instanceof WeddingError) {
        return { ok: false, error: { code: error.code, message: error.message } };
      }
      onError(error);
      return { ok: false, error: { code: 'SERVICE_UNAVAILABLE', message: '暂时无法更新祝福，请稍后重试' } };
    }
  };
}

module.exports = { WeddingError, createWeddingHandler, likeId, parseWeddingIds, validateNickname };
