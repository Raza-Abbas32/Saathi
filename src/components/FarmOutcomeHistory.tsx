/**
 * Saathi Farm Outcome History Component (Farm Memory)
 *
 * Displays a compact, private, on-device log of historical farm actions
 * and farmer-reported outcomes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY GUARANTEE:
 * Stored 100% on device in localStorage. No external transmissions or telemetry.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import {
  History,
  Sprout,
  Bug,
  Wind,
  Droplets,
  Sun,
  Eye,
  TrendingUp,
  DollarSign,
  Info,
  Clock,
  Trash2,
  Pencil,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { useFarmOutcomes } from '../hooks/useFarmOutcomes';
import type {
  FarmActionOutcome,
  FarmOutcomeFilterCategory,
  FarmActionObservedOutcome,
  FarmActionTaken,
} from '../types/farmOutcome';
import type { FarmActionCategory } from '../types/farmActionPlanner';
import { FarmOutcomeModal } from './FarmOutcomeModal';

interface FarmOutcomeHistoryProps {
  className?: string;
  limit?: number;
  showFilters?: boolean;
}

const CATEGORY_TABS: Array<{ value: FarmOutcomeFilterCategory; label: string }> = [
  { value: 'ALL', label: 'All' },
  { value: 'SPRAYING', label: 'Spraying' },
  { value: 'DISEASE', label: 'Disease' },
  { value: 'IRRIGATION', label: 'Irrigation' },
  { value: 'WEATHER', label: 'Weather' },
  { value: 'SCOUTING', label: 'Scouting' },
  { value: 'CROP_LIFECYCLE', label: 'Crop' },
  { value: 'MARKET', label: 'Market' },
];

export function FarmOutcomeHistory({
  className = '',
  limit,
  showFilters = true,
}: FarmOutcomeHistoryProps) {
  const {
    outcomes,
    filteredOutcomes,
    filterCategory,
    setFilterCategory,
    removeOutcome,
    clearAll,
  } = useFarmOutcomes();

  const [editingOutcome, setEditingOutcome] = useState<FarmActionOutcome | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const displayedOutcomes = limit ? filteredOutcomes.slice(0, limit) : filteredOutcomes;

  const getCategoryIcon = (category: FarmActionCategory) => {
    switch (category) {
      case 'DISEASE':
        return <Bug className="w-3.5 h-3.5 text-rose-600" />;
      case 'SPRAYING':
        return <Wind className="w-3.5 h-3.5 text-amber-600" />;
      case 'IRRIGATION':
        return <Droplets className="w-3.5 h-3.5 text-blue-600" />;
      case 'WEATHER':
        return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'SCOUTING':
        return <Eye className="w-3.5 h-3.5 text-purple-600" />;
      case 'CROP_LIFECYCLE':
        return <Sprout className="w-3.5 h-3.5 text-emerald-600" />;
      case 'MARKET':
        return <TrendingUp className="w-3.5 h-3.5 text-saathi-600" />;
      case 'ECONOMIC':
        return <DollarSign className="w-3.5 h-3.5 text-emerald-700" />;
      case 'GENERAL':
      default:
        return <Info className="w-3.5 h-3.5 text-saathi-600" />;
    }
  };

  const getOutcomeBadge = (outcome: FarmActionObservedOutcome) => {
    switch (outcome) {
      case 'IMPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            Improved
          </span>
        );
      case 'NO_CHANGE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            No change
          </span>
        );
      case 'WORSE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
            Worse
          </span>
        );
      case 'TOO_EARLY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Too early to tell
          </span>
        );
      case 'UNKNOWN':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <HelpCircle className="w-3 h-3" />
            Unknown
          </span>
        );
    }
  };

  const getActionTakenLabel = (actionTaken: FarmActionTaken) => {
    switch (actionTaken) {
      case 'YES':
        return 'Followed';
      case 'PARTIAL':
        return 'Partially followed';
      case 'NO':
        return 'Did not follow';
      case 'NOT_SURE':
      default:
        return 'Not sure';
    }
  };

  const handleDelete = (id: string) => {
    removeOutcome(id);
    setDeleteConfirmId(null);
  };

  const handleClearAll = () => {
    clearAll();
    setShowClearConfirm(false);
  };

  return (
    <div
      id="farm-outcome-history-card"
      className={`bg-white rounded-2xl border border-saathi-200 shadow-sm p-4 sm:p-5 text-saathi-900 ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-saathi-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-saathi-100 flex items-center justify-center flex-shrink-0">
            <History className="w-5 h-5 text-saathi-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-saathi-900 leading-none">
                Farm Memory
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-saathi-100 text-saathi-800 border border-saathi-200">
                {outcomes.length} record{outcomes.length === 1 ? '' : 's'}
              </span>
            </div>
            <p className="text-xs text-saathi-600 mt-0.5">
              Private on-device log of your farm actions and observations
            </p>
          </div>
        </div>

        {outcomes.length > 0 && (
          <div className="flex items-center gap-2 self-end sm:self-auto">
            {showClearConfirm ? (
              <div className="flex items-center gap-1.5 bg-rose-50 p-1 rounded-lg border border-rose-200 text-xs">
                <span className="text-rose-800 text-[11px] font-medium px-1">Clear all?</span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] font-bold hover:bg-rose-700"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-0.5 bg-white text-slate-700 rounded text-[11px] hover:bg-slate-100 border border-slate-200"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="text-[11px] text-slate-400 hover:text-rose-600 transition-colors"
                title="Clear all recorded outcomes"
              >
                Clear log
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Category Filters ── */}
      {showFilters && outcomes.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORY_TABS.map((tab) => {
            const isSelected = filterCategory === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilterCategory(tab.value)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-saathi-600 text-white shadow-xs'
                    : 'bg-saathi-50 text-saathi-700 hover:bg-saathi-100 border border-saathi-200/60'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty State ── */}
      {outcomes.length === 0 ? (
        <div className="mt-4 p-6 rounded-xl border border-dashed border-saathi-200 bg-saathi-50/40 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-white border border-saathi-200 flex items-center justify-center mx-auto text-saathi-600">
            <Sprout className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold text-saathi-900">Your farm action history will appear here.</p>
          <p className="text-xs text-saathi-600 max-w-sm mx-auto leading-relaxed">
            When you follow or adapt a Saathi recommendation, record what happened. Saathi will keep a private, on-device history of your farm observations.
          </p>
        </div>
      ) : displayedOutcomes.length === 0 ? (
        <div className="mt-4 p-5 rounded-xl border border-saathi-100 bg-saathi-50/30 text-center text-xs text-saathi-600">
          No records found in category &ldquo;{filterCategory}&rdquo;.
        </div>
      ) : (
        /* ── Outcomes List ── */
        <div className="mt-3 space-y-2.5">
          {displayedOutcomes.map((item) => {
            const date = new Date(item.recordedAt);
            const dateFormatted = date.toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const isDeleting = deleteConfirmId === item.id;

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-saathi-200/80 bg-white hover:border-saathi-300 transition-all space-y-2 shadow-2xs"
              >
                {/* Item Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-saathi-50 border border-saathi-100 mt-0.5 flex-shrink-0">
                      {getCategoryIcon(item.actionCategory)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-saathi-900 leading-tight">
                          {item.actionTitle || 'Farm Action'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          • {dateFormatted}
                        </span>
                      </div>
                      {item.actionDescription && (
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-1">
                          {item.actionDescription}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions / Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingOutcome(item)}
                      className="p-1 rounded text-slate-400 hover:text-saathi-700 hover:bg-saathi-50 transition-colors"
                      title="Edit record"
                      aria-label="Edit record"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {isDeleting ? (
                      <div className="flex items-center gap-1 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 text-[10px]">
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="font-bold text-rose-700 hover:underline"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          className="text-slate-500 hover:underline ml-1"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete record"
                        aria-label="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Status Badges Row */}
                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <span className="text-[11px] font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    Action: <strong>{getActionTakenLabel(item.actionTaken)}</strong>
                  </span>

                  {getOutcomeBadge(item.outcome)}

                  {item.followUpNeeded && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Follow-up pending
                    </span>
                  )}

                  {item.crop && (
                    <span className="text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded">
                      {item.crop} {item.cropStage ? `(${item.cropStage})` : ''}
                    </span>
                  )}
                </div>

                {/* Observation / Farmer Note Bubble */}
                {item.observation && (
                  <div className="p-2.5 rounded-lg bg-saathi-50/60 border border-saathi-100 text-xs text-saathi-800">
                    <span className="text-[10px] font-bold text-saathi-600 uppercase block mb-0.5">
                      Farmer Observation:
                    </span>
                    <p className="italic leading-relaxed text-saathi-900">
                      &ldquo;{item.observation}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-3.5 pt-2.5 border-t border-saathi-100 flex items-center justify-between text-[11px] text-saathi-500">
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5 text-saathi-600" />
          Private on-device farm memory
        </span>
        <span className="text-slate-400 text-[10px]">
          Observations are subjective field context
        </span>
      </div>

      {/* ── Edit Modal ── */}
      {editingOutcome && (
        <FarmOutcomeModal
          action={{
            id: editingOutcome.actionId,
            category: editingOutcome.actionCategory,
            priority: 'MEDIUM',
            status: 'ACTION_REQUIRED',
            title: editingOutcome.actionTitle || 'Farm Action',
            action: editingOutcome.actionDescription || '',
            reason: '',
            confidence: 'HIGH',
            evidence: [],
            sourceSignals: [],
          }}
          existingOutcome={editingOutcome}
          isOpen={true}
          onClose={() => setEditingOutcome(null)}
          onSaved={() => setEditingOutcome(null)}
        />
      )}
    </div>
  );
}
