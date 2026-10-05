import { useEffect, useRef, useState } from 'react';
import Taro, { useDidHide } from '@tarojs/taro';
import { wedding } from '../config/wedding';

export function useMusic() {
  const audio = useRef<Taro.InnerAudioContext | null>(null);
  const pending = useRef(false);
  const playRequest = useRef(0);
  const playTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  useEffect(() => {
    const context = Taro.createInnerAudioContext();
    context.src = wedding.musicUrl;
    context.loop = true;
    context.autoplay = false;
    const clearTimeoutIfNeeded = () => { if (playTimeout.current) clearTimeout(playTimeout.current); playTimeout.current = null; };
    const stopped = () => { clearTimeoutIfNeeded(); playRequest.current++; pending.current = false; setStarting(false); setPlaying(false); };
    context.onPlay(() => { clearTimeoutIfNeeded(); pending.current = false; setStarting(false); setPlaying(true); });
    context.onPause(stopped);
    context.onStop(stopped);
    context.onEnded(stopped);
    context.onError(() => {
      stopped();
      Taro.showToast({ title: '音乐暂时无法播放，请重试', icon: 'none' });
    });
    audio.current = context;
    const visibilityChanged = () => { if (document.hidden) { context.pause(); stopped(); } };
    if (process.env.TARO_ENV === 'h5') document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      if (process.env.TARO_ENV === 'h5') document.removeEventListener('visibilitychange', visibilityChanged);
      clearTimeoutIfNeeded();
      playRequest.current++;
      pending.current = false;
      audio.current = null;
      context.destroy();
    };
  }, []);
  useDidHide(() => { audio.current?.pause(); if (playTimeout.current) clearTimeout(playTimeout.current); playTimeout.current = null; playRequest.current++; pending.current = false; setStarting(false); setPlaying(false); });
  function toggle() {
    if (!audio.current || pending.current) return;
    if (playing) audio.current.pause();
    else {
      pending.current = true;
      setStarting(true);
      const request = ++playRequest.current;
      const failed = () => {
        if (request !== playRequest.current || !pending.current) return;
        if (playTimeout.current) clearTimeout(playTimeout.current);
        playTimeout.current = null;
        pending.current = false;
        setStarting(false);
        audio.current?.pause();
        Taro.showToast({ title: '音乐暂时无法播放，请重试', icon: 'none' });
      };
      playTimeout.current = setTimeout(failed, 15000);
      // H5 returns a play promise; WeChat returns void and reports through onError.
      try { void Promise.resolve(audio.current.play() as unknown).catch(failed); }
      catch { failed(); }
    }
  }
  return { playing, starting, toggle };
}
