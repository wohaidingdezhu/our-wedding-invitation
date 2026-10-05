import Taro from '@tarojs/taro';

export async function copyText(text: string, title = '已复制') {
  if (process.env.TARO_ENV !== 'h5') {
    await Taro.setClipboardData({ data: text });
    return;
  }
  // Taro's H5 shim ignores execCommand's false result, which can report false success.
  let copied = false;
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); copied = true; }
    catch { /* Try the selection fallback while keeping an explicit failure result. */ }
  }
  if (!copied) {
    const field = document.createElement('textarea');
    const previousFocus = document.activeElement as HTMLElement | null;
    field.value = text;
    field.readOnly = true;
    field.style.cssText = 'position:fixed;left:-10000px;top:0;opacity:0;';
    document.body.appendChild(field);
    try {
      field.select();
      field.setSelectionRange(0, text.length);
      copied = document.execCommand('copy');
    } finally {
      field.remove();
      previousFocus?.focus({ preventScroll: true });
    }
  }
  if (!copied) throw new Error('复制未完成');
  Taro.showToast({ title, icon: 'none' });
}
