import { run } from '../run.mjs';

run(new URL('./sample.json', import.meta.url), ({ cases }) => {
  const rows = cases.map(({ id, tenant, question, baseline, candidate, required, forbidden = [] }) => {
    if (![id, tenant, question, baseline, candidate].every(value => typeof value === 'string')
      || !Array.isArray(required) || !Array.isArray(forbidden)
      || ![...required, ...forbidden].every(value => typeof value === 'string' && value.trim())) {
      throw new Error('Invalid evaluation case');
    }
    const normalize = value => value.normalize('NFKC').toLowerCase();
    function failures(answer) {
      const content = normalize(answer);
      return [
        ...required.filter(term => !content.includes(normalize(term))).map(term => ({ missing: term })),
        ...forbidden.filter(term => content.includes(normalize(term))).map(term => ({ unexpected: term })),
      ];
    }
    const before = failures(baseline);
    const after = failures(candidate);
    const status = before.length
      ? after.length ? 'still_failing' : 'fixed'
      : after.length ? 'regression' : 'passed';
    return { id, tenant, question, baseline, candidate, status, before, after };
  });
  return {
    cases: rows.length,
    impactedTenants: [...new Set(rows.filter(row => row.status === 'regression').map(row => row.tenant))],
    results: rows,
  };
});
