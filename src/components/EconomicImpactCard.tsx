import { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lock,
  Building2,
  Scale,
} from 'lucide-react';
import { useFarmDecision } from '@/hooks/useFarmDecision';
import { getCropPrices } from '@/services/api';
import {
  evaluateEconomicImpact,
  formatPKR,
  formatPKRRange,
} from '@/services/economicImpactEngine';
import type { NormalizedMarketCropPrice } from '@/types/market';
import type { DiseaseWeatherAssessment } from '@/types/diseaseWeather';
import type { FarmDecisionResult } from '@/types/decision';

interface EconomicImpactCardProps {
  cropOverride?: string;
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  decisionResult?: FarmDecisionResult | null;
  className?: string;
  defaultQuantityMaunds?: number | null;
  defaultInterventionCostPkr?: number | null;
  showCardTitle?: boolean;
}

export default function EconomicImpactCard({
  cropOverride,
  diseaseAssessment,
  decisionResult: propDecisionResult,
  className = '',
  defaultQuantityMaunds = null,
  defaultInterventionCostPkr = null,
  showCardTitle = true,
}: EconomicImpactCardProps) {
  const { farmContext, decisionResult: hookDecisionResult } = useFarmDecision();
  const decisionResult = propDecisionResult || hookDecisionResult;

  const [marketPrices, setMarketPrices] = useState<NormalizedMarketCropPrice[]>([]);
  const [showTransparency, setShowTransparency] = useState<boolean>(false);

  // Farmer editable inputs
  const [quantityInput, setQuantityInput] = useState<string>(
    defaultQuantityMaunds ? String(defaultQuantityMaunds) : ''
  );
  const [costInput, setCostInput] = useState<string>(
    defaultInterventionCostPkr ? String(defaultInterventionCostPkr) : ''
  );
  const [showInputForm, setShowInputForm] = useState<boolean>(false);

  // Load existing government market prices from cached service
  useEffect(() => {
    let isMounted = true;
    async function loadPrices() {
      try {
        const data = await getCropPrices(false);
        if (isMounted) {
          setMarketPrices(data.prices || []);
        }
      } catch (err) {
        console.warn('[EconomicImpactCard] Failed to load market prices:', err);
      }
    }
    loadPrices();
    return () => {
      isMounted = false;
    };
  }, []);

  const parsedQuantity = useMemo(() => {
    const trimmed = quantityInput.trim();
    if (!trimmed) return null;
    const val = parseFloat(trimmed);
    return isNaN(val) ? null : val;
  }, [quantityInput]);

  const parsedCost = useMemo(() => {
    const trimmed = costInput.trim();
    if (!trimmed) return null;
    const val = parseFloat(trimmed);
    return isNaN(val) ? null : val;
  }, [costInput]);

  // Evaluate deterministic economic impact
  const economicResult = useMemo(() => {
    const effectiveFarmContext = cropOverride
      ? { ...farmContext, currentCrop: cropOverride }
      : farmContext;

    return evaluateEconomicImpact({
      farmContext: effectiveFarmContext,
      cropLifecycleContext: decisionResult?.lifecycleContext,
      decisionResult,
      diseaseAssessment,
      marketPrices,
      farmerInput: {
        quantityValue: parsedQuantity,
        quantityUnit: 'maunds',
        interventionCostPkr: parsedCost,
        interventionCostBasis: 'Farmer-entered intervention cost',
      },
    });
  }, [
    cropOverride,
    farmContext,
    decisionResult,
    diseaseAssessment,
    marketPrices,
    parsedQuantity,
    parsedCost,
  ]);

  const {
    crop,
    market,
    marketPrice,
    quantity,
    estimatedGrossValue,
    riskExposure,
    potentialLossAvoided,
    netPotentialImpact,
    decisionContext,
    confidence,
    transparency,
    sourceRecords,
  } = economicResult;

  const confidenceBadge = {
    HIGH: { label: 'High Confidence', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    MEDIUM: { label: 'Medium Confidence', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    LOW: { label: 'Low Confidence (Partial)', color: 'bg-amber-50 text-amber-800 border-amber-200' },
    NOT_ENOUGH_DATA: { label: 'Pending Inputs', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  }[confidence];

  return (
    <div
      id="saathi-economic-impact-card"
      className={`rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-sm transition-all ${className}`}
    >
      {/* ── Card Header ── */}
      {showCardTitle && (
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700 flex-shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-900">
                  Economic Impact Intelligence
                </h3>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${confidenceBadge.color}`}>
                  {confidenceBadge.label}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                What could this decision mean financially?
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowInputForm(!showInputForm)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50/70 hover:bg-emerald-100/70 px-2.5 py-1 rounded-lg transition-colors"
          >
            {showInputForm ? 'Close Inputs' : parsedQuantity ? 'Edit Quantity' : '+ Add Quantity'}
          </button>
        </div>
      )}

      {/* ── Optional Farmer Quantity / Cost Input Row ── */}
      {showInputForm && (
        <div className="mt-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800">Your Harvest & Cost Parameters:</span>
            <span className="text-[10px] text-slate-500">Stored locally on your device</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Expected Production Quantity (Maunds / 40kg):
              </label>
              <input
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 100"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Intervention Cost (PKR, optional):
              </label>
              <input
                type="number"
                min="0"
                step="100"
                placeholder="e.g. 2500"
                value={costInput}
                onChange={(e) => setCostInput(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic">
            Yield is never assumed from acreage alone. Providing your expected maunds enables exact gross valuation.
          </p>
        </div>
      )}

      {/* ── Core Market & Value Grid ── */}
      <div className="pt-3.5 space-y-3">
        {/* Row 1: Crop & Official Market Source */}
        <div className="flex items-start justify-between gap-2 p-3 rounded-xl bg-slate-50/70 border border-slate-200/70">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Reference Mandi</span>
            </div>
            <p className="text-xs sm:text-sm font-bold text-slate-900">
              {crop || 'Farm Crop'} • {market || 'Punjab Mandis'}
            </p>
            {marketPrice && (
              <p className="text-[11px] text-slate-600">
                AMIS FQP:{' '}
                <strong className="text-slate-800 font-semibold">{formatPKR(marketPrice.value)} / 40kg</strong>
                {marketPrice.min && marketPrice.max && (
                  <span className="text-slate-500 ml-1">
                    (Range: {formatPKRRange(marketPrice.min, marketPrice.max)})
                  </span>
                )}
              </p>
            )}
          </div>

          <div className="text-right flex-shrink-0">
            {marketPrice?.isOfficial ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                AMIS Official
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                Illustrative
              </span>
            )}
            <p className="text-[10px] text-slate-500 mt-1">
              Reported: {marketPrice?.reportedDate || 'Recent'}
            </p>
          </div>
        </div>

        {/* Row 2: Financial Estimates Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Tile A: Estimated Gross Market Value */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700">Estimated Gross Market Value</span>
              <span className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                {estimatedGrossValue?.value ? 'Calculated Estimate' : 'Insufficient Data'}
              </span>
            </div>

            {estimatedGrossValue?.value ? (
              <div>
                <p className="text-base sm:text-lg font-bold text-emerald-700">
                  {formatPKR(estimatedGrossValue.value)}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Range: {formatPKRRange(estimatedGrossValue.min, estimatedGrossValue.max)}
                </p>
                <p className="text-[10px] text-slate-400 mt-1 italic">
                  Based on {quantity?.value} maunds at reported wholesale rate.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-500">Unavailable</p>
                <p className="text-[11px] text-slate-500">
                  {quantity?.note || 'Expected production quantity has not been provided.'}
                </p>
                {!showInputForm && (
                  <button
                    type="button"
                    onClick={() => setShowInputForm(true)}
                    className="text-[11px] font-semibold text-emerald-700 hover:underline pt-0.5"
                  >
                    + Enter expected maunds to calculate
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tile B: Risk Exposure & Loss Assessment */}
          <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                Financial Exposure
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                riskExposure?.status === 'QUANTIFIABLE'
                  ? 'text-amber-700 bg-amber-50 border-amber-100'
                  : 'text-slate-500 bg-slate-50 border-slate-200'
              }`}>
                {riskExposure?.status === 'QUANTIFIABLE' ? 'Calculated Risk Signal' : 'Unquantifiable'}
              </span>
            </div>

            {riskExposure?.status === 'QUANTIFIABLE' ? (
              <div>
                <p className="text-base sm:text-lg font-bold text-amber-700">
                  {formatPKRRange(riskExposure.min, riskExposure.max)}
                </p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {riskExposure.basis}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-600">Not quantifiable yet</p>
                <p className="text-[11px] text-slate-500 leading-snug">
                  {riskExposure?.reason || 'No validated crop-loss percentage is available.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Decision Relevance */}
        {decisionContext?.sprayingRelevance && (
          <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-950 flex items-start gap-2">
            <Scale className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">
              <strong className="font-semibold">Financial Relevance: </strong>
              {decisionContext.sprayingRelevance}
            </p>
          </div>
        )}

        {/* Row 4: Potential Loss Avoided (When Validated) */}
        {potentialLossAvoided?.status === 'QUANTIFIABLE' && (
          <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 text-xs">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold text-blue-950">Potential Loss Avoided:</span>
              <span className="text-[10px] text-blue-800 font-semibold bg-blue-100/70 px-1.5 py-0.5 rounded border border-blue-200">
                Calculated Estimate
              </span>
            </div>
            <p className="text-base font-bold text-blue-900">
              {formatPKRRange(potentialLossAvoided.min, potentialLossAvoided.max)}
            </p>
            <p className="text-[11px] text-blue-700 mt-0.5">{potentialLossAvoided.basis}</p>
          </div>
        )}

        {/* Row 5: Net Potential Impact (When Supported) */}
        {netPotentialImpact?.status === 'CALCULATED' && (
          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs">
            <div className="flex items-center justify-between mb-0.5">
              <span className="font-bold text-emerald-900">Net Potential Financial Impact:</span>
              <span className="text-[10px] text-emerald-800 font-semibold bg-emerald-100/70 px-1.5 py-0.5 rounded border border-emerald-200">
                Calculated Estimate
              </span>
            </div>
            <p className="text-base font-bold text-emerald-800">
              {formatPKRRange(netPotentialImpact.min, netPotentialImpact.max)}
            </p>
            <p className="text-[11px] text-emerald-700 mt-0.5">{netPotentialImpact.basis}</p>
          </div>
        )}

        {/* ── Transparency & Audit Toggle ── */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowTransparency(!showTransparency)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800 transition-colors"
          >
            <span>{showTransparency ? 'Hide Calculation Details & Source' : 'Inspect Formula & Provenance'}</span>
            {showTransparency ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showTransparency && (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 animate-fade-in">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Mathematical Transparency & Provenance
            </span>

            <div className="space-y-1.5 text-slate-600 text-[11px]">
              <div>
                <strong className="text-slate-700">Official Unit Quotation: </strong>
                <span>{marketPrice?.rawUnit || 'Rs/100kg'} (Metric Quintal)</span>
              </div>
              {transparency.unitConversionNote && (
                <div>
                  <strong className="text-slate-700">Unit Standardization: </strong>
                  <span>{transparency.unitConversionNote}</span>
                </div>
              )}
              {transparency.grossValueCalculation && (
                <div>
                  <strong className="text-slate-700">Valuation Formula: </strong>
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                    {transparency.grossValueCalculation}
                  </code>
                </div>
              )}
              {transparency.riskExposureFormula && (
                <div>
                  <strong className="text-slate-700">Risk Exposure Formula: </strong>
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                    {transparency.riskExposureFormula}
                  </code>
                </div>
              )}
              {transparency.lossAvoidedFormula && (
                <div>
                  <strong className="text-slate-700">Loss Avoidance Formula: </strong>
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                    {transparency.lossAvoidedFormula}
                  </code>
                </div>
              )}
              {transparency.netImpactFormula && (
                <div>
                  <strong className="text-slate-700">Net Impact Formula: </strong>
                  <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-mono text-[10px]">
                    {transparency.netImpactFormula}
                  </code>
                </div>
              )}
              {sourceRecords.length > 0 && (
                <div>
                  <strong className="text-slate-700">Government Source Record: </strong>
                  <span>{sourceRecords[0]}</span>
                </div>
              )}
              <div>
                <strong className="text-slate-700">Freshness: </strong>
                <span>{marketPrice?.freshness || 'Verified'} (Bulletin dated: {marketPrice?.reportedDate})</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200/70 space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="flex items-center gap-1 font-medium text-emerald-800">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  100% Deterministic Local Math • Zero AI
                </span>
                <span className="text-slate-400">Strict Client-Side Privacy</span>
              </div>
              <p className="text-[9.5px] text-slate-400 leading-tight">
                Disclaimer: All figures are calculated estimates based on reported mandi wholesale rates and farmer inputs. Not guaranteed profit, revenue, or income.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
