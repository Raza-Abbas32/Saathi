import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sprout,
  AlertTriangle,
  AlertCircle,
  Clock,
  Droplets,
  Wind,
  Sun,
  Bug,
  TrendingUp,
  DollarSign,
  ChevronRight,
  X,
  ShieldCheck,
  Eye,
  Info,
  RefreshCw,
  Tractor,
  History,
  CheckCircle2,
  FileText,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useFarmActionPlanner } from '../hooks/useFarmActionPlanner';
import { useFarmOutcomes } from '../hooks/useFarmOutcomes';
import { useFarmContext } from '../hooks/useFarmContext';
import { FarmOutcomeModal } from './FarmOutcomeModal';
import { DecisionEvidenceDrawer } from './DecisionEvidenceDrawer';
import { FarmDecisionSimulator } from './FarmDecisionSimulator';
import { formatOutcomeLabel } from '../services/farmOutcomeService';
import type {
  FarmAction,
  FarmActionCategory,
  FarmActionPriority,
  FarmActionPlan,
} from '../types/farmActionPlanner';
import type { DecisionScenarioType } from '../types/farmDecisionSimulator';
import type { DiseaseWeatherAssessment } from '../types/diseaseWeather';
import type { DiseaseResult } from '../types';
import type { NormalizedMarketCropPrice } from '../types/market';

interface FarmActionPlannerProps {
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  diseaseResult?: DiseaseResult | null;
  marketPrices?: NormalizedMarketCropPrice[] | null;
  className?: string;
  planOverride?: FarmActionPlan;
}

