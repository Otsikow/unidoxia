"use client";

import { useEffect } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight, BarChart3, Gift, LineChart, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { markOnboardingSeen } from "@/lib/onboardingStorage";
import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";

const earningsTimeline = [
  { label: "Week 1", value: 2800 },
  { label: "Week 2", value: 4200 },
  { label: "Week 3", value: 6100 },
  { label: "Week 4", value: 7900 },
  { label: "Week 5", value: 9800 },
];

const payoutTiles = [
  {
    title: "Cleared Commissions",
    amount: "$4,200",
    change: "+18% vs last month",
    accent: "from-emerald-500/20 via-emerald-400/10 to-transparent",
    icon: Wallet,
  },
  {
    title: "Pending Payout",
    amount: "$2,750",
    change: "Arriving Friday",
    accent: "from-cyan-500/20 via-cyan-400/10 to-transparent",
    icon: ShieldCheck,
  },
  {
    title: "Referral Rewards",
    amount: "$860",
    change: "+6 new partners",
    accent: "from-violet-500/20 via-violet-400/10 to-transparent",
    icon: Gift,
  },
];

const referralStats = [
  { label: "Active Referrals", value: "24", trend: "+12%" },
  { label: "Avg. Payout", value: "$420", trend: "+8%" },
  { label: "Conversion", value: "64%", trend: "+5%" },
];

