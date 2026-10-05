'use strict';

function createCloudRepository(database) {
  const collection = database.collection('wedding_likes');
  const command = database.command;

  async function get(id) {
    // A query returns [] for absence. A rejected read is never treated as absence.
    const result = await collection.where({ _id: id }).limit(1).get();
    return result.data[0] || null;
  }

  return {
    get,
    async insertIfAbsent(record) {
      try {
        // add + deterministic _id is atomic; set would overwrite concurrent likes.
        await collection.add({ data: record });
      } catch (error) {
        // Only an actually persisted same-identity record makes a retry successful.
        // Missing collection, permission and network failures otherwise propagate.
        const existing = await get(record._id);
        if (!existing || existing.weddingId !== record.weddingId || existing.openid !== record.openid) throw error;
      }
    },
    async remove(id) {
      // Query deletion is also a successful no-op when the like is already absent.
      await collection.where({ _id: id }).remove();
    },
    async count(weddingId) {
      const result = await collection.where({ weddingId }).count();
      return result.total;
    },
    async list({ weddingId, cursor, limit }) {
      const filter = cursor
        ? command.and([
          { weddingId },
          command.or([
            { createdAt: command.lt(cursor.createdAt) },
            { createdAt: cursor.createdAt, _id: command.lt(cursor.id) }
          ])
        ])
        : { weddingId };
      const result = await collection.where(filter)
        .orderBy('createdAt', 'desc').orderBy('_id', 'desc')
        .field({ _id: true, nickname: true, createdAt: true })
        .limit(limit).get();
      return result.data;
    }
  };
}

module.exports = { createCloudRepository };
