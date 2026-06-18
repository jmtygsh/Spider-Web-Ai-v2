import {
  ArrowRight,
  Bot,
  Calendar,
  Check,
  Mail,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { type Metadata } from "next";
import { type ReactNode } from "react";

import { ElectricBorderFrame } from "@/components/ElectricBorderWire";
import { Footer } from "@/components/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing — Spider Web",
  description:
    "Simple, transparent pricing for AI-powered email and meeting management.",
};

type PricingPlan = {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  highlighted?: boolean;
  badge?: string;
  icon: ReactNode;
};

const PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: "$0",
    period: "forever",
    description: "Perfect for trying Spider Web on your personal inbox.",
    features: [
      "1 Gmail or Outlook account",
      "50 AI commands per month",
      "Basic inbox triage",
      "Meeting prep (up to 5/month)",
      "Ctrl+K command center",
    ],
    cta: "Get Started Free",
    href: "/signup",
    icon: <Mail className="h-5 w-5" />,
  },
  {
    name: "Pro",
    price: "$19",
    period: "per month",
    description: "For professionals who live in email and calendar all day.",
    features: [
      "Unlimited AI commands",
      "Proactive meeting prep agent",
      "Hourly inbox prioritization",
      "RAG-grounded chat assistant",
      "Human-in-the-loop approvals",
      "Priority background sync",
    ],
    cta: "Start Pro Trial",
    href: "/signup",
    highlighted: true,
    badge: "Most Popular",
    icon: <Sparkles className="h-5 w-5" />,
  },
  {
    name: "Team",
    price: "$49",
    period: "per user / month",
    description: "Shared intelligence for sales, ops, and leadership teams.",
    features: [
      "Everything in Pro",
      "Shared workspace & admin",
      "Relationship intelligence",
      "Team execution logs",
      "SSO & role-based access",
      "Dedicated onboarding",
    ],
    cta: "Contact Sales",
    href: "/signup",
    icon: <Users className="h-5 w-5" />,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "annual contract",
    description: "For orgs that need scale, compliance, and custom workflows.",
    features: [
      "Everything in Team",
      "Dedicated Inngest fan-out infra",
      "Custom Corsair integrations",
      "SLA & priority support",
      "On-prem / VPC deployment",
      "Security review & DPA",
    ],
    cta: "Talk to Us",
    href: "/signup",
    icon: <Shield className="h-5 w-5" />,
  },
];

const COMPARISON = [
  { label: "AI command center (Ctrl+K)", starter: true, pro: true, team: true },
  { label: "Background inbox triage", starter: "Basic", pro: true, team: true },
  { label: "Meeting prep agent", starter: "5/mo", pro: true, team: true },
  { label: "MCP tool integrations", starter: "Gmail", pro: true, team: true },
  { label: "RAG over your workspace", starter: false, pro: true, team: true },
  { label: "Fan-out workflow engine", starter: false, pro: true, team: true },
  { label: "Team admin & SSO", starter: false, pro: false, team: true },
];

function GridBackground() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-5"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <pattern
          id="pricing-grid"
          width="40"
          height="40"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 40 0 L 0 0 0 40"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#pricing-grid)" />
    </svg>
  );
}

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === false) {
    return <span className="text-muted-foreground/40">—</span>;
  }

  if (value === true) {
    return (
      <span className="bg-primary flex h-5 w-5 items-center justify-center rounded-full">
        <Check className="text-primary-foreground h-3 w-3" strokeWidth={3} />
      </span>
    );
  }

  return (
    <span className="text-muted-foreground text-xs font-medium">{value}</span>
  );
}

