export const PLAN_LIMITS = {
  start: {
    maxProducts: 50,
    analyticsDays: 0,
    canExpenses: false,
    canAdvertising: false,
    maxTeam: 0,
  },
  business: {
    maxProducts: 150,
    analyticsDays: 90,
    canExpenses: true,
    canAdvertising: true,
    maxTeam: 2,
  },
  pro: {
    maxProducts: null,
    analyticsDays: null,
    canExpenses: true,
    canAdvertising: true,
    maxTeam: 5,
  },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string | null | undefined) {
  return PLAN_LIMITS[(plan as PlanId) ?? 'start'] ?? PLAN_LIMITS.start;
}

export const PLAN_NAMES: Record<string, string> = {
  start: 'Старт',
  business: 'Бизнес',
  pro: 'Pro',
};

export const PLAN_PRICES: Record<string, number> = {
  start: 9900,
  business: 14900,
  pro: 24900,
};

export const ADDON_PRICES = {
  preorder: { start: 5900, business: 8900, pro: 11900 },
  'auto-pricing': { start: 14990, business: 19990, pro: 24990 },
};

export function getAddonPrice(addonId: 'preorder' | 'auto-pricing', plan: string | null | undefined): number {
  const prices = ADDON_PRICES[addonId];
  const p = (plan ?? 'start') as PlanId;
  return prices[p] ?? prices.start;
}
