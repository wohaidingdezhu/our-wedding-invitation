'use strict';

const { WeddingError } = require('./service');

function createModerator(cloud, { enabled = true } = {}) {
  return async function moderate({ nickname, openid }) {
    if (!enabled) return;
    let response;
    try {
      response = await cloud.openapi.security.msgSecCheck({
        content: nickname,
        nickname,
        version: 2,
        scene: 1,
        openid
      });
    } catch {
      throw new WeddingError('MODERATION_UNAVAILABLE', '昵称审核暂时不可用，请稍后重试');
    }
    // wx-server-sdk normally converts errcode to errCode. Both shapes are explicit.
    const code = response && (response.errCode ?? response.errcode);
    if (!response || (code !== undefined && code !== 0) || !response.result
        || !['pass', 'risky', 'review'].includes(response.result.suggest)) {
      throw new WeddingError('MODERATION_UNAVAILABLE', '昵称审核暂时不可用，请稍后重试');
    }
    if (response.result.suggest !== 'pass') {
      throw new WeddingError('NICKNAME_REJECTED', '该昵称未通过审核，请修改后重试');
    }
  };
}

module.exports = { createModerator };
