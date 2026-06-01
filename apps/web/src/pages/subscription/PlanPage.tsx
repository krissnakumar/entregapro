import { useState, useEffect } from 'react';
import { api } from '../../api/client';
import { 
  CreditCard, 
  Check, 
  X, 
  ArrowUpCircle, 
  AlertTriangle,
  Loader2,
  Zap,
  Building2,
  TrendingUp,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';

type Plan = {
  id: string;
  name: string;
  slug: string;
  description: string;
  monthlyPrice: number;
  maxDrivers: number;
  maxDispatchers: number;
  maxDeliveriesPerMonth: number;
  hasRouteOptimization: boolean;
  hasLiveTracking: boolean;
  hasWhatsApp: boolean;
  hasCustomerPortal: boolean;
  hasAnalytics: boolean;
  hasConstructionModule: boolean;
  isPopular: boolean;
};

type SubscriptionInfo = {
  plan: Plan;
  status: string;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  usage: {
    deliveriesThisMonth: number;
    deliveriesLimit: number;
    deliveriesPercent: number;
    activeDrivers: number;
    driversLimit: number;
    driversPercent: number;
  };
  features: Record<string, boolean>;
};

export function PlanPage() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [changing, setChanging] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [sub, allPlans] = await Promise.all([
        api.get<SubscriptionInfo>('/subscription/usage'),
        api.get<Plan[]>('/plans'),
      ]);
      setSubscription(sub);
      setPlans(allPlans);
    } catch (err) {
      console.error('Failed to load subscription data', err);
    } finally {
      setLoading(false);
    }
  }

  async function changePlan(planSlug: string) {
    setChanging(planSlug);
    try {
      await api.post('/subscription/change-plan', { planSlug });
      toast.success(`Plano alterado com sucesso!`);
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao alterar plano');
    } finally {
      setChanging(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  const currentPlanSlug = subscription?.plan?.slug;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Plano e Assinatura</h1>
        <p className="text-sm text-slate-500 mt-1">Gerencie seu plano e veja o uso do sistema</p>
      </div>

      {subscription && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UsageCard
              label="Entregas"
              current={subscription.usage.deliveriesThisMonth}
              limit={subscription.usage.deliveriesLimit}
              percent={subscription.usage.deliveriesPercent}
              icon={TrendingUp}
            />
            <UsageCard
              label="Motoristas"
              current={subscription.usage.activeDrivers}
              limit={subscription.usage.driversLimit}
              percent={subscription.usage.driversPercent}
              icon={Users}
            />
            <UsageCard
              label="Status"
              current={0}
              limit={0}
              percent={0}
              status={subscription.status}
              trialEndsAt={subscription.trialEndsAt}
              periodEnd={subscription.currentPeriodEnd}
              icon={AlertTriangle}
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Crown className="text-amber-600 shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-sm font-bold text-amber-800">
                Plano atual: <span className="text-indigo-600">{subscription.plan.name}</span>
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {subscription.status === 'TRIAL' 
                  ? `Período de trial até ${new Date(subscription.trialEndsAt!).toLocaleDateString('pt-BR')}`
                  : subscription.status === 'ACTIVE'
                  ? `Próxima cobrança: ${new Date(subscription.currentPeriodEnd!).toLocaleDateString('pt-BR')}`
                  : `Status: ${subscription.status}`}
              </p>
            </div>
          </div>
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.slug === currentPlanSlug;
          return (
            <div
              key={plan.id}
              className={`relative rounded-2xl border-2 p-6 transition-all ${
                isCurrent
                  ? 'border-indigo-500 bg-indigo-50/50'
                  : plan.isPopular
                  ? 'border-amber-300 bg-white'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              {plan.isPopular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                  MAIS POPULAR
                </div>
              )}
              {isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-3 py-1 rounded-full">
                  PLANO ATUAL
                </div>
              )}

              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                <p className="text-xs text-slate-500 mt-1">{plan.description}</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-slate-900">
                    {plan.monthlyPrice === 0 ? '—' : `R$ ${plan.monthlyPrice}`}
                  </span>
                  {plan.monthlyPrice > 0 && (
                    <span className="text-xs text-slate-500 ml-1">/mês</span>
                  )}
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <PlanFeature text={`${plan.maxDeliveriesPerMonth === 999999 ? 'Ilimitadas' : `${plan.maxDeliveriesPerMonth}`} entregas/mês`} included />
                <PlanFeature text={`${plan.maxDrivers === 999999 ? 'Ilimitados' : `Até ${plan.maxDrivers}`} motoristas`} included />
                <PlanFeature text={`${plan.maxDispatchers === 999999 ? 'Ilimitados' : `Até ${plan.maxDispatchers}`} despachantes`} included />
                <PlanFeature text="Rastreamento ao vivo" included={plan.hasLiveTracking} />
                <PlanFeature text="Analytics e relatórios" included={plan.hasAnalytics} />
                <PlanFeature text="Otimização de rotas" included={plan.hasRouteOptimization} />
                <PlanFeature text="WhatsApp" included={plan.hasWhatsApp} />
                <PlanFeature text="Portal do cliente" included={plan.hasCustomerPortal} />
                <PlanFeature text="Módulo construção" included={plan.hasConstructionModule} />
              </div>

              {!isCurrent && (
                <button
                  onClick={() => changePlan(plan.slug)}
                  disabled={changing === plan.slug}
                  className="w-full py-2.5 rounded-xl text-sm font-bold transition-all cursor-pointer
                    bg-indigo-600 text-white hover:bg-indigo-700
                    disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {changing === plan.slug ? (
                    <Loader2 className="animate-spin mx-auto" size={16} />
                  ) : plan.monthlyPrice === 0 ? (
                    'Fale Conosco'
                  ) : subscription && plan.monthlyPrice > subscription.plan.monthlyPrice ? (
                    'Fazer Upgrade'
                  ) : (
                    'Alterar para este'
                  )}
                </button>
              )}

              {isCurrent && (
                <button
                  disabled
                  className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-400 cursor-not-allowed"
                >
                  Plano Atual
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function UsageCard({ label, current, limit, percent, icon: Icon, status, trialEndsAt, periodEnd }: {
  label: string;
  current: number;
  limit: number;
  percent: number;
  icon: any;
  status?: string;
  trialEndsAt?: string | null;
  periodEnd?: string | null;
}) {
  if (status) {
    const isTrial = status === 'TRIAL';
    const isActive = status === 'ACTIVE';
    const isExpired = status === 'EXPIRED' || status === 'CANCELLED';
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-lg ${
            isTrial ? 'bg-amber-100' : isActive ? 'bg-emerald-100' : 'bg-red-100'
          }`}>
            <Icon size={16} className={
              isTrial ? 'text-amber-600' : isActive ? 'text-emerald-600' : 'text-red-600'
            } />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        </div>
        <p className={`text-lg font-bold ${
          isTrial ? 'text-amber-600' : isActive ? 'text-emerald-600' : 'text-red-600'
        }`}>
          {status === 'TRIAL' ? 'TRIAL' : status === 'ACTIVE' ? 'ATIVO' : status}
        </p>
        {trialEndsAt && (
          <p className="text-xs text-slate-500 mt-1">
            Trial até {new Date(trialEndsAt).toLocaleDateString('pt-BR')}
          </p>
        )}
        {periodEnd && status === 'ACTIVE' && (
          <p className="text-xs text-slate-500 mt-1">
            Renova em {new Date(periodEnd).toLocaleDateString('pt-BR')}
          </p>
        )}
      </div>
    );
  }

  const isOverLimit = current >= limit;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isOverLimit ? 'bg-red-100' : 'bg-indigo-100'}`}>
            <Icon size={16} className={isOverLimit ? 'text-red-600' : 'text-indigo-600'} />
          </div>
          <span className="text-xs font-bold text-slate-500 uppercase">{label}</span>
        </div>
        <span className={`text-xs font-bold ${isOverLimit ? 'text-red-600' : 'text-slate-700'}`}>
          {current}/{limit}
        </span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${
            isOverLimit ? 'bg-red-500' : percent > 80 ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

function PlanFeature({ text, included }: { text: string; included: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {included ? (
        <Check size={14} className="text-emerald-500 shrink-0" />
      ) : (
        <X size={14} className="text-slate-300 shrink-0" />
      )}
      <span className={`text-xs ${included ? 'text-slate-700' : 'text-slate-400'}`}>{text}</span>
    </div>
  );
}

function Users({ size, className }: { size: number; className?: string }) {
  return <Building2 size={size} className={className} />;
}
