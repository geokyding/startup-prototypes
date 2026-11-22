import { run } from '../run.mjs';

run(new URL('./sample.json', import.meta.url), ({ samples }) => {
  const groups = new Map();
  for (const { id, group, actual, predicted, image } of samples) {
    if (typeof id !== 'string' || typeof group !== 'string'
      || typeof actual !== 'boolean' || typeof predicted !== 'boolean') {
      throw new Error('Each sample requires string id and group, and boolean actual and predicted');
    }
    const summary = groups.get(group) ?? { group, total: 0, positives: 0, misses: [], falseAlarms: [] };
    summary.total++;
    if (actual) summary.positives++;
    if (actual && !predicted) summary.misses.push({ id, image });
    if (!actual && predicted) summary.falseAlarms.push({ id, image });
    groups.set(group, summary);
  }
  return [...groups.values()].sort((a, b) =>
    b.misses.length - a.misses.length || b.falseAlarms.length - a.falseAlarms.length
  ).map(summary => ({
    ...summary,
    missRate: summary.positives ? summary.misses.length / summary.positives : null,
    falseAlarmRate: summary.total > summary.positives
      ? summary.falseAlarms.length / (summary.total - summary.positives)
      : null,
  }));
});
