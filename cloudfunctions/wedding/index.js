'use strict';

const cloud = require('wx-server-sdk');
const { createWeddingHandler, parseWeddingIds } = require('./service');
const { createCloudRepository } = require('./repository');
const { createModerator } = require('./moderation');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// Disabling moderation is only accepted in an explicitly marked development env.
const moderationEnabled = !(process.env.APP_ENV === 'development' && process.env.SEC_CHECK_ENABLED === 'false');

exports.main = createWeddingHandler({
  repository: createCloudRepository(cloud.database()),
  getIdentity: () => cloud.getWXContext().OPENID,
  weddingIds: parseWeddingIds(process.env.WEDDING_IDS),
  moderate: createModerator(cloud, { enabled: moderationEnabled }),
  onError: (error) => {
    // Do not log OpenIDs, nicknames or SDK error bodies, which may contain queries.
    console.error('wedding request failed', { type: error && error.name || 'Error' });
  }
});
