import assert from 'node:assert/strict';
import test from 'node:test';
import { getAllEmotions, getEmotionFile } from '../services/emotionService.js';

test('avatar categories expose labelled WebP assets', async () => {
  const [siders, loops] = await Promise.all([
    getAllEmotions('sider'),
    getAllEmotions('loop'),
  ]);

  assert.equal(siders.length, 31);
  assert.equal(loops.length, 16);
  assert.ok(siders.every((emotion) => emotion.id.endsWith('.webp')));
  assert.ok(loops.every((emotion) => emotion.id.endsWith('.webp')));
  assert.deepEqual(
    { name: siders[0].name, pose: siders[0].pose },
    { name: 'Sider', pose: 'Pose 01' },
  );
});

test('legacy PNG avatar IDs resolve to their converted WebP image', () => {
  const emotionFile = getEmotionFile('sider:icon_1.png');

  assert.ok(emotionFile);
  assert.equal(emotionFile.contentType, 'image/webp');
  assert.match(String(emotionFile.stream.path), /icon_1\.webp$/i);
  emotionFile.stream.destroy();
});
