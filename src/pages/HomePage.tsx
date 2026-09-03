import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
//import OnboardingTour from '@/components/OnboardingTour';
import {
  ScanSearch,
  Sprout,
  LineChart,
  Store,
  MessageSquare,
  ArrowRight,
  Camera,
  Brain,
  TrendingUp,
  Users,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

const features = [
  {
    to: '/disease-detection',
    title: 'Disease Detection',
    description: 'Snap a photo of your crop and get instant disease diagnosis with treatment advice.',
    icon: ScanSearch,
    color: 'bg-saathi-50 text-saathi-600',
    accent: false,
  },
  {
    to: '/crop-recommendation',
    title: 'Crop Advisor',
    description: 'Get personalized crop recommendations based on your soil, region, and season.',
    icon: Sprout,
    color: 'bg-saathi-50 text-saathi-600',
    accent: false,
  },
  {
    to: '/market-prices',
    title: 'Market Prices',
    description: 'Track market prices and price trends for major crops across Pakistan.',
    icon: LineChart,
    color: 'bg-saathi-50 text-saathi-600',
    accent: false,
  },
  {
    to: '/marketplace',
    title: 'Marketplace',
    description: 'Buy and sell produce directly — no middlemen, better prices for farmers.',
    icon: Store,
    color: 'bg-saathi-50 text-saathi-600',
    accent: false,
  },
  {
    to: '/assistant',
    title: 'Saathi AI',
    description: 'Ask any farming question and get instant AI guidance in English or Urdu.',
    icon: MessageSquare,
    color: 'bg-harvest-50 text-harvest-700',
    accent: true,
  },
];

const steps = [
  {
    icon: Camera,
    title: 'Capture',
    description: 'Take a photo of your crop or field with your phone.',
  },
  {
    icon: Brain,
    title: 'Analyze',
    description: 'Our AI instantly analyzes your input for insights.',
  },
  {
    icon: TrendingUp,
    title: 'Act',
    description: 'Get clear, actionable advice you can trust.',
  },
  {
    icon: Users,
    title: 'Connect',
    description: 'Sell directly to buyers without middlemen.',
  },
];

const stats = [
  { value: '5', label: 'AI Modules' },
  { value: '6+', label: 'Crops Tracked' },
  { value: '2', label: 'Languages' },
  { value: '100%', label: 'Farmer-First' },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  // Refs for feature cards (used by onboarding tour)
  const cardRefs = {
    disease: useRef<HTMLAnchorElement>(null),
    crop: useRef<HTMLAnchorElement>(null),
    assistant: useRef<HTMLAnchorElement>(null),
    market: useRef<HTMLAnchorElement>(null),
    marketplace: useRef<HTMLAnchorElement>(null),
  };

  // Map route paths to ref keys
  const routeToRefKey: Record<string, string> = {
    '/disease-detection': 'disease',
    '/crop-recommendation': 'crop',
    '/assistant': 'assistant',
    '/market-prices': 'market',
    '/marketplace': 'marketplace',
  };

  const handleFeatureClick = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('saathi:auth-required'));
    }
  };

  const handleGetStarted = () => {
    if (user) {
      navigate('/disease-detection');
    } else {
      window.dispatchEvent(new CustomEvent('saathi:auth-required'));
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-hero bg-gradient-to-br from-saathi-50 via-white to-saathi-50 px-6 py-16 sm:px-12 sm:py-24 shadow-hero animate-fade-in">
        <div className="absolute top-0 right-0 w-72 h-72 bg-saathi-100 rounded-full blur-3xl opacity-50 -translate-y-20 translate-x-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-saathi-200 rounded-full blur-3xl opacity-30 translate-y-20 -translate-x-20" />
        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-hero mb-6">
            <img src="/Logo/Logo.png" alt="Saathi" className="w-5 h-5 rounded-sm object-cover" />
            <span className="text-sm font-medium text-saathi-700">
              AI Farming Companion
            </span>
            <span className="text-[10px] font-bold text-harvest-800 bg-harvest-100 px-2 py-0.5 rounded-full">
              AI
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-saathi-900 leading-tight mb-6">
            Farm smarter with{' '}
            <span className="text-saathi-500">Saathi</span>
          </h1>
          <p className="text-lg sm:text-xl text-saathi-700 mb-8 max-w-2xl leading-relaxed">
            Saathi empowers Pakistani farmers with AI-driven tools to detect
            crop diseases early, choose the right crops, understand fair market
            prices, sell directly without middlemen, and get instant farming
            guidance — all in your own language.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={handleGetStarted} className="btn-primary text-base">
              <CheckCircle2 className="w-5 h-5" />
              {user ? 'Go to Dashboard' : 'Get Started'}
            </button>
            <button
              onClick={() => {
                if (user) {
                  navigate('/assistant');
                } else {
                  window.dispatchEvent(new CustomEvent('saathi:auth-required'));
                }
              }}
              className="btn-accent text-base"
            >
              <MessageSquare className="w-5 h-5" />
              Ask the Assistant
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="hero-card text-center"
          >
            <p className="text-3xl sm:text-4xl font-bold text-saathi-500">
              {stat.value}
            </p>
            <p className="text-saathi-600 text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* How it works — collapsible */}
      <section>
        <div className="hero-box p-6">
          <button
            onClick={() => setHowItWorksOpen(!howItWorksOpen)}
            aria-expanded={howItWorksOpen}
            aria-controls="how-it-works-content"
            className="w-full flex items-center justify-between gap-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-saathi-50 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-saathi-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-saathi-900">
                  How Saathi Works
                </h2>
                <p className="text-saathi-500 text-sm">
                  Four simple steps from field to informed decision
                </p>
              </div>
            </div>
            <ChevronDown
              className={`w-5 h-5 text-saathi-400 flex-shrink-0 transition-transform duration-300 ${
                howItWorksOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          <div
            id="how-it-works-content"
            className="overflow-hidden transition-all duration-500 ease-in-out"
            style={{
              maxHeight: howItWorksOpen ? '600px' : '0px',
              opacity: howItWorksOpen ? 1 : 0,
            }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
              {steps.map((step, idx) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="hero-card relative">
                    <div className="absolute -top-3 -left-3 w-8 h-8 bg-saathi-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-hero">
                      {idx + 1}
                    </div>
                    <div className="w-14 h-14 rounded-xl bg-saathi-50 flex items-center justify-center mb-4">
                      <Icon className="w-7 h-7 text-saathi-600" />
                    </div>
                    <h3 className="font-semibold text-saathi-900 text-lg mb-2">
                      {step.title}
                    </h3>
                    <p className="text-saathi-600 text-sm">{step.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section>
        <div className="text-center mb-10">
          <h2 className="section-title mb-3">Everything You Need</h2>
          <p className="section-subtitle max-w-2xl mx-auto">
            Five powerful AI tools designed for Pakistani farmers.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            const refKey = routeToRefKey[feature.to];
            return (
              <div key={feature.to} className="h-full">
                <Link
                  ref={cardRefs[refKey as keyof typeof cardRefs]}
                  to={feature.to}
                  onClick={(e) => handleFeatureClick(e)}
                  className="hero-card group flex flex-col h-full"
                >
                  <div className={`w-14 h-14 rounded-xl ${feature.color} flex items-center justify-center mb-4 relative`}>
                    <Icon className="w-7 h-7" />
                    {feature.accent && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-harvest-500 rounded-full flex items-center justify-center">
                        <span className="text-[7px] font-bold text-white">AI</span>
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-saathi-900 text-lg mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-saathi-600 text-sm flex-1">
                    {feature.description}
                  </p>
                  <div className={`mt-4 flex items-center gap-1.5 font-medium text-sm group-hover:gap-3 transition-all ${feature.accent ? 'text-harvest-700' : 'text-saathi-500'}`}>
                    Explore
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-hero bg-saathi-900 px-6 py-12 sm:px-12 sm:py-16 text-center shadow-hero-lg">
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden">
            <img src="/Logo/Logo.png" alt="Saathi logo" className="w-full h-full object-cover" />
          </div>
          <span className="text-2xl font-bold text-white">Saathi</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Ready to transform your farm?
        </h2>
        <p className="text-saathi-200 max-w-2xl mx-auto mb-8">
          Join thousands of Pakistani farmers using Saathi to make better
          decisions and earn more from their land.
        </p>
        <button onClick={handleGetStarted} className="btn-primary">
          <CheckCircle2 className="w-5 h-5" />
          {user ? 'Go to Dashboard' : 'Get Started Free'}
        </button>
      </section>

     // {/* Onboarding tour — shows on first visit only */}
    </div>
  );
}