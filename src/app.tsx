import { PropsWithChildren } from 'react';
import Taro, { useLaunch } from '@tarojs/taro';
import { wedding } from './config/wedding';
import './app.scss';

export default function App({ children }: PropsWithChildren) {
  useLaunch(() => {
    if (process.env.TARO_ENV === 'weapp' && !wedding.demo && wedding.cloudEnv) {
      Taro.cloud.init({ env: wedding.cloudEnv, traceUser: false });
    }
  });
  return children;
}
