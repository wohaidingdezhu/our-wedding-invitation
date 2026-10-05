import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Checkbox, CheckboxGroup, Image, Input, Label, ScrollView, Text, View } from '@tarojs/components';
import Taro, { useDidShow, usePageScroll, useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { wedding } from '../../config/wedding';
import { LikePage, requestLikes } from '../../services/likes';
import { useMusic } from '../../hooks/useMusic';
import { InvitationIcon } from '../../components/InvitationIcon';
import { copyText } from '../../utils/clipboard';
import './index.scss';

const empty: LikePage = { total: 0, liked: false, items: [], nextCursor: null };
const isWeb = process.env.TARO_ENV === 'h5';
const isDemo = wedding.demo || isWeb;
const date = new Date(`${wedding.date.slice(0, 10)}T12:00:00Z`);
const dateYear = date.getUTCFullYear();
const dateMonth = date.getUTCMonth() + 1;
const dateDay = date.getUTCDate();
const monthName = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][dateMonth - 1];

export default function Invitation() {
  const [page, setPage] = useState<LikePage>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'nickname' | 'guests' | 'thanks' | 'share' | null>(null);
  const [nickname, setNickname] = useState('');
  const [consent, setConsent] = useState(false);
  const [floatingMusic, setFloatingMusic] = useState(false);
  const mutation = useRef(false);
  const loadingRequest = useRef(false);
  const revision = useRef(0);
  const { playing, starting, toggle } = useMusic();
  const musicLabel = starting ? '音乐加载中' : playing ? '暂停音乐' : '开启音乐';
  const nameLength = Math.max(...wedding.couple.map(name => Array.from(name).length));
  const nameStyle = { fontSize: Taro.pxTransform(Math.min(86, Math.floor(240 / nameLength))) };
  usePageScroll(event => setFloatingMusic(event.scrollTop > 160));

  const load = useCallback(async () => {
    if (mutation.current || loadingRequest.current) return;
    loadingRequest.current = true;
    const requestRevision = ++revision.current;
    setLoading(true);
    try {
      const result = await requestLikes('list');
      if (requestRevision === revision.current) { setPage(result); setError(''); }
    }
    catch (e) { if (requestRevision === revision.current) setError(e instanceof Error ? e.message : '祝福暂时无法加载'); }
    finally { loadingRequest.current = false; if (requestRevision === revision.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useDidShow(() => { void load(); });
  useShareAppMessage(() => ({ title: wedding.shareTitle, path: '/pages/index/index' }));
  useShareTimeline(() => ({ title: wedding.shareTitle }));

  async function updateLike() {
    if (mutation.current) return;
    if (!page.liked) {
      if (!nickname.trim() || Array.from(nickname.trim()).length > 24) {
        Taro.showToast({ title: '请填写 1–24 个字符的昵称', icon: 'none' }); return;
      }
      if (!consent) { Taro.showToast({ title: '请确认公开展示昵称', icon: 'none' }); return; }
    }
    mutation.current = true;
    revision.current++;
    setBusy(true);
    try {
      const next = await requestLikes(page.liked ? 'unlike' : 'like', { nickname: nickname.trim(), consent });
      setPage(next); setError(''); setSheet(next.liked ? 'thanks' : null);
      if (!next.liked) Taro.showToast({ title: '已取消祝福', icon: 'none' });
    } catch (e) { Taro.showToast({ title: e instanceof Error ? e.message : '操作失败，请重试', icon: 'none' }); }
    finally { mutation.current = false; setBusy(false); }
  }

  async function moreGuests() {
    if (mutation.current || !page.nextCursor) return;
    mutation.current = true;
    revision.current++;
    setBusy(true);
    try {
      const next = await requestLikes('list', { cursor: page.nextCursor });
      setPage(prev => ({ ...next, items: [...prev.items, ...next.items.filter(item => !prev.items.some(old => old.id === item.id))] }));
    } catch (e) { Taro.showToast({ title: e instanceof Error ? e.message : '加载失败，请重试', icon: 'none' }); }
    finally { mutation.current = false; setBusy(false); }
  }

  async function openLocation() {
    try {
      if (isWeb) { await copyText(wedding.address, '婚礼地址已复制'); return; }
      await Taro.openLocation({ latitude: wedding.latitude, longitude: wedding.longitude, name: wedding.venue, address: wedding.address, scale: 16 });
    }
    catch { Taro.showToast({ title: isWeb ? '请长按地址文字复制' : '地图未能打开，请稍后重试', icon: 'none' }); }
  }

  async function shareInvite() {
    try { await copyText(window.location.href, '预览链接已复制'); setSheet(null); }
    catch { setSheet('share'); }
  }

  async function previewPoster() {
    try { await Taro.previewImage({ current: wedding.posterImage, urls: [wedding.posterImage] }); }
    catch { Taro.showToast({ title: '海报暂时无法打开，请重试', icon: 'none' }); }
  }

  async function jumpTo(selector: string) {
    try { await Taro.pageScrollTo({ selector, duration: isWeb ? 0 : 350 }); }
    catch { Taro.showToast({ title: '请向下滑动查看', icon: 'none' }); }
  }

  function likeClick() {
    if (loading || busy) return;
    if (error) { void load(); return; }
    if (page.liked) { setSheet('thanks'); return; }
    setConsent(false); setSheet('nickname');
  }

  return (
    <View className='invitation'>
      <View className='poster'>
        <Image className='hero-picture' src={wedding.heroImage} mode='aspectFill' onClick={previewPoster} />
        <View className='hero-shade' />
        <View className='hero-keyline' />
        <View className='topbar'>
          <View className='brand'><Text className='brand-mark'>囍</Text><Text>THE WEDDING</Text></View>
          <Button className={`music ${playing ? 'music-playing' : ''}`} onClick={toggle} disabled={starting || undefined} ariaLabel={musicLabel}>
            <View className='music-bars'><View className='music-bar' /><View className='music-bar' /><View className='music-bar' /></View>
            <Text>{musicLabel}</Text>
          </Button>
        </View>
        <View className='hero-heading'>
          <Text className='hero-kicker'>诚 挚 邀 请 · 见 证 幸 福</Text>
          <View className='couple' style={nameStyle}><Text>{wedding.couple[0]}</Text><Text className='ampersand'>&</Text><Text>{wedding.couple[1]}</Text></View>
          <Text className='english-names'>{wedding.englishNames}</Text>
          <Text className='hero-script'>Together, forever.</Text>
        </View>
        <View className='hero-bottom'>
          <Text className='hero-date'>{dateYear}.{String(dateMonth).padStart(2, '0')}.{String(dateDay).padStart(2, '0')}</Text>
          <View className='hero-meta'><Text>{wedding.venue}</Text><Text className='hero-meta-caption'>WE ARE GETTING MARRIED</Text></View>
          <Button className='scroll-hint' onClick={() => jumpTo('#letter')}><Text>开启这份邀请</Text><Text className='scroll-arrow'>↓</Text></Button>
        </View>
      </View>

      <View className='quick-nav'>{[{ id: 'letter', number: '01', title: '我们的邀请' }, { id: 'details', number: '02', title: '时间地点' }, { id: 'blessings', number: '03', title: '宾客祝福' }].map(item => <Button key={item.id} onClick={() => jumpTo(`#${item.id}`)}><Text className='nav-number'>{item.number}</Text><Text>{item.title}</Text></Button>)}</View>

      <View className='letter' id='letter'>
        <View className='section-top'><Text className='eyebrow'>OUR NEW CHAPTER</Text><Text className='section-number'>01 / 邀请</Text></View>
        <Text className='letter-display'>余生很长，<Text className='letter-display-second'>幸好是你。</Text></Text>
        <Text className='letter-copy'>{wedding.intro}</Text>
        <View className='letter-divider'><View className='letter-rule' /><Text className='letter-divider-caption'>AND SO THE ADVENTURE BEGINS</Text><View className='letter-rule' /></View>
        <Text className='letter-copy'>{wedding.invitation}</Text>
        <View className='letter-sign'><Text className='letter-sign-caption'>期待与你相见</Text><Text className='letter-sign-names'>{wedding.couple.join(' & ')}</Text></View>
      </View>

      <View className='photo-frame'><View className='photo-moment'><Image className='moment-image' src={wedding.heroImage} mode='aspectFill' /><View className='moment-shade' /><View className='moment-caption'><Text className='moment-title'>With you,</Text><Text className='moment-description'>每个平凡的日子，都值得珍藏。</Text></View></View><View className='photo-caption'><Text>我们的故事，未完待续</Text><Text className='photo-serial'>LIFE TOGETHER / 01</Text></View></View>

      <View className='details' id='details'>
        <View className='section-top'><Text className='eyebrow'>SAVE THE DATE</Text><Text className='section-number'>02 / 相约</Text></View>
        <Text className='section-title'>这一日，与你相约</Text>
        <View className='date-card'>
          <View className='date-big'><Text className='date-month'>{monthName}</Text><Text className='date-day'>{dateDay}</Text><Text className='date-year'>{dateYear}</Text></View>
          <View className='date-info'><Text className='detail-main'>{wedding.dateLabel}</Text><Text className='detail-secondary'>{wedding.timeLabel}</Text><Text className='detail-note'>愿你带着笑意而来，满载幸福而归</Text></View>
        </View>
        <Button className='venue-card' onClick={openLocation}>
          <View className='location-icon'><InvitationIcon name='location' /></View>
          <View className='venue-info'><Text className='detail-main'>{wedding.venue}</Text><Text className='detail-secondary' selectable>{wedding.address}</Text><View className='venue-link'><Text>{isWeb ? '复制婚礼地址' : '打开地图导航'}</Text><InvitationIcon name='arrow' /></View></View>
        </Button>
        <View className='agenda'><Text className='agenda-label'>当天的美好安排</Text>{wedding.agenda.map(item => <View className='agenda-row' key={item.time}><Text className='agenda-time'>{item.time}</Text><View className='agenda-marker' /><View className='agenda-copy'><Text className='agenda-title'>{item.title}</Text><Text className='agenda-note'>{item.note}</Text></View></View>)}</View>
      </View>

      <View className='blessings' id='blessings'>
        <View className='section-top'><Text className='eyebrow'>WITH LOVE & WISHES</Text><Text className='section-number'>03 / 祝福</Text></View>
        <Text className='section-title'>有你，幸福才完整</Text>
        <Text className='blessings-copy'>留下一份祝福，让美好在此刻相逢。</Text>
        <Button className={`heart-button ${page.liked ? 'is-liked' : ''}`} onClick={likeClick} disabled={loading || busy || undefined} ariaLabel={page.liked ? '查看我的祝福' : '送上祝福'}><InvitationIcon name='heart' filled={page.liked} /></Button>
        <Text className='like-instruction'>{page.liked ? '谢谢你，让幸福多了一份见证' : '点亮爱心，留下你的名字与祝福'}</Text>
        <View className='like-count'>{loading ? <Text>正在收集祝福…</Text> : <><Text className='like-total'>{page.total}</Text><Text>份祝福，汇成我们的幸福</Text></>}</View>
        {error ? <Button className='text-button' onClick={load}>名单加载失败 · 点击重试</Button> : <Button className='text-button' onClick={() => setSheet('guests')}>看看谁送来了祝福 <Text>→</Text></Button>}
        {page.items.length > 0 && <View className='guest-preview'>{page.items.slice(0, 5).map(item => <View key={item.id} className='guest-chip'><Text className='guest-avatar'>{Array.from(item.nickname)[0]}</Text><Text className='guest-chip-name'>{item.nickname}</Text></View>)}</View>}
      </View>

      <View className='closing'><Text className='closing-script'>All you need is love.</Text><Text>爱有回响 · 喜有你在</Text><Text className='closing-flower'>{wedding.englishNames.split(' & ').map(name => name[0]).join(' / ')}</Text></View>
      {isDemo && <View className='demo-label'>示例请帖与照片 · 演示祝福仅保存在本机</View>}
      {floatingMusic && !sheet && <Button className={`floating-music ${playing ? 'music-playing' : ''}`} onClick={toggle} disabled={starting || undefined} ariaLabel={musicLabel}><View className='music-bars'><View className='music-bar' /><View className='music-bar' /><View className='music-bar' /></View><Text>{starting ? '加载' : playing ? '暂停' : '音乐'}</Text></Button>}
      <View className='bottom-bar'>
        <View className='bottom-actions'>
        <Button className={`bottom-like ${page.liked ? 'bottom-liked' : ''}`} onClick={likeClick} disabled={loading || busy || undefined} ariaLabel={page.liked ? '查看我的祝福' : '送上祝福'}><InvitationIcon name='heart' filled={page.liked} /><Text>{page.liked ? '已祝福' : '送祝福'}</Text></Button>
        <Button className='poster-action' onClick={previewPoster}><InvitationIcon name='poster' /><Text>海报</Text></Button>
        {isWeb ? <Button className='share-button' onClick={shareInvite}><Text>分享这份幸福</Text><InvitationIcon name='arrow' /></Button> : <Button className='share-button' openType='share'><Text>分享这份幸福</Text><InvitationIcon name='arrow' /></Button>}
        </View>
      </View>

      {sheet && <View className='modal-mask' onClick={() => { if (!busy) setSheet(null); }}>
        <View className='sheet' onClick={e => e.stopPropagation()}>
          <View className='sheet-handle' />
          <View className='sheet-top'><View><Text className='sheet-eyebrow'>WITH LOVE</Text><Text className='sheet-title'>{sheet === 'nickname' ? '留下一份有名字的祝福' : sheet === 'thanks' ? '这份心意，我们收到了' : sheet === 'share' ? '把幸福，分享给你' : '每一份祝福，都很珍贵'}</Text></View><Button className='sheet-close' disabled={busy || undefined} onClick={() => setSheet(null)} ariaLabel='关闭'><InvitationIcon name='close' /></Button></View>
          {sheet === 'nickname' ? <View>
            <Text className='sheet-description'>选择或填写昵称，让新人知道这份心意来自你。</Text>
            <Input className='nickname-input' type={isWeb ? 'text' : 'nickname'} placeholder='你的微信昵称或名字' maxlength={48} value={nickname} ariaLabel='展示在祝福名单中的昵称' onInput={e => setNickname(e.detail.value)} onBlur={e => setNickname(e.detail.value)} onNickNameReview={e => { const d = e.detail as { pass?: boolean; timeout?: boolean }; if (d.pass === false || d.timeout) { setNickname(''); Taro.showToast({ title: '请重新填写有效昵称', icon: 'none' }); } }} />
            <Text className='nickname-counter'>{Array.from(nickname.trim()).length}/24 字</Text>
            <CheckboxGroup onChange={e => setConsent(e.detail.value.includes('public'))}><Label className='consent'><Checkbox value='public' checked={consent} color='#9b8056' /><Text>我同意将此昵称展示在这份请帖的祝福名单中，可通过取消点赞移除。</Text></Label></CheckboxGroup>
            <Button className='submit-button' onClick={updateLike} disabled={busy || !nickname.trim() || Array.from(nickname.trim()).length > 24 || !consent || undefined}>{busy ? '正在送出祝福…' : '送出祝福 ♡'}</Button>
          </View> : sheet === 'thanks' ? <View className='thanks-content'>
            <View className='thanks-emblem'><InvitationIcon name='heart' filled /></View>
            <Text className='thanks-title'>谢谢你，见证我们的幸福</Text>
            <Text className='thanks-copy'>{nickname.trim() ? `${nickname.trim()}，你的名字已留在祝福名单中。` : '你的祝福已留在这份请帖的名单中。'}<Text className='thanks-copy-line'>期待在婚礼那天，与你相见。</Text></Text>
            <Button className='submit-button' disabled={busy || undefined} onClick={() => setSheet('guests')}>看看大家的祝福</Button>
            <Button className='withdraw-button' disabled={busy || undefined} onClick={updateLike}>{busy ? '正在取消…' : '取消我的祝福'}</Button>
          </View> : sheet === 'share' ? <View><Text className='sheet-description'>自动复制未完成，请长按下方链接复制，再发送给亲友。</Text><Text className='share-link' selectable>{isWeb ? window.location.href : ''}</Text><Button className='submit-button' onClick={shareInvite}>再试一次复制链接</Button></View> : <View>
            <Text className='sheet-description'>已收到 {page.total} 份祝福{isDemo ? ' · 当前设备演示' : ''}</Text>
            <ScrollView scrollY className='guest-list'>
              {page.items.length === 0 ? <View className='empty-guests'><Text className='empty-heart'>♡</Text><Text>做第一个送来祝福的人吧</Text></View> : page.items.map(item => <View className='guest-row' key={item.id}><Text className='guest-avatar'>{Array.from(item.nickname)[0]}</Text><View className='guest-row-copy'><Text>{item.nickname}</Text><Text className='guest-date'>{new Date(item.createdAt).toLocaleDateString('zh-CN')} · 送上了祝福</Text></View><Text className='guest-heart'>♥</Text></View>)}
              {page.nextCursor && <Button className='text-button' onClick={moreGuests} disabled={busy || undefined}>{busy ? '加载中…' : '查看更多祝福'}</Button>}
            </ScrollView>
          </View>}
        </View>
      </View>}
    </View>
  );
}
