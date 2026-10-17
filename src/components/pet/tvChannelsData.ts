export interface TvChannel {
  id: 'aquarium' | 'meadow' | 'arcade' | 'campfire' | 'sakura';
  name: string;
  channelNum: string;
  speechText: string;
}

export const TV_CHANNELS: TvChannel[] = [
  {
    id: 'aquarium',
    name: 'Akuarium Tropis',
    channelNum: 'CH 01',
    speechText: 'Wah, ikannya lucu banget berenang-renang! 🐠🫧',
  },
  {
    id: 'meadow',
    name: 'Padang Rumput Sejuk',
    channelNum: 'CH 02',
    speechText: 'Pemandangan alam sejuk banget ya Dian! 🍃',
  },
  {
    id: 'arcade',
    name: 'Retro 8-Bit Mochi',
    channelNum: 'CH 03',
    speechText: 'Mochi jago main game ini, skornya 999! 🎮✨',
  },
  {
    id: 'campfire',
    name: 'Api Unggun Senja',
    channelNum: 'CH 04',
    speechText: 'Suasana hangat dan tenang buat santai... ☕🔥',
  },
  {
    id: 'sakura',
    name: 'Malam Sakura Lofi',
    channelNum: 'CH 05',
    speechText: 'Kelopak sakura berjatuhan cantik banget... 🌸',
  },
];