export function FarmActionPlanner({
  diseaseAssessment,
  diseaseResult,
  marketPrices,
  className = '',
  planOverride,
}: FarmActionPlannerProps) {
  const { plan: computedPlan, weather, decisionResult, isLoading, refreshPlan } = useFarmActionPlanner({
    diseaseAssessment,
    diseaseResult,
    marketPrices,
  });

  const plan = planOverride || computedPlan;
  const [selectedAction, setSelectedAction] = useState<FarmAction | null>(null);
  const [outcomeModalAction, setOutcomeModalAction] = useState<FarmAction | null>(null);
  const [evidenceDrawerAction, setEvidenceDrawerAction] = useState<FarmAction | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState<boolean>(false);
  const [simulatorScenario, setSimulatorScenario] = useState<DecisionScenarioType>('SPRAYING');
  const [simulatorAction, setSimulatorAction] = useState<FarmAction | null>(null);

  const { farmContext } = useFarmContext();
  const { outcomes, getForAction, getHistorical } = useFarmOutcomes();

  const handleOpenSimulator = (action?: FarmAction | null, scenario?: DecisionScenarioType) => {
    setSimulatorAction(action || null);
    if (scenario) {
      setSimulatorScenario(scenario);
    } else if (action?.category === 'SPRAYING') {
      setSimulatorScenario('SPRAYING');
    } else if (action?.category === 'IRRIGATION') {
      setSimulatorScenario('IRRIGATION');
    } else if (action?.category === 'MARKET') {
      setSimulatorScenario('MARKET');
    } else {
      setSimulatorScenario('SPRAYING');
    }
    setSimulatorOpen(true);
  };

  const handleOpenEvidence = (action?: FarmAction | null) => {
    setEvidenceDrawerAction(action || topAction || null);
  };

  const getCategoryIcon = (category: FarmActionCategory) => {
    switch (category) {
      case 'DISEASE':
        return <Bug className="w-4 h-4 text-rose-600" />;
      case 'SPRAYING':
        return <Wind className="w-4 h-4 text-amber-600" />;
      case 'IRRIGATION':
        return <Droplets className="w-4 h-4 text-blue-600" />;
      case 'WEATHER':
        return <Sun className="w-4 h-4 text-amber-500" />;
      case 'SCOUTING':
        return <Eye className="w-4 h-4 text-purple-600" />;
      case 'CROP_LIFECYCLE':
        return <Sprout className="w-4 h-4 text-emerald-600" />;
      case 'MARKET':
        return <TrendingUp className="w-4 h-4 text-saathi-600" />;
      case 'ECONOMIC':
        return <DollarSign className="w-4 h-4 text-emerald-700" />;
      case 'GENERAL':
      default:
        return <Info className="w-4 h-4 text-saathi-600" />;
    }
  };

  const getPriorityBadge = (priority: FarmActionPriority) => {
    switch (priority) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-text-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse" />
            HIGH PRIORITY
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            ATTENTION
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-saathi-100 text-saathi-800 border border-saathi-200">
            <span className="w-1.5 h-1.5 rounded-full bg-saathi-500" />
            ROUTINE / INFO
          </span>
        );
    }
  };

  const getConfidenceBadge = (confidence: FarmAction['confidence']) => {
    switch (confidence) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
            High Evidence Confidence
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 rounded">
            Medium Confidence (Partial Context)
          </span>
        );
      case 'LOW':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 rounded">
            Low / Baseline Guidance
          </span>
        );
      case 'NOT_ENOUGH_DATA':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200 rounded">
            Not Enough Data
          </span>
        );
    }
  };

  const topAction = plan.topAction;
  const supportingActions = plan.actions.slice(1);

  return (
    <div
      id="farm-action-planner-card"
      className={`bg-white rounded-2xl border border-saathi-200 shadow-sm p-4 sm:p-5 text-saathi-900 ${className}`}
    >
      {/* ── Card Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-saathi-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-saathi-500/10 flex items-center justify-center flex-shrink-0">
            <Sprout className="w-5 h-5 text-saathi-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-saathi-900 leading-none">
                Today&apos;s Farm Plan
              </h2>
              {plan.hasUrgentAction ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                  {plan.highPriorityCount} urgent alert{plan.highPriorityCount > 1 ? 's' : ''}
                </span>
              ) : plan.attentionCount > 0 ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  {plan.attentionCount} action{plan.attentionCount > 1 ? 's' : ''} to review
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Routine monitoring
                </span>
              )}
            </div>
            {plan.farmSummary && (
              <p className="text-xs text-saathi-600 mt-0.5">
                {plan.farmSummary}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => handleOpenSimulator(topAction || null)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-saathi-800 bg-white hover:bg-saathi-50 rounded-lg border border-saathi-300 transition-colors shadow-2xs"
            title="Open Farm Decision Simulator to compare alternative choices"
          >
            <Sparkles className="w-3.5 h-3.5 text-saathi-600" />
            <span className="hidden sm:inline">Compare</span>
            <span>Options</span>
          </button>
          <button
            onClick={() => refreshPlan()}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-saathi-400 hover:text-saathi-600 hover:bg-saathi-50 transition-colors"
            title="Refresh action plan"
            aria-label="Refresh action plan"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/farm-profile"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-saathi-700 hover:text-saathi-900 bg-saathi-50 hover:bg-saathi-100 rounded-lg transition-colors border border-saathi-200"
            title="Manage Farm Profile"
          >
            <Tractor className="w-3.5 h-3.5" />
            <span>Profile</span>
          </Link>
        </div>
      </div>

      {/* ── Top Priority Action Hero ── */}
      {topAction && (
        <div className="mt-3.5">
          <div
            className={`p-4 rounded-xl border transition-all ${
              topAction.priority === 'HIGH'
                ? 'bg-rose-50/50 border-rose-200'
                : topAction.priority === 'MEDIUM'
                ? 'bg-amber-50/40 border-amber-200'
                : 'bg-saathi-50/40 border-saathi-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white shadow-xs">
                  {getCategoryIcon(topAction.category)}
                </div>
                <span className="text-xs font-bold text-saathi-900">
                  {topAction.title}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {getPriorityBadge(topAction.priority)}
              </div>
            </div>

            <p className="text-sm font-semibold text-saathi-900 leading-snug">
              {topAction.action}
            </p>
            <p className="text-xs text-saathi-700 mt-1 leading-relaxed">
              {topAction.reason}
            </p>

            <div className="mt-3 pt-2.5 border-t border-saathi-200/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-saathi-600">
                {topAction.timing && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-saathi-700 bg-white px-2 py-0.5 rounded border border-saathi-200">
                    <Clock className="w-3 h-3 text-saathi-500" />
                    {topAction.timing}
                  </span>
                )}
                {(() => {
                  const outcomes = getForAction(topAction.id);
                  if (outcomes.length > 0) {
                    const latest = outcomes[0];
                    return (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Outcome: {formatOutcomeLabel(latest.outcome)}
                      </span>
                    );
                  }
                  return null;
                })()}
                <span className="text-[11px] text-saathi-500">
                  Source: {topAction.sourceSignals.slice(0, 2).join(', ')}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setOutcomeModalAction(topAction)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-saathi-700 bg-saathi-50 hover:bg-saathi-100 rounded-lg border border-saathi-200 transition-colors"
                  title="Record what happened after taking or evaluating this action"
                >
                  <FileText className="w-3.5 h-3.5 text-saathi-600" />
                  <span>{getForAction(topAction.id).length > 0 ? 'Outcome' : 'Mark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenSimulator(topAction)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-saathi-800 bg-white hover:bg-saathi-50 rounded-lg border border-saathi-300 transition-colors shadow-2xs"
                  title="Compare alternative options for this action"
                >
                  <Sparkles className="w-3.5 h-3.5 text-saathi-600" />
                  <span>Compare</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenEvidence(topAction)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-saathi-800 bg-white hover:bg-saathi-50 rounded-lg border border-saathi-300 transition-colors shadow-2xs"
                  title="View full evidence trail and source attribution"
                >
                  <Layers className="w-3.5 h-3.5 text-saathi-600" />
                  <span>Why?</span>
                  <ChevronRight className="w-3 h-3 text-saathi-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Supporting Actions List ── */}
      {supportingActions.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-bold text-saathi-600 uppercase tracking-wider px-1">
            Supporting Actions & Observations
          </p>
          <div className="divide-y divide-saathi-100 rounded-xl border border-saathi-100 bg-saathi-50/20">
            {supportingActions.map((act) => (
              <div
                key={act.id}
                className="p-3 flex items-start justify-between gap-3 hover:bg-white/80 transition-colors"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="p-1 rounded-md bg-white border border-saathi-100 mt-0.5 flex-shrink-0">
                    {getCategoryIcon(act.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-saathi-900">
                        {act.title}
                      </span>
                      {act.priority === 'HIGH' && getPriorityBadge(act.priority)}
                    </div>
                    <p className="text-xs text-saathi-700 mt-0.5 line-clamp-1">
                      {act.action}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {(() => {
                    const outcomes = getForAction(act.id);
                    if (outcomes.length > 0) {
                      const latest = outcomes[0];
                      return (
                        <button
                          type="button"
                          onClick={() => setOutcomeModalAction(act)}
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
                          title="View / edit outcome"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>{formatOutcomeLabel(latest.outcome)}</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        onClick={() => setOutcomeModalAction(act)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-saathi-700 hover:bg-saathi-50 rounded-md transition-colors"
                        title="Mark outcome for this action"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Outcome</span>
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => handleOpenEvidence(act)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-saathi-700 hover:text-saathi-900 hover:bg-saathi-100 rounded-lg transition-colors border border-transparent hover:border-saathi-200"
                    title="View why this action is recommended"
                  >
                    <Layers className="w-3 h-3 text-saathi-500" />
                    <span>Why?</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedAction(act)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-saathi-700 hover:text-saathi-900 hover:bg-saathi-100 rounded-lg transition-colors border border-transparent hover:border-saathi-200"
                  >
                    <span>Details</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Missing Data Banner ── */}
      {plan.dataCompleteness.status !== 'GOOD' && plan.dataCompleteness.missing.length > 0 && (
        <div className="mt-3 p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 flex items-start gap-2 text-xs text-amber-900">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">
              Plan precision is {plan.dataCompleteness.status.toLowerCase()}
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Missing farm details:{' '}
              <span className="font-medium">{plan.dataCompleteness.missing.join(', ')}</span>.
            </p>
            <Link
              to="/farm-profile"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 underline mt-1"
            >
              Complete Farm Profile →
            </Link>
          </div>
        </div>
      )}

      {/* ── Card Footer ── */}
      <div className="mt-3 pt-2.5 border-t border-saathi-100 flex items-center justify-between text-[11px] text-saathi-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-saathi-600" />
          Deterministic decision planner • 100% on-device
        </span>
        <span>
          Evaluated at{' '}
          {new Date(plan.generatedAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* ── Action Detail Modal / Drawer ── */}
      {selectedAction && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-action-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedAction(null)}
        >
          <div
            className="bg-white w-full max-w-lg rounded-2xl border border-saathi-200 shadow-xl overflow-hidden text-saathi-900 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-saathi-100 flex items-start justify-between gap-3 bg-saathi-50/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-white border border-saathi-200 shadow-xs">
                  {getCategoryIcon(selectedAction.category)}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {getPriorityBadge(selectedAction.priority)}
                    {getConfidenceBadge(selectedAction.confidence)}
                  </div>
                  <h3
                    id="modal-action-title"
                    className="text-base sm:text-lg font-bold text-saathi-900"
                  >
                    {selectedAction.title}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="p-1.5 rounded-lg text-saathi-400 hover:text-saathi-600 hover:bg-saathi-100 transition-colors"
                aria-label="Close details"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
              {/* Section 1: What to do */}
              <div>
                <span className="text-[10px] font-bold tracking-wider text-saathi-500 uppercase block mb-1">
                  What to do
                </span>
                <div className="p-3 rounded-xl bg-saathi-50/80 border border-saathi-200 font-semibold text-saathi-900">
                  {selectedAction.action}
                </div>
              </div>

              {/* Section 2: Why */}
              <div>
                <span className="text-[10px] font-bold tracking-wider text-saathi-500 uppercase block mb-1">
                  Why Saathi recommends this
                </span>
                <p className="text-saathi-700 leading-relaxed bg-white p-3 rounded-xl border border-saathi-100">
                  {selectedAction.reason}
                </p>
              </div>

              {/* Section 3: Timing */}
              {selectedAction.timing && (
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-saathi-500 uppercase block mb-1">
                    Applicable timing window
                  </span>
                  <div className="flex items-center gap-2 text-saathi-800 font-medium bg-white p-2.5 rounded-xl border border-saathi-100">
                    <Clock className="w-4 h-4 text-saathi-600" />
                    <span>{selectedAction.timing}</span>
                  </div>
                </div>
              )}

              {/* Section 4: Farm Memory Signal (Historical Observations) */}
              {(() => {
                const hist = getHistorical(selectedAction.id, selectedAction.category);
                if (hist) {
                  return (
                    <div>
                      <span className="text-[10px] font-bold tracking-wider text-saathi-600 uppercase block mb-1 flex items-center gap-1">
                        <History className="w-3.5 h-3.5" />
                        Farm Memory Signal
                      </span>
                      <div className="p-3 rounded-xl bg-saathi-50/70 border border-saathi-200 space-y-1">
                        <p className="text-xs text-saathi-900 font-medium leading-relaxed">
                          {hist.contextText}
                        </p>
                        <p className="text-[10px] text-saathi-500 italic">
                          ℹ️ {hist.disclaimer}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Section 5: Evidence Trail */}
              <div>
                <span className="text-[10px] font-bold tracking-wider text-saathi-500 uppercase block mb-1">
                  Evidence & Signal Provenance
                </span>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <ul className="list-disc list-inside space-y-1.5 text-slate-700 text-xs">
                    {selectedAction.evidence.map((item, idx) => (
                      <li key={idx} className="leading-snug">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-medium text-slate-500">Source signals:</span>
                    {selectedAction.sourceSignals.map((sig, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200"
                      >
                        {sig}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Section 6: Limitations & What is not known */}
              {selectedAction.limitations && selectedAction.limitations.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold tracking-wider text-saathi-500 uppercase block mb-1">
                    Limitations & What is unknown
                  </span>
                  <div className="p-3 rounded-xl bg-amber-50/40 border border-amber-200/60 text-amber-900 space-y-1">
                    {selectedAction.limitations.map((lim, idx) => (
                      <p key={idx} className="text-xs flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <span>{lim}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-saathi-100 bg-saathi-50/30 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  const toRecord = selectedAction;
                  setSelectedAction(null);
                  setOutcomeModalAction(toRecord);
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-saathi-300 hover:border-saathi-400 text-saathi-800 font-bold text-xs transition-colors flex items-center gap-1.5"
              >
                <FileText className="w-3.5 h-3.5 text-saathi-600" />
                <span>
                  {getForAction(selectedAction.id).length > 0
                    ? 'Update Recorded Outcome'
                    : 'Record What Happened'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="px-4 py-1.5 rounded-xl bg-saathi-600 hover:bg-saathi-700 text-white font-semibold text-xs transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Farm Outcome Record Modal ── */}
      {outcomeModalAction && (
        <FarmOutcomeModal
          action={outcomeModalAction}
          existingOutcome={
            getForAction(outcomeModalAction.id)[0] || null
          }
          isOpen={true}
          onClose={() => setOutcomeModalAction(null)}
          onSaved={() => setOutcomeModalAction(null)}
        />
      )}

      {/* ── Decision Evidence Drawer / Modal ── */}
      <DecisionEvidenceDrawer
        action={evidenceDrawerAction}
        evaluationParams={{
          farmContext: farmContext || undefined,
          weatherData: weather || undefined,
          decisionResult: decisionResult || undefined,
          diseaseAssessment: diseaseAssessment || undefined,
          diseaseResult: diseaseResult || undefined,
          marketPrices: marketPrices || undefined,
          farmActionPlan: plan,
          farmMemories: outcomes,
        }}
        isOpen={Boolean(evidenceDrawerAction)}
        onClose={() => setEvidenceDrawerAction(null)}
        onOpenSimulator={() => {
          const act = evidenceDrawerAction;
          setEvidenceDrawerAction(null);
          handleOpenSimulator(act);
        }}
      />

      {/* ── Farm Decision Simulator Modal ── */}
      <FarmDecisionSimulator
        initialScenario={simulatorScenario}
        initialAction={simulatorAction}
        evaluationParams={{
          farmContext: farmContext || undefined,
          weatherData: weather || undefined,
          decisionResult: decisionResult || undefined,
          diseaseAssessment: diseaseAssessment || undefined,
          diseaseResult: diseaseResult || undefined,
          marketPrices: marketPrices || undefined,
          farmActionPlan: plan,
          farmMemories: outcomes,
        }}
        isOpen={simulatorOpen}
        onClose={() => {
          setSimulatorOpen(false);
          setSimulatorAction(null);
        }}
        onOpenEvidence={(act) => {
          setSimulatorOpen(false);
          setEvidenceDrawerAction(act || simulatorAction || topAction || null);
        }}
      />
    </div>
  );
}
