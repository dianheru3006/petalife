import type { ComponentType } from 'react';
import {
  OnigiriIcon,
  CakeIcon,
  DangoIcon,
  BaoziIcon,
  PancakeIcon,
  CookieIcon,
  PuddingIcon,
  PeachIcon,
} from './snackIcons';

export interface SnackVariant {
  id: string;
  name: string;
  shortName: string;
  emoji: string;
  feedSpeech: string;
  IconComponent: ComponentType;
}

export const SNACK_VARIANTS: SnackVariant[] = [
  {
    id: 'onigiri',
    name: 'Nasi Onigiri Rumput Laut',
    shortName: 'Onigiri',
    emoji: '🍙',
    feedSpeech: 'Nyam nyam! Nasi Onigiri rumput laut ini pulen dan gurih! 🍙💖',
    IconComponent: OnigiriIcon,
  },
  {
    id: 'cake',
    name: 'Kue Stroberi Lembut',
    shortName: 'Kue Stroberi',
    emoji: '🍰',
    feedSpeech: 'Waaah! Kue Stroberinya manis dan lumer di lidah Mochi! 🍰✨',
    IconComponent: CakeIcon,
  },
  {
    id: 'dango',
    name: 'Dango 3 Warna Sakura',
    shortName: 'Dango Sakura',
    emoji: '🍡',
    feedSpeech: 'Oishi! Dango sakura kenyal kesukaan Mochi! 🍡🌸',
    IconComponent: DangoIcon,
  },
  {
    id: 'baozi',
    name: 'Bakpao Kukus Hangat',
    shortName: 'Bakpao Hangat',
    emoji: '🥟',
    feedSpeech: 'Haochi! Bakpao hangatnya empuk dan harum sekali! 🥟✨',
    IconComponent: BaoziIcon,
  },
  {
    id: 'pancake',
    name: 'Panekuk Madu & Mentega',
    shortName: 'Panekuk Madu',
    emoji: '🥞',
    feedSpeech: 'Yummy! Panekuk madunya wangi mentega banget! 🥞🍯',
    IconComponent: PancakeIcon,
  },
  {
    id: 'cookie',
    name: 'Biskuit Cokelat Renyah',
    shortName: 'Biskuit Cokelat',
    emoji: '🍪',
    feedSpeech: 'Krenyes! Biskuit cokelatnya renyah dan lezat! 🍪🍫',
    IconComponent: CookieIcon,
  },
  {
    id: 'pudding',
    name: 'Puding Karamel Lembut',
    shortName: 'Puding Karamel',
    emoji: '🍮',
    feedSpeech: 'Slurrrp! Puding karamelnya goyang-goyang manis! 🍮✨',
    IconComponent: PuddingIcon,
  },
  {
    id: 'peach',
    name: 'Buah Persik Madu Segar',
    shortName: 'Buah Persik',
    emoji: '🍑',
    feedSpeech: 'Segar sekali! Buah persik manis kaya vitamin! 🍑🌸',
    IconComponent: PeachIcon,
  },
];