export default function PricingPage() {
  return (
    <main className="bg-background min-h-screen">
      {/* Hero */}
      <section className="border-border/50 relative overflow-hidden border-b">
        <GridBackground />
        <ElectricBorderFrame
          className="container mx-auto px-4 py-20 sm:py-24"
          bulbCount={6}
        >
          <div className="relative z-10 mx-auto max-w-2xl text-center">
            <Badge variant="outline" className="mb-6">
              Simple pricing
            </Badge>
            <h1 className="text-foreground text-4xl font-semibold tracking-tight sm:text-5xl">
              Plans that scale with your{" "}
              <span className="from-primary to-accent bg-linear-to-r bg-clip-text text-transparent">
                workflow
              </span>
            </h1>
            <p className="text-muted-foreground mt-4 text-lg leading-relaxed">
              Start free. Upgrade when you need proactive agents, unlimited
              commands, and team intelligence. No hidden fees.
            </p>
            <ul className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-8">
              {["No credit card on free tier", "Cancel anytime", "14-day Pro trial"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="bg-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full">
                      <Check
                        className="text-primary-foreground h-3 w-3"
                        strokeWidth={3}
                      />
                    </span>
                    <span className="text-foreground text-sm font-medium">
                      {item}
                    </span>
                  </li>
                ),
              )}
            </ul>
          </div>
        </ElectricBorderFrame>
      </section>

      {/* Pricing cards */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "border-border bg-card relative flex flex-col border p-8 shadow-sm transition-shadow",
                plan.highlighted &&
                  "ring-primary/20 shadow-md ring-2 dark:ring-primary/30",
              )}
            >
              {plan.badge ? (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {plan.badge}
                </Badge>
              ) : null}

              <div className="border-border bg-background mb-6 flex h-11 w-11 items-center justify-center rounded-lg border">
                {plan.icon}
              </div>

              <h2 className="text-foreground text-xl font-semibold">
                {plan.name}
              </h2>
              <p className="text-muted-foreground mt-2 min-h-10 text-sm leading-relaxed">
                {plan.description}
              </p>

              <div className="mt-6 mb-8">
                <span className="text-foreground text-4xl font-bold tracking-tight">
                  {plan.price}
                </span>
                <span className="text-muted-foreground ml-2 text-sm">
                  {plan.period}
                </span>
              </div>

              <ul className="mb-8 flex flex-1 flex-col gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="bg-primary mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full">
                      <Check
                        className="text-primary-foreground h-2.5 w-2.5"
                        strokeWidth={3}
                      />
                    </span>
                    <span className="text-muted-foreground text-sm leading-relaxed">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href} className="mt-auto">
                <Button
                  className="h-11 w-full"
                  variant={plan.highlighted ? "default" : "outline"}
                >
                  {plan.cta}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Feature comparison */}
      <section className="border-border/50 bg-muted/5 border-y py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-foreground text-2xl font-bold tracking-tight sm:text-3xl">
              Compare plans
            </h2>
            <p className="text-muted-foreground mt-3 text-sm">
              Every plan includes secure OAuth, encryption at rest, and safety
              guardrails.
            </p>
          </div>

          <div className="border-border bg-card mx-auto max-w-3xl overflow-hidden border shadow-sm">
            <div className="border-border grid grid-cols-4 border-b px-6 py-4 text-sm font-semibold">
              <span className="text-muted-foreground">Feature</span>
              <span className="text-center">Starter</span>
              <span className="text-primary text-center">Pro</span>
              <span className="text-center">Team</span>
            </div>
            {COMPARISON.map((row) => (
              <div
                key={row.label}
                className="border-border grid grid-cols-4 items-center border-b px-6 py-4 last:border-b-0"
              >
                <span className="text-foreground text-sm">{row.label}</span>
                <div className="flex justify-center">
                  <FeatureCell value={row.starter} />
                </div>
                <div className="flex justify-center">
                  <FeatureCell value={row.pro} />
                </div>
                <div className="flex justify-center">
                  <FeatureCell value={row.team} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Pro */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            {
              icon: <Bot className="text-primary h-6 w-6" />,
              title: "Proactive agents",
              body: "Meeting prep and inbox triage run in the background — not when you remember to ask.",
            },
            {
              icon: <Zap className="text-primary h-6 w-6" />,
              title: "Ctrl+K command center",
              body: "Natural language commands with preview, safety checks, and one-click execution.",
            },
            {
              icon: <Calendar className="text-primary h-6 w-6" />,
              title: "Email + calendar native",
              body: "Built on Corsair MCP — deep Gmail and Google Calendar integration, not a browser tab.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border-border bg-card border p-8 shadow-sm"
            >
              <div className="border-border bg-background mb-4 flex h-12 w-12 items-center justify-center rounded-lg border">
                {item.icon}
              </div>
              <h3 className="text-foreground mb-2 text-lg font-semibold">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-border/50 bg-muted/10 relative overflow-hidden border-t py-20">
        <div className="from-background absolute inset-0 bg-gradient-to-b to-transparent" />
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h2 className="text-foreground text-3xl font-bold tracking-tight">
            Ready to reclaim your inbox?
          </h2>
          <p className="text-muted-foreground mx-auto mt-4 max-w-lg text-lg">
            Join thousands of professionals using Spider Web. Start free — upgrade
            when the agents prove their worth.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/signup">
              <Button size="lg" className="h-12 px-8">
                Start for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                variant="outline"
                size="lg"
                className="bg-background h-12 px-8"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
