import React from 'react';
import { Calendar, Sprout, Clock, AlertCircle, Info, Tractor } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CropLifecycleContext } from '@/types/cropLifecycle';
import { evaluateCropLifecycle, getCropLifecycleContext } from '@/services/cropLifecycle';
import { useFarmContext } from '@/hooks/useFarmContext';

interface CropLifecycleCardProps {
  lifecycleContext?: CropLifecycleContext;
  className?: string;
  showProfileLink?: boolean;
}

/**
 * Format ISO date string (YYYY-MM-DD) into human-readable farmer-friendly date (e.g., "15 July 2026")
 */
function formatSowingDate(dateStr?: string): string {
  if (!dateStr) return 'Not recorded';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Capitalize first letter of qualitative phase
 */
function formatPhase(phase?: string): string {
  if (!phase || phase === 'unknown') return 'Not determined';
  return phase.charAt(0).toUpperCase() + phase.slice(1);
}

export const CropLifecycleCard: React.FC<CropLifecycleCardProps> = ({
  lifecycleContext: propContext,
  className = '',
  showProfileLink = true,
}) => {
  const { farmContext } = useFarmContext();

  // Prefer prop if provided, otherwise compute reactively from farmContext
  const context = propContext || (farmContext ? evaluateCropLifecycle(farmContext) : getCropLifecycleContext());

  const hasCrop = Boolean(context.crop);
  const hasStage = Boolean(context.currentStage);

  return (
    <div
      id="crop-lifecycle-card"
      className={`bg-white rounded-2xl border border-saathi-100 shadow-sm p-4 sm:p-5 ${className}`}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-saathi-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-saathi-50 flex items-center justify-center text-saathi-700">
            <Sprout className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-saathi-900 flex items-center gap-1.5">
              <span>Crop Lifecycle</span>
              {context.variety && (
                <span className="text-xs font-normal text-saathi-500">
                  ({context.variety})
                </span>
              )}
            </h3>
            <p className="text-xs text-saathi-600">
              {hasCrop ? (
                <span className="font-semibold text-saathi-800">{context.crop}</span>
              ) : (
                <span className="text-saathi-400 italic">No crop specified</span>
              )}
              {hasStage ? (
                <span> • {context.currentStage}</span>
              ) : (
                <span className="text-saathi-400 italic"> • Stage not selected</span>
              )}
            </p>
          </div>
        </div>

        {showProfileLink && (
          <Link
            id="crop-lifecycle-profile-link"
            to="/farm-profile"
            className="inline-flex items-center gap-1 text-xs font-medium text-saathi-600 hover:text-saathi-800 bg-saathi-50 hover:bg-saathi-100 px-2 py-1 rounded-lg transition-colors"
            title="Edit Farm Profile"
          >
            <Tractor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Farm Profile</span>
          </Link>
        )}
      </div>

      {/* ── Metric Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3.5 text-xs">
        {/* Sowing Date */}
        <div className="p-2.5 rounded-xl bg-saathi-50/50 border border-saathi-100/70">
          <span className="text-saathi-500 flex items-center gap-1 mb-1">
            <Calendar className="w-3 h-3 text-saathi-500" />
            Sown Date
          </span>
          <span className="font-semibold text-saathi-900 block truncate">
            {formatSowingDate(context.sowingDate)}
          </span>
        </div>

        {/* Days Since Sowing */}
        <div className="p-2.5 rounded-xl bg-saathi-50/50 border border-saathi-100/70">
          <span className="text-saathi-500 flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-saathi-500" />
            Days Since Sowing
          </span>
          <span className="font-semibold text-saathi-900 block truncate">
            {context.isUpcomingSowing ? (
              <span className="text-amber-700">Upcoming ({context.daysUntilSowing}d)</span>
            ) : context.daysSinceSowing !== null ? (
              `${context.daysSinceSowing} days`
            ) : (
              <span className="text-saathi-400 italic">Not available</span>
            )}
          </span>
        </div>

        {/* Qualitative Phase */}
        <div className="p-2.5 rounded-xl bg-saathi-50/50 border border-saathi-100/70 col-span-2 sm:col-span-1">
          <span className="text-saathi-500 flex items-center gap-1 mb-1">
            <Sprout className="w-3 h-3 text-saathi-500" />
            Current Phase
          </span>
          <span className="font-semibold text-saathi-900 block truncate">
            {formatPhase(context.lifecycleProgress)}
          </span>
        </div>
      </div>

      {/* ── Inconsistency / Mismatch Notice if detected ── */}
      {context.stageConsistency === 'possibly_inconsistent' && (
        <div
          id="crop-lifecycle-mismatch-notice"
          className="mt-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Stage/date mismatch noticed</span>
            <p className="mt-0.5 text-amber-800">{context.stageExplanation}</p>
            <p className="text-[11px] text-amber-700/80 mt-1 italic">
              Your selected growth stage remains the active reference. You can update your sowing date or stage anytime in your Farm Profile.
            </p>
          </div>
        </div>
      )}

      {/* ── Contextual Lifecycle Notes ── */}
      {context.lifecycleNotes.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {context.lifecycleNotes.map((note, idx) => (
            <p key={idx} className="text-xs text-saathi-700 flex items-start gap-1.5">
              <span className="text-saathi-400 font-bold">•</span>
              <span>{note}</span>
            </p>
          ))}
        </div>
      )}

      {/* ── Source of Truth & Privacy Footer ── */}
      <div className="mt-3.5 pt-2.5 border-t border-saathi-100 flex items-center justify-between text-[11px] text-saathi-500">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-saathi-400" />
          Stage source: Farm Profile
        </span>
        <span>Local & Private</span>
      </div>
    </div>
  );
};

export default CropLifecycleCard;
