import { CalendarCheck, Eye, BookOpen, Brain, Tractor, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { FarmActionPlanner } from '@/components/FarmActionPlanner';

export default function FarmPlanPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Today's Farm Plan"
        subtitle="Optimized field operations aligned with weather forecasts, crop stage requirements, and historical field memory."
        icon={<CalendarCheck className="w-6 h-6 text-saathi-600" />}
      />

      {/* Quick Navigation Hub */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 text-xs scrollbar-none">
        <span className="text-saathi-500 font-medium whitespace-nowrap pl-1">Quick Jump:</span>
        <Link
          to="/farm-watch"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-saathi-200 text-saathi-700 hover:bg-saathi-50 hover:text-saathi-900 transition-colors whitespace-nowrap"
        >
          <Eye className="w-3.5 h-3.5 text-saathi-600" />
          Farm Watch
        </Link>
        <Link
          to="/farm-memory"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-saathi-200 text-saathi-700 hover:bg-saathi-50 hover:text-saathi-900 transition-colors whitespace-nowrap"
        >
          <BookOpen className="w-3.5 h-3.5 text-saathi-600" />
          Farm Memory
        </Link>
        <Link
          to="/farm-intelligence"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-saathi-200 text-saathi-700 hover:bg-saathi-50 hover:text-saathi-900 transition-colors whitespace-nowrap"
        >
          <Brain className="w-3.5 h-3.5 text-saathi-600" />
          Farm Intelligence
        </Link>
        <Link
          to="/farm-profile"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/80 border border-saathi-200 text-saathi-700 hover:bg-saathi-50 hover:text-saathi-900 transition-colors whitespace-nowrap"
        >
          <Tractor className="w-3.5 h-3.5 text-saathi-600" />
          Farm Profile
          <ArrowRight className="w-3 h-3 ml-0.5 text-saathi-400" />
        </Link>
      </div>

      {/* Main Farm Action Planner */}
      <section aria-label="Daily Farm Action Planner">
        <FarmActionPlanner />
      </section>
    </div>
  );
}
