import test from 'node:test';
import assert from 'node:assert/strict';
import { groupPlanOffers } from '../api/_lib/plan-offers.js';

const plan = (code, period, price, extra = {}) => ({ code, period, price_mga: price, name: code, audience: 'owner', country: 'MG', archived: false, ...extra });
test('plan catalogue groups paired variants and computes a real annual saving', () => {
  const offers = groupPlanOffers([plan('gratuit', 'mensuel', 0), plan('premium', 'mensuel', 5000), plan('premium_annuel', 'annuel', 50000)]);
  assert.equal(offers.length, 2); assert.equal(offers[1].monthly.code, 'premium'); assert.equal(offers[1].annual.code, 'premium_annuel');
  assert.deepEqual(offers[1].discount, { reference: 60000, annual: 50000, savings: 10000, percent: 17 });
  assert.equal(offers[0].discount, null);
});
test('plan catalogue preserves annual-only, one-time, unexpected and incompatible variants', () => {
  const input = [plan('annual_annuel', 'annuel', 100), plan('unique', 'unique', 30), plan('odd', 'autre', 50), plan('pro', 'mensuel', 10), plan('pro_annuel', 'annuel', 100, { country: 'FR' })];
  const groups = groupPlanOffers(input);
  const all = groups.flatMap((group) => [group.monthly, group.annual, group.oneTime, group.other].filter(Boolean));
  assert.equal(all.length, input.length); assert.equal(groups.length, input.length);
  assert.equal(groups.find((group) => group.code === 'annual').annual.code, 'annual_annuel');
});
test('plan catalogue never invents a discount for free, equal, higher or archived prices', () => {
  for (const [monthly, annual, extra] of [[0, 0, {}], [10, 120, {}], [10, 140, {}], [10, 100, { archived: true }]]) {
    const [group] = groupPlanOffers([plan('p', 'mensuel', monthly), plan('p_annuel', 'annuel', annual, extra)]);
    assert.equal(group.discount, null);
  }
});
