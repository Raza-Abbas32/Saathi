/**
 * Saathi Decision Evidence Drawer / Modal
 *
 * Dedicated explainability component answering "Why did Saathi recommend this?"
 * Displays the factual evidence chain, source attribution, and transparent limitations.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 TRANSPARENCY & SCIENTIFIC INTEGRITY:
 * 1. 100% deterministic local evidence attribution.
 * 2. Cites exact data sources (Open-Meteo, AMIS Punjab, Farm Context, etc.).
 * 3. Clearly labels Farm Memory as subjective historical farmer observations.
 * 4. Highlights data limitations and uncertainty without making causal leaps.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  X,
  ShieldCheck,
  AlertCircle,
  Droplets,
  Sun,
  Bug,
  Sprout,
  TrendingUp,
  DollarSign,
  FileText,
  Info,
  Layers,
  Sparkles,
} from 'lucide-react';
import type { DecisionEvidence, DecisionEvidenceReport, EvidenceCategory } from '../types/decisionEvidence';
import type { FarmAction } from '../types/farmActionPlanner';
import { generateDecisionEvidenceReport } from '../services/decisionEvidence';
import type { EvaluateScenarioParams } from '../types/farmDecisionSimulator';

interface DecisionEvidenceDrawerProps {
  action?: FarmAction | null;
  report?: DecisionEvidenceReport | null;
  evaluationParams?: EvaluateScenarioParams;
  isOpen: boolean;
  onClose: () => void;
  onOpenSimulator?: () => void;
}

export function DecisionEvidenceDrawer({
  action,
  report: providedReport,
  evaluationParams,
  isOpen,
  onClose,
  onOpenSimulator,
}: DecisionEvidenceDrawerProps) {
  if (!isOpen) return null;

  // Build report if not provided directly
  const report: DecisionEvidenceReport =
    providedReport ||
    (action
      ? generateDecisionEvidenceReport(action, evaluationParams || {})
      : {
          targetTitle: 'Farm Intelligence Assessment',
          targetRecommendation: 'Available field recommendations',
          overallConfidence: 'MEDIUM',
          evidenceItems: [],
          limitations: ['Grounded in current local signals.'],
          generatedAt: new Date().toISOString(),
        });

  const getCategoryIcon = (category: EvidenceCategory) => {
    switch (category) {
      case 'WEATHER':
        return <Sun className="w-4 h-4 text-amber-600" />;
      case 'DISEASE':
        return <Bug className="w-4 h-4 text-rose-600" />;
      case 'CROP_LIFECYCLE':
        return <Sprout className="w-4 h-4 text-emerald-600" />;
      case 'MARKET':
        return <TrendingUp className="w-4 h-4 text-saathi-700" />;
      case 'ECONOMIC':
        return <DollarSign className="w-4 h-4 text-emerald-700" />;
      case 'FARM_MEMORY':
        return <FileText className="w-4 h-4 text-purple-600" />;
      case 'FARM_CONTEXT':
        return <Droplets className="w-4 h-4 text-blue-600" />;
      case 'ACTION_PLAN':
      default:
        return <Info className="w-4 h-4 text-saathi-600" />;
    }
  };

  const getRelevanceBadge = (relevance: DecisionEvidence['relevance']) => {
    switch (relevance) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-50 text-rose-700 border border-rose-200">
            High Relevance
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            Moderate
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-50 text-slate-600 border border-slate-200">
            Contextual
          </span>
        );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="evidence-drawer-title"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl border border-saathi-200 shadow-2xl overflow-hidden text-saathi-900 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-saathi-100 flex items-start justify-between gap-3 bg-saathi-50/70">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-white border border-saathi-200 shadow-xs text-saathi-700 mt-0.5">
              <Layers className="w-5 h-5 text-saathi-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-saathi-100 text-saathi-800 border border-saathi-200">
                  Decision Evidence Trail
                </span>
                <span className="text-[11px] text-saathi-600 font-medium">
                  Confidence:{' '}
                  <strong className="text-saathi-900">{report.overallConfidence}</strong>
                </span>
              </div>
              <h2
                id="evidence-drawer-title"
                className="text-base sm:text-lg font-bold text-saathi-900"
              >
                Why Saathi Recommends This
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-saathi-400 hover:text-saathi-700 hover:bg-saathi-100 transition-colors"
            aria-label="Close evidence view"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Recommendation Spotlight */}
        <div className="px-4 sm:px-5 py-3.5 bg-emerald-50/70 border-b border-emerald-100 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">
              Recommendation
            </p>
            <p className="text-sm font-bold text-emerald-950 mt-0.5">
              {report.targetTitle}
            </p>
            <p className="text-xs text-emerald-800 mt-0.5">
              {report.targetRecommendation}
            </p>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 text-xs sm:text-sm">
          {/* 1. Evidence Chain Flow */}
          {report.evidenceChain && report.evidenceChain.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-saathi-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-saathi-600" />
                Evidence-to-Decision Chain
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {report.evidenceChain.map((step, idx) => (
                  <div key={idx} className="relative flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-saathi-500">
                        Step {idx + 1}: {step.label}
                      </span>
                      <p className="text-xs font-semibold text-saathi-900 mt-1 line-clamp-3">
                        {step.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Verifiable Evidence Items */}
          <div>
            <h3 className="text-xs font-bold text-saathi-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>Contributing Signals & Sources ({report.evidenceItems.length})</span>
              <span className="text-[10px] font-normal text-saathi-500">100% factual citations</span>
            </h3>

            {report.evidenceItems.length === 0 ? (
              <p className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 text-center">
                No specific environmental signals recorded for this action.
              </p>
            ) : (
              <div className="space-y-2.5">
                {report.evidenceItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-saathi-100 bg-white hover:border-saathi-300 transition-colors shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1.5 rounded-lg bg-saathi-50 border border-saathi-100">
                          {getCategoryIcon(item.category)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-saathi-900">
                            {item.title}
                          </h4>
                          <span className="text-[10px] text-saathi-500">
                            Source: <strong className="text-saathi-700">{item.source}</strong>
                            {item.sourceDate && ` (${item.sourceDate})`}
                            {item.metadata?.official && (
                              <span className="ml-1 text-emerald-700 font-bold">✓ Official</span>
                            )}
                          </span>
                        </div>
                      </div>
                      {getRelevanceBadge(item.relevance)}
                    </div>

                    {/* Observation & Implication */}
                    <div className="pl-7 space-y-1 text-xs">
                      <p className="text-saathi-800">
                        <strong className="text-saathi-900">Observation:</strong>{' '}
                        {item.observation}
                      </p>
                      <p className="text-saathi-700">
                        <strong className="text-saathi-900">Agronomic Implication:</strong>{' '}
                        {item.implication}
                      </p>

                      {/* Farmer report badge */}
                      {item.metadata?.isFarmerReport && (
                        <div className="mt-1 p-1.5 rounded-md bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                          <span>
                            <strong>Farmer-reported observation:</strong> Preserved as historical context; not verified laboratory proof.
                          </span>
                        </div>
                      )}

                      {/* Item limitations */}
                      {item.limitation && !item.metadata?.isFarmerReport && (
                        <p className="text-[10px] text-saathi-500 italic mt-0.5">
                          Note: {item.limitation}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Transparent Limitations */}
          {report.limitations && report.limitations.length > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>Transparent Scientific Limitations</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900/90 pl-1">
                {report.limitations.map((lim, idx) => (
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
            Deterministic Local Explainability Engine
          </span>

          <div className="flex items-center gap-2">
            {onOpenSimulator && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSimulator();
                }}
                className="px-3 py-1.5 text-xs font-bold text-saathi-800 bg-white hover:bg-saathi-100 rounded-lg border border-saathi-300 transition-colors shadow-xs"
              >
                Compare Options →
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-bold text-white bg-saathi-700 hover:bg-saathi-800 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
