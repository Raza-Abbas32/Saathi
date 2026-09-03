/**
 * Saathi Farm Action Outcome Modal
 *
 * Compact modal/drawer allowing the farmer to record what happened after
 * an action was recommended.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY & SCIENTIFIC DISTINCTION NOTICE:
 * All entries are stored strictly on the local device. Farmer observations
 * are preserved as subjective field reports, not scientific causal facts.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import type { FarmAction } from '../types/farmActionPlanner';
import type {
  FarmActionOutcome,
  FarmActionTaken,
  FarmActionObservedOutcome,
} from '../types/farmOutcome';
import { useFarmOutcomes } from '../hooks/useFarmOutcomes';
import { useFarmContext } from '../hooks/useFarmContext';

interface FarmOutcomeModalProps {
  action: FarmAction;
  existingOutcome?: FarmActionOutcome | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (outcome: FarmActionOutcome) => void;
}

const ACTION_TAKEN_OPTIONS: Array<{
  value: FarmActionTaken;
  label: string;
  description: string;
}> = [
  { value: 'YES', label: 'Yes', description: 'Followed the recommended action' },
  { value: 'PARTIAL', label: 'Partially', description: 'Carried out part of the action' },
  { value: 'NO', label: 'No', description: 'Did not carry out this action' },
  { value: 'NOT_SURE', label: 'Not sure', description: 'Uncertain or modified routine' },
];

const OUTCOME_OPTIONS: Array<{
  value: FarmActionObservedOutcome;
  label: string;
  badgeColor: string;
  description: string;
}> = [
  {
    value: 'IMPROVED',
    label: 'Improved',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    description: 'Crop or field condition looked visibly better',
  },
  {
    value: 'NO_CHANGE',
    label: 'No change',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
    description: 'Crop condition remained stable or unchanged',
  },
  {
    value: 'WORSE',
    label: 'Worse',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    description: 'Symptoms or field stress increased',
  },
  {
    value: 'TOO_EARLY',
    label: 'Too early to tell',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    description: 'Treatment or weather effect still unfolding',
  },
  {
    value: 'UNKNOWN',
    label: 'Unknown',
    badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
    description: 'Unable to assess outcome at this time',
  },
];

export function FarmOutcomeModal({
  action,
  existingOutcome,
  isOpen,
  onClose,
  onSaved,
}: FarmOutcomeModalProps) {
  const { recordOutcome, editOutcome } = useFarmOutcomes();
  const { farmContext } = useFarmContext();

  const [actionTaken, setActionTaken] = useState<FarmActionTaken>('YES');
  const [outcome, setOutcome] = useState<FarmActionObservedOutcome>('TOO_EARLY');
  const [observation, setObservation] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existingOutcome) {
      setActionTaken(existingOutcome.actionTaken);
      setOutcome(existingOutcome.outcome);
      setObservation(existingOutcome.observation || existingOutcome.notes || '');
      setFollowUpNeeded(Boolean(existingOutcome.followUpNeeded));
    } else {
      setActionTaken('YES');
      setOutcome('TOO_EARLY');
      setObservation('');
      setFollowUpNeeded(false);
    }
    setErrorMessage(null);
  }, [existingOutcome, isOpen, action.id]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      let saved: FarmActionOutcome | null = null;

      if (existingOutcome?.id) {
        saved = editOutcome(existingOutcome.id, {
          actionTaken,
          outcome,
          observation: observation.trim() || undefined,
          notes: observation.trim() || undefined,
          followUpNeeded,
        });
      } else {
        saved = recordOutcome({
          actionId: action.id,
          actionCategory: action.category,
          actionTitle: action.title,
          actionDescription: action.action,
          actionTaken,
          outcome,
          observation: observation.trim() || undefined,
          notes: observation.trim() || undefined,
          followUpNeeded,
          crop: farmContext?.currentCrop,
          cropStage: farmContext?.cropStage,
          district: farmContext?.district,
        });
      }

      if (saved) {
        if (onSaved) onSaved(saved);
        onClose();
      } else {
        setErrorMessage('Could not save farm outcome. Please check your input.');
      }
    } catch (err) {
      console.error('[FarmOutcomeModal] Error saving outcome:', err);
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="outcome-modal-title"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-2xl border border-saathi-200 shadow-xl overflow-hidden text-saathi-900 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-saathi-100 flex items-start justify-between gap-3 bg-saathi-50/60">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-saathi-100 text-saathi-700 mt-0.5">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-saathi-600 block">
                Farm Memory Record
              </span>
              <h3 id="outcome-modal-title" className="text-base font-bold text-saathi-900 leading-tight">
                {existingOutcome ? 'Edit Farm Outcome' : 'What Happened?'}
              </h3>
              <p className="text-xs text-saathi-600 mt-0.5 line-clamp-1">
                {action.title}: {action.action}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-saathi-400 hover:text-saathi-600 hover:bg-saathi-100 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {/* Question 1: Action Taken */}
          <div>
            <label className="block text-xs font-bold text-saathi-900 mb-1.5">
              1. Did you follow this action?
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ACTION_TAKEN_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setActionTaken(opt.value)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    actionTaken === opt.value
                      ? 'bg-saathi-500 text-white border-saathi-600 shadow-xs font-semibold'
                      : 'bg-white text-saathi-800 border-saathi-200 hover:border-saathi-300 hover:bg-saathi-50/50'
                  }`}
                >
                  <span className="block font-bold text-xs">{opt.label}</span>
                  <span
                    className={`block text-[10px] mt-0.5 leading-tight ${
                      actionTaken === opt.value ? 'text-saathi-100' : 'text-saathi-500'
                    }`}
                  >
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Observed Outcome */}
          <div>
            <label className="block text-xs font-bold text-saathi-900 mb-1.5">
              2. What happened afterward?
            </label>
            <div className="space-y-1.5">
              {OUTCOME_OPTIONS.map((opt) => {
                const isSelected = outcome === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setOutcome(opt.value)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-all ${
                      isSelected
                        ? 'bg-saathi-50 border-saathi-400 ring-1 ring-saathi-300'
                        : 'bg-white border-saathi-200 hover:border-saathi-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-saathi-900">{opt.label}</span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full border font-semibold ${opt.badgeColor}`}>
                          {opt.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-saathi-600 mt-0.5">{opt.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-saathi-600 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Question 3: Follow up check */}
          <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 flex items-start gap-2.5">
            <input
              id="followUpNeeded"
              type="checkbox"
              checked={followUpNeeded}
              onChange={(e) => setFollowUpNeeded(e.target.checked)}
              className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
            />
            <label htmlFor="followUpNeeded" className="text-xs text-amber-900 cursor-pointer">
              <span className="font-bold block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                Mark for follow-up review
              </span>
              <span className="text-[11px] text-amber-800 block mt-0.5">
                Keep a reminder tag in your farm memory to inspect the field again later.
              </span>
            </label>
          </div>

          {/* Question 4: Optional Observation Note */}
          <div>
            <label htmlFor="observation" className="block text-xs font-bold text-saathi-900 mb-1">
              3. Optional Field Observation / Note
            </label>
            <textarea
              id="observation"
              rows={2}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="e.g. Skipped spray; rain arrived 3 hours later. Crop leaf spots did not spread."
              className="w-full p-2.5 rounded-xl border border-saathi-200 text-xs focus:ring-2 focus:ring-saathi-400 focus:outline-hidden resize-none"
              maxLength={300}
            />
            <span className="text-[10px] text-saathi-400 block text-right">
              {observation.length}/300 characters
            </span>
          </div>

          {/* Error notice if any */}
          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Privacy & Agronomic Truth Notice */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-saathi-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-slate-800">Private On-Device Memory: </span>
              Observations are saved only on this phone/browser. Saathi preserves your notes as field history, not scientific causal proof.
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-saathi-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-xs font-medium text-saathi-600 hover:text-saathi-800 hover:bg-saathi-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-saathi-600 hover:bg-saathi-700 text-white font-bold text-xs transition-colors shadow-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{existingOutcome ? 'Update Outcome' : 'Save Outcome'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
