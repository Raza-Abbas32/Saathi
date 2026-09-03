import { useState } from 'react';
import {
  Tractor,
  MapPin,
  Pencil,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import FarmProfileForm from '@/components/FarmProfileForm';
import FarmDecisionCard from '@/components/FarmDecisionCard';
import CropLifecycleCard from '@/components/CropLifecycleCard';
import { FarmOutcomeHistory } from '@/components/FarmOutcomeHistory';
import { useFarmContext } from '@/hooks/useFarmContext';

export default function FarmProfilePage() {
  const { farmContext, hasFarm } = useFarmContext();
  const [isEditing, setIsEditing] = useState(!hasFarm);

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-saathi-900 tracking-tight flex items-center gap-2.5">
            <Tractor className="w-7 h-7 text-saathi-600" />
            Farm Profile
          </h1>
          <p className="text-saathi-600 text-sm mt-1">
            Manage your farm memory, crop stage, and field characteristics locally.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasFarm && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary text-sm px-4 py-2"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Summary View when Farm is already saved and not in edit mode */}
      {hasFarm && !isEditing && farmContext && (
        <div className="hero-card space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-saathi-500 text-white flex items-center justify-center text-xl font-bold">
                <Tractor className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-saathi-900">
                  {farmContext.farmName || 'My Farm'}
                </h2>
                <div className="flex items-center gap-1.5 text-saathi-600 text-xs mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-saathi-400" />
                  <span>
                    {[farmContext.tehsil, farmContext.district, farmContext.province]
                      .filter(Boolean)
                      .join(', ') || 'Pakistan'}
                  </span>
                </div>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3" />
              Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100">
              <span className="text-saathi-500 block mb-1">Cultivated Size</span>
              <span className="text-sm font-bold text-saathi-900">
                {farmContext.farmSizeAcres ? `${farmContext.farmSizeAcres} Acres` : 'Not specified'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100">
              <span className="text-saathi-500 block mb-1">Current Crop</span>
              <span className="text-sm font-bold text-saathi-900">
                {farmContext.currentCrop || 'None selected'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100">
              <span className="text-saathi-500 block mb-1">Crop Stage</span>
              <span className="text-sm font-bold text-saathi-900">
                {farmContext.cropStage || 'Not specified'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100">
              <span className="text-saathi-500 block mb-1">Soil Texture</span>
              <span className="text-sm font-bold text-saathi-900">
                {farmContext.soilType || 'Unknown'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100">
              <span className="text-saathi-500 block mb-1">Water Source</span>
              <span className="text-sm font-bold text-saathi-900">
                {farmContext.waterSource || 'Canal'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-saathi-50/60 border border-saathi-100">
              <span className="text-saathi-500 block mb-1">Coordinates</span>
              <span className="text-sm font-bold text-saathi-900 font-mono">
                {farmContext.latitude?.toFixed(2)}°, {farmContext.longitude?.toFixed(2)}°
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-saathi-100 flex items-center justify-between text-xs text-saathi-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-saathi-600" />
              Stored locally on this device
            </span>
            <button
              onClick={() => setIsEditing(true)}
              className="text-saathi-600 hover:text-saathi-800 font-semibold"
            >
              Update Details →
            </button>
          </div>
        </div>
      )}

      {/* Crop Lifecycle Intelligence Summary */}
      {hasFarm && !isEditing && (
        <CropLifecycleCard showProfileLink={false} />
      )}

      {/* Decision Engine Card for Saved Farm */}
      {hasFarm && !isEditing && (
        <FarmDecisionCard />
      )}

      {/* Farm Action Outcome & Learning History */}
      {hasFarm && !isEditing && (
        <FarmOutcomeHistory showFilters={true} />
      )}

      {/* Form view */}
      {(!hasFarm || isEditing) && (
        <FarmProfileForm
          onSaved={() => setIsEditing(false)}
          showCardWrapper={true}
        />
      )}
    </div>
  );
}
