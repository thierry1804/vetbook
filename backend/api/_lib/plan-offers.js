// Only the explicit _annuel convention links two variants. Unusual codes/periods stay visible.
export function groupPlanOffers(plans) {
  const byCode = new Map(plans.map((plan) => [plan.code, plan]));
  const groups = new Map();
  for (const plan of plans) {
    const baseCode = plan.period === 'annuel' && plan.code.endsWith('_annuel') ? plan.code.slice(0, -7) : plan.code;
    const base = byCode.get(baseCode);
    const compatible = !base || base === plan || (base.period === 'mensuel' && base.audience === plan.audience && (base.country || '') === (plan.country || ''));
    const key = compatible ? baseCode : plan.code;
    let group = groups.get(key);
    if (!group) { group = { code: key, monthly: null, annual: null, oneTime: null, other: null }; groups.set(key, group); }
    const slot = plan.period === 'mensuel' ? 'monthly' : plan.period === 'annuel' ? 'annual' : plan.period === 'unique' ? 'oneTime' : 'other';
    group[slot] = plan;
  }
  return [...groups.values()].map((group) => {
    const representative = group.monthly || group.annual || group.oneTime || group.other;
    const reference = group.monthly ? Number(group.monthly.price_mga) * 12 : 0;
    const annual = group.annual ? Number(group.annual.price_mga) : NaN;
    const discount = reference > 0 && annual >= 0 && annual < reference && !group.monthly.archived && !group.annual.archived
      ? { reference, annual, savings: reference - annual, percent: Math.round((1 - annual / reference) * 100) } : null;
    return { ...group, title: (byCode.get(group.code)?.name || representative.name), discount };
  });
}
