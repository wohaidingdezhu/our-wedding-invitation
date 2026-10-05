// 在这里换成你们的资料。demo=false 并填写 cloudEnv 后启用真实的跨设备点赞。
export const wedding = {
  id: 'lin-and-chen',
  demo: true,
  cloudEnv: '',
  couple: ['林予', '陈安'],
  englishNames: 'LIN YU & CHEN AN',
  date: '2027-05-20T16:30:00+08:00',
  dateLabel: '2027 年 5 月 20 日 · 星期四',
  timeLabel: '16:30 仪式 · 18:00 婚宴',
  agenda: [
    { time: '16:30', title: '见证我们的婚礼', note: '把这一刻，交给爱与祝福' },
    { time: '18:00', title: '一起共享喜宴', note: '举杯相聚，把幸福慢慢说' }
  ],
  venue: '杭州 · 湖畔花园',
  address: '示例地址：浙江省杭州市西湖区花园路 20 号',
  // 示例坐标；上线前换成实际婚礼地点。
  latitude: 30.2399,
  longitude: 120.1322,
  intro: '从一次相遇，到每一个朝夕。\n我们决定，把往后的日子写成同一个故事。',
  invitation: '这一程的幸福，想与你一同见证。\n诚挚邀请你，来参加我们的婚礼。',
  // 当前是 AI 生成的示例照片，正式请帖换成你们的照片；保存海报使用独立的高分辨率文件。
  heroImage: '/assets/wedding-cover-v2.jpg',
  posterImage: '/assets/poster-v2.jpg',
  // 原创钢琴风格示例音频，随项目提供；可替换 HTTPS MP3。
  musicUrl: '/assets/wedding.wav',
  musicTitle: '花开的声音',
  shareTitle: '林予 & 陈安的婚礼 · 邀请你见证我们的幸福'
} as const;
