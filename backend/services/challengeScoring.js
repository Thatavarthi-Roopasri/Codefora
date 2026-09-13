import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import { ssim } from 'ssim.js';

export function compareChallengeImages(targetBase64, userBase64, normalize) {
  const originalTarget = PNG.sync.read(Buffer.from(targetBase64.split(',').pop(), 'base64'));
  const originalUser = PNG.sync.read(Buffer.from(userBase64.split(',').pop(), 'base64'));
  const { targetPng: target, userPng: user } = normalize(originalTarget, originalUser);
  const { width, height } = target;
  const diff = new PNG({ width, height });
  const mismatch = pixelmatch(target.data, user.data, diff.data, width, height, { threshold: 0.08, includeAA: false });
  const baseline = new PNG({ width, height });
  for (let i = 0; i < baseline.data.length; i += 4) target.data.copy(baseline.data, i, 0, 4);
  const foreground = pixelmatch(target.data, baseline.data, null, width, height, { threshold: 0.08, includeAA: false });
  const pixelAccuracy = foreground ? 100 * Math.max(0, 1 - mismatch / foreground) : (mismatch === 0 ? 100 : 0);
  const structuralSimilarity = Math.max(0, ssim({ data: new Uint8ClampedArray(target.data), width, height }, { data: new Uint8ClampedArray(user.data), width, height }).mssim) * 100;
  const score = Math.round(pixelAccuracy * 0.5 + structuralSimilarity * 0.5);
  const differences = [];
  const bands = [{ label: 'top', start: 0, end: Math.floor(height / 3) }, { label: 'middle', start: Math.floor(height / 3), end: Math.floor(height * 2 / 3) }, { label: 'bottom', start: Math.floor(height * 2 / 3), end: height }];
  for (const band of bands) {
    let changed = 0;
    for (let y = band.start; y < band.end; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (Math.abs(target.data[i] - user.data[i]) + Math.abs(target.data[i + 1] - user.data[i + 1]) + Math.abs(target.data[i + 2] - user.data[i + 2]) > 75) changed++;
    }
    if (changed / (width * (band.end - band.start)) > 0.08) differences.push(`Check the ${band.label} section: compare alignment, spacing, and colors in the difference image.`);
  }
  if (originalTarget.height !== originalUser.height) differences.unshift(`Page height differs: target ${originalTarget.height}px, submission ${originalUser.height}px.`);
  return { score, pixelAccuracy: Number(pixelAccuracy.toFixed(2)), structuralSimilarity: Number(structuralSimilarity.toFixed(2)), differences, differenceImage: `data:image/png;base64,${PNG.sync.write(diff).toString('base64')}`, targetSize: { width: originalTarget.width, height: originalTarget.height }, userSize: { width: originalUser.width, height: originalUser.height } };
}
