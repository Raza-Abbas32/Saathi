import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  CheckCircle2,
  ShieldCheck,
  Sprout,
  Droplets,
  Wind,
  AlertCircle,
} from 'lucide-react';
import type { FarmWatchEvent, FarmWatchFollowUpInput } from '../types/farmWatch';

interface FarmWatchFollowUpProps {
  event: FarmWatchEvent;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: FarmWatchFollowUpInput) => void;
  crop?: string;
  cropStage?: string;
  district?: string;
}

export function FarmWatchFollowUp({
  event,
  isOpen,
  onClose,
  onSubmit,
  crop,
  cropStage,
  district,
}: FarmWatchFollowUpProps) {
  const [affected, setAffected] = useState<'YES' | 'NO' | 'NOT_SURE'>('YES');
  const [impactCategory, setImpactCategory] = useState<
    'CROP' | 'SPRAY_WORK' | 'IRRIGATION' | 'NO_VISIBLE_IMPACT' | 'OTHER'
  >('SPRAY_WORK');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      onSubmit({
        eventId: event.id,
        affected,
        impactCategory: affected === 'YES' ? impactCategory : 'NO_VISIBLE_IMPACT',
        note: note.trim() || undefined,
        crop,
        cropStage,
        district,
      });
      onClose();
    } catch (err) {
      console.error('[FarmWatchFollowUp] Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div
        id="farm-watch-followup-modal"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-saathi-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-saathi-50 border-b border-saathi-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-saathi-600 text-white rounded-lg">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-saathi-900">
                What happened on your farm?
              </h3>
              <p className="text-xs text-saathi-600">
                Help Saathi remember your field experience
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-saathi-400 hover:text-saathi-600 p-1.5 rounded-lg hover:bg-saathi-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Event Context Card */}
          <div className="p-3.5 rounded-xl bg-saathi-50/70 border border-saathi-200">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold text-saathi-700 uppercase tracking-wider">
                Event Detected
              </span>
              <span className="text-[11px] text-saathi-500">• {event.source}</span>
            </div>
            <h4 className="text-sm font-bold text-saathi-900">{event.title}</h4>
            <p className="text-xs text-saathi-600 mt-0.5">{event.summary}</p>
          </div>

          {/* Question 1: Did it affect your farm? */}
          <div>
            <label className="block text-xs font-bold text-saathi-900 uppercase tracking-wide mb-2">
              Did this event affect your farm or planned work?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                id="btn-affected-yes"
                onClick={() => setAffected('YES')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                  affected === 'YES'
                    ? 'bg-saathi-600 text-white border-saathi-600 shadow-xs'
                    : 'bg-white text-saathi-700 border-saathi-200 hover:bg-saathi-50'
                }`}
              >
                Yes, it affected
              </button>
              <button
                type="button"
                id="btn-affected-no"
                onClick={() => setAffected('NO')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                  affected === 'NO'
                    ? 'bg-saathi-600 text-white border-saathi-600 shadow-xs'
                    : 'bg-white text-saathi-700 border-saathi-200 hover:bg-saathi-50'
                }`}
              >
                No impact
              </button>
              <button
                type="button"
                id="btn-affected-not-sure"
                onClick={() => setAffected('NOT_SURE')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold border transition ${
                  affected === 'NOT_SURE'
                    ? 'bg-saathi-600 text-white border-saathi-600 shadow-xs'
                    : 'bg-white text-saathi-700 border-saathi-200 hover:bg-saathi-50'
                }`}
              >
                Not sure yet
              </button>
            </div>
          </div>

          {/* Question 2: What was affected? (Only if YES) */}
          {affected === 'YES' && (
            <div className="animate-fade-in">
              <label className="block text-xs font-bold text-saathi-900 uppercase tracking-wide mb-2">
                What was affected?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'SPRAY_WORK', label: 'Spray / Field Work', icon: Wind },
                  { id: 'IRRIGATION', label: 'Irrigation / Water', icon: Droplets },
                  { id: 'CROP', label: 'Crop Condition', icon: Sprout },
                  { id: 'OTHER', label: 'Other', icon: AlertCircle },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = impactCategory === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        setImpactCategory(
                          item.id as 'CROP' | 'SPRAY_WORK' | 'IRRIGATION' | 'OTHER'
                        )
                      }
                      className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-medium border text-left transition ${
                        isSelected
                          ? 'bg-saathi-50 text-saathi-900 border-saathi-500 ring-1 ring-saathi-500'
                          : 'bg-white text-saathi-700 border-saathi-200 hover:bg-saathi-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-saathi-600 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Optional Observation Note */}
          <div>
            <label className="block text-xs font-bold text-saathi-900 uppercase tracking-wide mb-1.5">
              Field Notes (Optional)
            </label>
            <textarea
              id="input-followup-notes"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Rain delayed chemical spray on North field; soil still damp."
              rows={2}
              className="w-full text-xs rounded-xl border border-saathi-200 p-2.5 focus:border-saathi-500 focus:ring-1 focus:ring-saathi-500 outline-none placeholder:text-saathi-400"
            />
          </div>

          {/* Privacy & Agronomic Note */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-saathi-50 border border-saathi-100 text-[11px] text-saathi-700">
            <ShieldCheck className="w-4 h-4 text-saathi-600 shrink-0" />
            <span>
              Recorded locally as a <strong>farmer-reported observation</strong> in your private Farm Memory.
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-saathi-700 hover:bg-saathi-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-submit-followup"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-saathi-600 text-white hover:bg-saathi-700 shadow-xs transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              Save to Farm Memory
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
