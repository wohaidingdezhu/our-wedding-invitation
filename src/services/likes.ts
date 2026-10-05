import Taro from '@tarojs/taro';
import { wedding } from '../config/wedding';

export interface Like { id: string; nickname: string; createdAt: number }
export interface LikePage { total: number; liked: boolean; items: Like[]; nextCursor: string | null }
type Action = 'list' | 'like' | 'unlike';
const demoKey = `wedding-demo-likes:${wedding.id}`;

// 演示是本机存储，明确标识，不假装来自微信或云端。
function demo(action: Action, nickname?: string): LikePage {
  const saved = Taro.getStorageSync(demoKey);
  let items: Like[] = Array.isArray(saved) ? saved : [];
  if (action === 'like' && !items.some(item => item.id === 'local-guest')) {
    items = [{ id: 'local-guest', nickname: nickname || '宾客', createdAt: Date.now() }, ...items];
  }
  if (action === 'unlike') items = items.filter(item => item.id !== 'local-guest');
  Taro.setStorageSync(demoKey, items);
  return { total: items.length, liked: items.some(item => item.id === 'local-guest'), items, nextCursor: null };
}

export async function requestLikes(action: Action, options: { nickname?: string; consent?: boolean; cursor?: string } = {}): Promise<LikePage> {
  if (wedding.demo || process.env.TARO_ENV === 'h5') return demo(action, options.nickname);
  if (!wedding.cloudEnv) throw new Error('请先配置云开发环境');
  const response = await Taro.cloud.callFunction({ name: 'wedding', data: { action, weddingId: wedding.id, limit: 20, ...options } });
  const result = response.result as { ok: boolean; data?: LikePage; error?: { message: string } };
  if (!result?.ok || !result.data) throw new Error(result?.error?.message || '暂时无法加载祝福，请重试');
  return result.data;
}
