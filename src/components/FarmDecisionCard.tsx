import { useState } from 'react';
import {
  AlertTriangle,
  Droplets,
  Wind,
  Sun,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Tractor,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useFarmDecision } from '@/hooks/useFarmDecision';
import EconomicImpactCard from '@/components/EconomicImpactCard';

export default function FarmDecisionCard() {
  const { decisionResult, weather, farmContext, isLoading, refreshDecisions } = useFarmDecision();
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading && !decisionResult) {
    return (
      <div className="hero-box p-5 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-saathi-100" />
            <div className="space-y-1.5">
              <div className="w-40 h-4 bg-saathi-100 rounded" />
              <div className="w-24 h-3 bg-saathi-50 rounded" />
            </div>
          </div>
          <div className="w-20 h-6 bg-saathi-100 rounded-full" />
        </div>
      </div>
    );
  }

  if (!decisionResult || !weather) {
    return null;
  }

  const {
    overallStatus,
    alerts,
    weatherSummary,
    sprayingDecision,
    irrigationDecision,
    heatStressDecision,
    windDecision,
    tomorrowComparison,
    meta,
  } = decisionResult;

  // Status styling
  const statusBadge =
    overallStatus === 'action_needed'
      ? {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          label: `${alerts.length || 1} item${alerts.length === 1 ? '' : 's'} need attention`,
        }
      : overallStatus === 'monitoring'
      ? {
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          dot: 'bg-blue-500',
          label: 'Conditions to monitor',
        }
      : {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          label: 'Favorable field conditions',
        };

  return (
    <div className="hero-box p-5 sm:p-6 transition-all border border-saathi-100 shadow-sm hover:shadow-md">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-saathi-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-saathi-50 flex items-center justify-center text-saathi-600 flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-saathi-900">
                Saathi Farm Intelligence
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusBadge.bg} ${
                  overallStatus === 'action_needed' ? 'animate-text-pulse' : ''
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                {statusBadge.label}
              </span>
            </div>
            <p className="text-xs text-saathi-500 mt-0.5">
              {weather.locationName}
              {farmContext?.currentCrop && (
                <> • <span className="font-semibold text-saathi-700">{farmContext.currentCrop}</span></>
              )}
              {farmContext?.cropStage && (
                <> ({farmContext.cropStage})</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => refreshDecisions()}
            className="p-1.5 rounded-lg text-saathi-400 hover:text-saathi-600 hover:bg-saathi-50 transition-colors"
            title="Refresh decisions"
            aria-label="Refresh decisions"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/farm-profile"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-saathi-600 hover:text-saathi-800 bg-saathi-50 hover:bg-saathi-100 rounded-lg transition-colors"
            title="Edit Farm Profile"
          >
            <Tractor className="w-3.5 h-3.5" />
            <span>Farm Profile</span>
          </Link>
        </div>
      </div>

      {/* ── Summary & Key Decision Tiles ── */}
      <div className="pt-4 space-y-3">
        <p className="text-xs text-saathi-600 italic">
          {weatherSummary}
        </p>

        {/* 3 Main Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Spraying Tile */}
          <div
            className={`p-3.5 rounded-xl border text-left transition-colors ${
              sprayingDecision.status === 'avoid'
                ? 'bg-amber-50/70 border-amber-200'
                : sprayingDecision.status === 'caution'
                ? 'bg-amber-50/40 border-amber-100'
                : 'bg-emerald-50/40 border-emerald-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-saathi-900 flex items-center gap-1.5">
                <Wind className="w-3.5 h-3.5 text-saathi-600" />
                Spraying
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  sprayingDecision.status === 'avoid'
                    ? 'bg-amber-200/70 text-amber-900'
                    : sprayingDecision.status === 'caution'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {sprayingDecision.rating}
              </span>
            </div>
            <p className="text-xs font-semibold text-saathi-800 leading-snug">
              {sprayingDecision.headline}
            </p>
            <p className="text-[11px] text-saathi-600 mt-1 line-clamp-2">
              {sprayingDecision.reason}
            </p>
          </div>

          {/* Irrigation Tile */}
          <div
            className={`p-3.5 rounded-xl border text-left transition-colors ${
              irrigationDecision.status === 'delay'
                ? 'bg-blue-50/70 border-blue-200'
                : irrigationDecision.status === 'irrigate'
                ? 'bg-amber-50/40 border-amber-100'
                : 'bg-saathi-50/50 border-saathi-100'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-saathi-900 flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-blue-600" />
                Irrigation
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  irrigationDecision.status === 'delay'
                    ? 'bg-blue-100 text-blue-800'
                    : irrigationDecision.status === 'irrigate'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {irrigationDecision.status === 'delay'
                  ? 'Delay Water'
                  : irrigationDecision.status === 'irrigate'
                  ? 'Irrigate Soon'
                  : 'Adequate'}
              </span>
            </div>
            <p className="text-xs font-semibold text-saathi-800 leading-snug">
              {irrigationDecision.headline}
            </p>
            <p className="text-[11px] text-saathi-600 mt-1 line-clamp-2">
              {irrigationDecision.reason}
            </p>
          </div>

          {/* Tomorrow & Working Window Tile */}
          <div className="p-3.5 rounded-xl border border-saathi-100 bg-saathi-50/40 text-left">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-saathi-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-saathi-600" />
                Tomorrow vs Today
              </span>
              <span className="text-[10px] font-semibold text-saathi-600 bg-white px-2 py-0.5 rounded border border-saathi-200">
                {tomorrowComparison.tomorrowBetterForSpraying ? 'Spraying Better' : 'Forecast'}
              </span>
            </div>
            <p className="text-xs font-semibold text-saathi-800 leading-snug">
              {tomorrowComparison.headline}
            </p>
            <p className="text-[11px] text-saathi-600 mt-1 line-clamp-2">
              {tomorrowComparison.comparisonDetails[0] || 'Similar field conditions expected.'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Expandable Details Section ── */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-saathi-100 space-y-4 text-xs animate-fade-in">
          {/* Detailed Decision Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Heat Stress Detail */}
            <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100">
              <div className="flex items-center gap-1.5 text-saathi-800 font-bold mb-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Heat Stress: {heatStressDecision.headline}</span>
              </div>
              <p className="text-saathi-600 mb-1">{heatStressDecision.reason}</p>
              {heatStressDecision.details && (
                <p className="text-[11px] text-saathi-500 italic">{heatStressDecision.details}</p>
              )}
            </div>

            {/* Wind Detail */}
            <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100">
              <div className="flex items-center gap-1.5 text-saathi-800 font-bold mb-1">
                <Wind className="w-3.5 h-3.5 text-saathi-500" />
                <span>Wind Risk: {windDecision.headline}</span>
              </div>
              <p className="text-saathi-600 mb-1">{windDecision.reason}</p>
              {windDecision.details && (
                <p className="text-[11px] text-saathi-500 italic">{windDecision.details}</p>
              )}
            </div>
          </div>

          {/* Tomorrow Comparison Detailed Bullets */}
          <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100 space-y-1.5">
            <span className="font-bold text-saathi-800 block">Forecast Comparison (Today vs Tomorrow):</span>
            <ul className="list-disc list-inside space-y-1 text-saathi-600 pl-1">
              {tomorrowComparison.comparisonDetails.map((detail, idx) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          </div>

          {/* Economic Impact Intelligence Card */}
          <EconomicImpactCard
            decisionResult={decisionResult}
            className="border border-saathi-100 bg-white"
          />

          {/* Missing Context Guidance */}
          {meta.missingFields.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/60 text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-xs">Improve recommendation precision</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Your farm profile does not yet have: <span className="font-medium">{meta.missingFields.join(', ')}</span>.
                  Adding your crop variety and stage allows the engine to apply crop-specific physiological thresholds.
                </p>
                <Link
                  to="/farm-profile"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 underline mt-1"
                >
                  Update Farm Profile →
                </Link>
              </div>
            </div>
          )}

          {/* Local Privacy & Non-AI Guarantee */}
          <div className="flex items-center justify-between text-[11px] text-saathi-500 pt-1">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-saathi-600" />
              Deterministic local rules • Zero AI transmission
            </span>
            <span>Evaluated at {new Date(meta.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      )}

      {/* ── Toggle Details Button ── */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-saathi-600 hover:text-saathi-800 py-1 px-3 rounded-lg hover:bg-saathi-50 transition-colors"
        >
          <span>{isExpanded ? 'Hide Details' : 'View Full Decision Details'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}
