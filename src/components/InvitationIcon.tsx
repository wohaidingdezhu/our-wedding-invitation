import { Text, View } from '@tarojs/components';
import './InvitationIcon.scss';

type IconName = 'heart' | 'poster' | 'arrow' | 'location' | 'close';

export function InvitationIcon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  return <View className={`invitation-icon icon-${name}`} ariaHidden>
    {name === 'heart' ? <Text className='icon-heart-glyph'>{filled ? '♥' : '♡'}</Text> : <View className='icon-stroke' />}
    {name === 'poster' && <View className='icon-paper-lines' />}
  </View>;
}
