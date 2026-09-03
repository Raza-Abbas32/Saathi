/**
 * Saathi Farm Decision Simulator Component
 *
 * Provides a mobile-first, side-by-side comparison of realistic farm actions
 * (e.g. "Should I spray tonight?", "Should I irrigate now?", "Should I sell now?")
 * grounded purely in deterministic local evidence.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 SCIENTIFIC BOUNDARIES & PRIVACY:
 * 1. 100% on-device deterministic comparison. ZERO external API / Gemini requests.
 * 2. ZERO fabricated numbers (no fake ROI, yield %, or efficacy probabilities).
 * 3. Transparent uncertainty: does not force recommendations when signals are absent.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  Wind,
  Droplets,
  TrendingUp,
  Info,
  CheckCircle2,
  Sparkles,
  Layers,
} from 'lucide-react';
import type {
  DecisionScenarioType,
  DecisionScenarioResult,
  EvaluateScenarioParams,
  OptionSupport,
} from '../types/farmDecisionSimulator';
import { evaluateDecisionScenario } from '../services/farmDecisionSimulator';
import type { FarmAction } from '../types/farmActionPlanner';

interface FarmDecisionSimulatorProps {
  initialScenario?: DecisionScenarioType;
  initialAction?: FarmAction | null;
  evaluationParams?: EvaluateScenarioParams;
  isOpen: boolean;
  onClose: () => void;
  onOpenEvidence?: (action?: FarmAction | null) => void;
}

const SCENARIOS: Array<{
  type: DecisionScenarioType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}> = [
  {
    type: 'SPRAYING',
    label: 'Spraying Window',
    shortLabel: 'Spraying',
    icon: <Wind className="w-3.5 h-3.5" />,
  },
  {
    type: 'IRRIGATION',
    label: 'Irrigation Need',
    shortLabel: 'Irrigation',
    icon: <Droplets className="w-3.5 h-3.5" />,
  },
  {
    type: 'MARKET',
    label: 'Market & Selling',
    shortLabel: 'Market',
    icon: <TrendingUp className="w-3.5 h-3.5" />,
  },
  {
    type: 'GENERAL',
    label: 'General Priority',
    shortLabel: 'Action',
    icon: <Info className="w-3.5 h-3.5" />,
  },
];

export function FarmDecisionSimulator({
  initialScenario,
  initialAction,
  evaluationParams,
  isOpen,
  onClose,
  onOpenEvidence,
}: FarmDecisionSimulatorProps) {
  const [activeScenario, setActiveScenario] = useState<DecisionScenarioType>(
    initialScenario || (initialAction?.category === 'SPRAYING' ? 'SPRAYING' : initialAction?.category === 'IRRIGATION' ? 'IRRIGATION' : initialAction?.category === 'MARKET' ? 'MARKET' : 'SPRAYING')
  );

  const simulationResult: DecisionScenarioResult = useMemo(() => {
    return evaluateDecisionScenario({
      ...(evaluationParams || {}),
      scenarioType: activeScenario,
      farmAction: initialAction,
    });
  }, [activeScenario, evaluationParams, initialAction]);

  if (!isOpen) return null;

  const recommendedOption = simulationResult.options.find(
    (opt) => opt.id === simulationResult.recommendedOptionId
  );

  const otherOptions = simulationResult.options.filter(
    (opt) => opt.id !== simulationResult.recommendedOptionId
  );

  const getSupportBadge = (support: OptionSupport) => {
    switch (support) {
      case 'SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Well Supported
          </span>
        );
      case 'CAUTION':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Caution / Conditional
          </span>
        );
      case 'NOT_SUPPORTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <X className="w-3 h-3 text-rose-600" />
            Not Favorable
          </span>
        );
      case 'INSUFFICIENT_DATA':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Info className="w-3 h-3 text-slate-500" />
            Insufficient Data
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="simulator-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-2xl border border-saathi-200 shadow-2xl overflow-hidden text-saathi-900 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-saathi-100 flex items-start justify-between gap-3 bg-saathi-50/70">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white border border-saathi-200 shadow-xs text-saathi-700 mt-0.5">
              <Sparkles className="w-5 h-5 text-saathi-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-saathi-100 text-saathi-800 border border-saathi-200">
                  Decision Simulator
                </span>
                <span className="text-[11px] text-saathi-600 font-medium">
                  {simulationResult.contextSummary}
                </span>
              </div>
              <h2
                id="simulator-modal-title"
                className="text-base sm:text-lg font-bold text-saathi-900"
              >
                {simulationResult.question}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-saathi-400 hover:text-saathi-700 hover:bg-saathi-100 transition-colors"
            aria-label="Close decision simulator"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="px-4 sm:px-5 py-2.5 bg-saathi-50/30 border-b border-saathi-100 flex items-center gap-1.5 overflow-x-auto">
          {SCENARIOS.map((sc) => {
            const isActive = activeScenario === sc.type;
            return (
              <button
                key={sc.type}
                type="button"
                onClick={() => {
                  setActiveScenario(sc.type);
                  setSelectedOptionId(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-saathi-700 text-white shadow-xs'
                    : 'bg-white text-saathi-700 border border-saathi-200 hover:bg-saathi-100'
                }`}
              >
                {sc.icon}
                <span>{sc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Section 1: Recommended Option / Honest Uncertainty */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-saathi-700 uppercase tracking-wider">
                Saathi Evaluation
              </span>
              <span className="text-[10px] text-saathi-500">
                Evidence Confidence: <strong>{simulationResult.confidence}</strong>
              </span>
            </div>

            {recommendedOption ? (
              <div className="p-4 rounded-xl border-2 border-emerald-500 bg-emerald-50/50 shadow-xs space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white shadow-2xs mb-1">
                      <CheckCircle2 className="w-3 h-3" />
                      BEST SUPPORTED RIGHT NOW
                    </span>
                    <h3 className="text-base font-bold text-emerald-950">
                      {recommendedOption.label}
                    </h3>
                  </div>
                  {getSupportBadge(recommendedOption.support)}
                </div>

                <p className="text-xs text-emerald-900 font-medium">
                  {recommendedOption.description}
                </p>

                {/* Key rationale bullet points */}
                {recommendedOption.keyPoints && recommendedOption.keyPoints.length > 0 && (
                  <div className="p-3 rounded-lg bg-white/90 border border-emerald-200 text-xs space-y-1">
                    <p className="font-bold text-emerald-950 text-[11px] uppercase tracking-wider">
                      Why this option is favored:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-emerald-900">
                      {recommendedOption.keyPoints.map((pt, idx) => (
                        <li key={idx}>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl border border-amber-300 bg-amber-50/70 shadow-xs space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold">
                  <AlertCircle className="w-5 h-5 text-amber-700 flex-shrink-0" />
                  <span>Not enough information to recommend one option confidently</span>
                </div>
                <p className="text-xs text-amber-900/90">
                  {simulationResult.recommendationReason}
                </p>
                <p className="text-[11px] text-amber-800 italic">
                  Saathi never forces recommendations or manufactures speculative numbers.
                </p>
              </div>
            )}
          </div>

          {/* Section 2: Compared Alternative Options */}
          <div>
            <h3 className="text-xs font-bold text-saathi-700 uppercase tracking-wider mb-2.5">
              Compare Other Available Options ({otherOptions.length})
            </h3>

            <div className="space-y-2.5">
              {otherOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="p-3.5 rounded-xl border border-saathi-200 bg-white hover:border-saathi-400 transition-colors shadow-2xs space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-saathi-900">
                        {opt.label}
                      </h4>
                      <p className="text-xs text-saathi-700 mt-0.5">
                        {opt.description}
                      </p>
                    </div>
                    {getSupportBadge(opt.support)}
                  </div>

                  {opt.keyPoints && opt.keyPoints.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-saathi-700 space-y-0.5 pl-1">
                      {opt.keyPoints.map((kp, idx) => (
                        <li key={idx}>{kp}</li>
                      ))}
                    </ul>
                  )}

                  {opt.limitations && opt.limitations.length > 0 && (
                    <p className="text-[10px] text-saathi-500 italic">
                      Caution: {opt.limitations[0]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Limitations & Provenance */}
          {simulationResult.limitations && simulationResult.limitations.length > 0 && (
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px] uppercase tracking-wider">
                <Info className="w-3.5 h-3.5 text-slate-600" />
                <span>Simulation Limitations</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600">
                {simulationResult.limitations.map((lim, idx) => (
                  <li key={idx}>{lim}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 border-t border-saathi-100 flex items-center justify-between gap-3 bg-saathi-50/60">
          <span className="text-[11px] text-saathi-500 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-saathi-600" />
            Deterministic Local Engine • Zero AI Telemetry
          </span>

          <div className="flex items-center gap-2">
            {onOpenEvidence && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEvidence(initialAction);
                }}
                className="px-3 py-1.5 text-xs font-bold text-saathi-800 bg-white hover:bg-saathi-100 rounded-lg border border-saathi-300 transition-colors shadow-xs flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-saathi-600" />
                <span>Why this choice?</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-white bg-saathi-700 hover:bg-saathi-800 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
