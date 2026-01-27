import { describe, it, expect } from 'vitest';
import { getLevelConfig, getTotalLevels } from '../../data/levels.js';

describe('Level data', () => {
  it('getTotalLevels returns positive number', () => {
    expect(getTotalLevels()).toBeGreaterThan(0);
  });

  it('getLevelConfig returns config for level 1', () => {
    const config = getLevelConfig(1);
    expect(config).toBeDefined();
    expect(config.gravity).toBeDefined();
    expect(config.rebound).toBeDefined();
    expect(config.objectIds).toBeInstanceOf(Array);
    expect(config.objectIds.length).toBeGreaterThan(0);
  });

  it('getLevelConfig returns config for all levels', () => {
    const total = getTotalLevels();
    for (let i = 1; i <= total; i++) {
      const config = getLevelConfig(i);
      expect(config).toBeDefined();
      expect(config.objectIds.length).toBeGreaterThan(0);
    }
  });

  it('getLevelConfig returns null for out-of-range level', () => {
    const config = getLevelConfig(9999);
    expect(config).toBeNull();
  });

  it('level 4+ may have oneway assignments', () => {
    const config = getLevelConfig(4);
    expect(config).toBeDefined();
    // onewayAssignments may or may not exist
    if (config.onewayAssignments) {
      expect(config.onewayAssignments).toBeInstanceOf(Array);
    }
  });
});