const AgentEarnings = () => {
  const [searchParams] = useSearchParams();
  const nextParam = searchParams.get("next");
  const nextTarget = nextParam ? decodeURIComponent(nextParam) : "/auth/signup?role=agent";

  useEffect(() => {
    markOnboardingSeen("agent");
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Background gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-48 -left-32 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-500/20 via-blue-500/10 to-transparent blur-3xl" />
        <div className="absolute top-10 right-0 h-72 w-72 rounded-full bg-gradient-to-br from-violet-500/30 via-indigo-500/10 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-20 h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-500/20 via-teal-500/10 to-transparent blur-3xl" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3 text-sm text-cyan-200/80">
            <Sparkles className="h-4 w-4" />
            <span>Agent onboarding • Earnings overview</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-cyan-100/80">
            <ArrowLeft className="h-4 w-4" />
            <Link className="underline-offset-4 hover:underline" to={`/agents/onboarding?next=${encodeURIComponent(nextTarget)}`}>
              Back to overview
            </Link>
            <span className="text-cyan-200/80">Next: Create your account</span>
          </div>
        </div>

        <OnboardingProgress currentStep={2} totalSteps={2} label="See payouts, then sign up in one more step" />

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Left column */}
          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-3xl border border-white/5 bg-white/5 p-8 shadow-[0_20px_80px_-40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5" />
              <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-10">
                <div className="space-y-4 lg:max-w-xl">
                  <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-indigo-500/20 px-3 py-1 text-xs font-semibold text-cyan-100">
                    Fintech-inspired onboarding
                  </div>
                  <div className="space-y-3">
                    <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                      Earn Commissions & Grow Your Agency
                    </h1>
                    <p className="text-base text-slate-200/80 md:text-lg">
                      Get paid for every successful enrolment with transparent tracking and timely payouts. Build momentum with
                      referral rewards, growth analytics, and clean dashboards built for ambitious African agents.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-slate-200/80">
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                      <BarChart3 className="h-4 w-4 text-cyan-300" />
                      Real-time earnings
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-300" />
                      Protected payouts
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-white/5 px-3 py-1">
                      <Gift className="h-4 w-4 text-violet-300" />
                      Referral bonuses
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Button asChild size="lg" className="gap-2 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/30">
                      <Link to={nextTarget}>
                        Start earning now
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                      <Link to="/contact">Talk to partnerships</Link>
                    </Button>
                  </div>
                </div>

                <div className="relative w-full max-w-sm rounded-2xl bg-slate-900/70 p-4 shadow-lg backdrop-blur">
                  <div className="absolute inset-x-0 -top-8 mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-500 blur-2xl" />
                  <div className="relative space-y-3 rounded-xl border border-white/5 bg-gradient-to-br from-white/5 via-slate-900/60 to-slate-900/90 p-4 text-sm text-slate-200 shadow-inner">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-slate-400">Commission balance</p>
                        <p className="text-2xl font-semibold text-white">$6,950</p>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                        <ArrowUpRight className="h-3.5 w-3.5" /> 22% growth
                      </span>
                    </div>

                    <div className="rounded-lg bg-white/5 p-3">
                      <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
                        <span>Weekly growth</span>
                        <span className="flex items-center gap-1 text-emerald-200">
                          <LineChart className="h-4 w-4" /> Trending up
                        </span>
                      </div>
                      <div className="flex h-40 items-end gap-2">
                        {earningsTimeline.map((item, idx) => (
                          <div key={item.label} className="flex-1 space-y-1">
                            <div
                              className="rounded-full bg-gradient-to-t from-cyan-500/30 via-blue-500/40 to-indigo-500/70"
                              style={{ height: `${50 + idx * 12}%` }}
                            />
                            <p className="text-[10px] text-center text-slate-400">{item.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      {referralStats.map((stat) => (
                        <div key={stat.label} className="rounded-lg border border-white/5 bg-white/5 p-3">
                          <p className="text-[11px] text-slate-400">{stat.label}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-lg font-semibold text-white">{stat.value}</p>
                            <span className="text-xs text-emerald-300">{stat.trend}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-slate-900/80 p-6 shadow-lg backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-300">Commission trajectory</p>
                  <h3 className="text-xl font-semibold text-white">Transparent payouts & referrals</h3>
                </div>
                <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  View payout schedule
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {payoutTiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <div key={tile.title} className="relative overflow-hidden rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner">
                      <div className={`absolute inset-0 bg-gradient-to-br ${tile.accent}`} />
                      <div className="relative flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="text-xs text-slate-300">{tile.title}</p>
                          <p className="text-2xl font-semibold text-white">{tile.amount}</p>
                          <p className="text-xs text-emerald-200">{tile.change}</p>
                        </div>
                        <span className="rounded-xl bg-slate-900/50 p-2 text-cyan-200">
                          <Icon className="h-5 w-5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="relative rounded-3xl border border-white/5 bg-gradient-to-b from-slate-900/90 via-slate-900/70 to-slate-950 p-6 shadow-[0_30px_80px_-48px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            <div className="absolute inset-0 rounded-3xl border border-white/5" />
            <div className="relative space-y-6">
              <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 text-sm text-slate-200">
                <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500">
                  <img
                    src="https://images.unsplash.com/photo-1551292831-023188e78222?auto=format&fit=crop&w=400&q=80"
                    alt="Agent reviewing dashboard"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-slate-400">Featured agent</p>
                  <p className="text-base font-semibold text-white">Amina, Lagos</p>
                  <p className="text-xs text-emerald-200">+38% earnings growth this quarter</p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Weekly revenue momentum</span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-1 text-[11px] font-semibold text-emerald-100">
                    <ArrowUpRight className="h-3.5 w-3.5" /> Upward trend
                  </span>
                </div>
                <div className="flex h-52 items-end gap-2 rounded-xl bg-gradient-to-t from-slate-950 via-slate-900 to-slate-900 p-4">
                  {earningsTimeline.map((item) => (
                    <div key={item.label} className="flex-1">
                      <div
                        className="mb-2 rounded-xl bg-gradient-to-t from-cyan-500/20 via-blue-500/30 to-indigo-500/60"
                        style={{ height: `${item.value / 140}%` }}
                      />
                      <p className="text-[11px] text-slate-400">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3">
                    <p className="text-xs text-slate-400">Top program</p>
                    <p className="text-lg font-semibold text-white">MBA, Toronto</p>
                    <p className="text-xs text-cyan-200">$1,250 per enrolment</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-slate-950/70 p-3">
                    <p className="text-xs text-slate-400">Fastest payout</p>
                    <p className="text-lg font-semibold text-white">48 hours</p>
                    <p className="text-xs text-emerald-200">After visa approval</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 rounded-2xl border border-white/5 bg-gradient-to-r from-cyan-500/10 via-blue-500/5 to-indigo-500/10 p-4">
                <div className="flex items-center justify-between text-sm text-slate-200">
                  <span className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-cyan-300" />
                    Automated payouts
                  </span>
                  <span className="text-xs text-emerald-200">Timely every Friday</span>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-xl bg-white/10 p-3 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-wide text-cyan-100">Instant transfers</p>
                    <p className="text-lg font-semibold text-white">Global partner banks</p>
                    <p className="text-xs text-slate-300">NGN, USD, GBP supported</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-sm text-slate-200">
                    <p className="text-xs uppercase tracking-wide text-cyan-100">Referral boost</p>
                    <p className="text-lg font-semibold text-white">6 new partners</p>
                    <p className="text-xs text-slate-300">+12% average commission</p>
                  </div>
                </div>
                <p className="text-xs text-slate-200">Final step: create your account to lock in your payout schedule. You won&apos;t be asked to repeat onboarding.</p>
                <Button asChild variant="secondary" className="w-full bg-white text-slate-900 hover:bg-slate-100">
                  <Link to={nextTarget} className="flex items-center justify-center gap-2">
                    Continue to sign up
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentEarnings;
