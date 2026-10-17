import { describe, it, expect } from 'vitest';
import { TV_CHANNELS } from './tvChannelsData';

describe('TV Channels & Daytime Animation Data', () => {
  it('contains at least 5 distinct animated channels', () => {
    expect(TV_CHANNELS.length).toBeGreaterThanOrEqual(5);
  });

  it('starts with Aquarium as the primary channel', () => {
    const ch = TV_CHANNELS[0];
    expect(ch.id).toBe('aquarium');
    expect(ch.channelNum).toBe('CH 01');
    expect(ch.speechText).toContain('ikan');
  });

  it('each channel has a unique id, unique channelNum, valid name, and friendly speech reaction', () => {
    const ids = new Set<string>();
    const nums = new Set<string>();

    for (const ch of TV_CHANNELS) {
      expect(ids.has(ch.id)).toBe(false);
      ids.add(ch.id);

      expect(nums.has(ch.channelNum)).toBe(false);
      nums.add(ch.channelNum);

      expect(ch.name.trim().length).toBeGreaterThan(0);
      expect(ch.speechText.trim().length).toBeGreaterThan(0);
    }
  });

  it('cycles through all channels seamlessly and wraps around', () => {
    let index = 0;
    const visited: string[] = [];

    for (let i = 0; i < TV_CHANNELS.length; i++) {
      visited.push(TV_CHANNELS[index].id);
      index = (index + 1) % TV_CHANNELS.length;
    }

    expect(visited).toEqual(['aquarium', 'meadow', 'arcade', 'campfire', 'sakura']);
    expect(index).toBe(0); // Successfully wrapped back
  });
});
