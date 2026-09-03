import { useState, useMemo } from 'react';
import {
  CloudRain,
  Wind,
  Droplets,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Info,
  Sparkles,
  Lock,
} from 'lucide-react';
import type { DiseaseResult } from '../types';
import type { DiseaseWeatherAssessment as DiseaseWeatherAssessmentType } from '../types/diseaseWeather';
import { evaluateDiseaseWeather } from '../services/diseaseWeatherEngine';
import { useFarmDecision } from '../hooks/useFarmDecision';

interface DiseaseWeatherAssessmentProps {
  diseaseResult: DiseaseResult;
  assessment?: DiseaseWeatherAssessmentType;
  className?: string;
}

export default function DiseaseWeatherAssessment({
  diseaseResult,
  assessment: propAssessment,
  className = '',
}: DiseaseWeatherAssessmentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { weather, farmContext, decisionResult } = useFarmDecision();

  // Compute assessment if not provided as a prop
  const assessment = useMemo(() => {
    if (propAssessment) return propAssessment;
    return evaluateDiseaseWeather({
      diseaseResult,
      farmContext,
      weather,
      decisionResult,
    });
  }, [propAssessment, diseaseResult, farmContext, weather, decisionResult]);

  const {
    treatmentTiming,
    rainRisk,
    windRisk,
    humidityRisk,
    actionPlan,
    immediateActions,
    monitoringActions,
    warnings,
    confidence,
    missingInformation,
    uncertainty,
  } = assessment;

  // Timing badge color schemes
  const timingStyles = {
    suitable: {
      card: 'bg-emerald-50/70 border-emerald-200/90 text-emerald-950',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      icon: CheckCircle2,
      iconColor: 'text-emerald-600',
      label: 'Treatment Timing: Suitable',
    },
    caution: {
      card: 'bg-amber-50/70 border-amber-200/90 text-amber-950',
      badge: 'bg-amber-100 text-amber-800 border-amber-300',
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      label: 'Treatment Timing: Caution',
    },
    avoid: {
      card: 'bg-rose-50/70 border-rose-200/90 text-rose-950',
      badge: 'bg-rose-100 text-rose-800 border-rose-300 animate-text-pulse',
      icon: AlertOctagon,
      iconColor: 'text-rose-600',
      label: 'Treatment Timing: Avoid',
    },
    not_applicable: {
      card: 'bg-slate-50 border-slate-200 text-slate-900',
      badge: 'bg-slate-100 text-slate-700 border-slate-300',
      icon: Info,
      iconColor: 'text-slate-500',
      label: 'No Treatment Needed',
    },
  }[treatmentTiming.timing];

  const TimingIcon = timingStyles.icon;

  return (
    <div
      id="saathi-disease-weather-assessment"
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all ${className}`}
    >
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <span>🌦 Saathi Weather Assessment</span>
            </h4>
            <p className="text-[11px] text-slate-500 font-medium">
              Actionable timing and weather risk for {diseaseResult.diseaseName}
            </p>
          </div>
        </div>

        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${timingStyles.badge}`}
        >
          <TimingIcon className="w-3.5 h-3.5" />
          {timingStyles.label}
        </span>
      </div>

      {/* ── Timing Banner ── */}
      <div className={`mt-3.5 rounded-xl border p-3.5 ${timingStyles.card}`}>
        <p className="text-xs font-semibold leading-relaxed">
          {treatmentTiming.headline}
        </p>
        <p className="text-xs mt-1 text-slate-600 font-normal leading-relaxed">
          {treatmentTiming.reason}
        </p>
      </div>

      {/* ── 4 Key Environmental Risk Tiles ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3.5">
        {/* 1. Rain Risk */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <CloudRain className="w-3.5 h-3.5 text-blue-600" /> Rain Risk
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                rainRisk.level === 'high'
                  ? 'bg-rose-100 text-rose-700'
                  : rainRisk.level === 'moderate'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {rainRisk.level === 'unknown' ? 'N/A' : rainRisk.level.toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {rainRisk.probability}% chance
            </div>
            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
              {rainRisk.level === 'high' ? 'Wash-off hazard' : rainRisk.expectedAmountMm > 0 ? `${rainRisk.expectedAmountMm.toFixed(1)} mm expected` : 'Minimal rain'}
            </div>
          </div>
        </div>

        {/* 2. Wind Risk */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <Wind className="w-3.5 h-3.5 text-teal-600" /> Wind
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                windRisk.level === 'high'
                  ? 'bg-rose-100 text-rose-700'
                  : windRisk.level === 'moderate'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {windRisk.level.toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {Math.round(windRisk.currentSpeedKmH)} km/h
            </div>
            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
              {windRisk.level === 'high' ? 'High drift risk' : windRisk.level === 'moderate' ? 'Moderate breeze' : 'Calm / Safe'}
            </div>
          </div>
        </div>

        {/* 3. Humidity */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <Droplets className="w-3.5 h-3.5 text-indigo-600" /> Humidity
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                humidityRisk.level === 'high'
                  ? 'bg-rose-100 text-rose-700'
                  : humidityRisk.level === 'moderate'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {humidityRisk.level.toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900">
              {humidityRisk.currentHumidity !== undefined ? `${Math.round(humidityRisk.currentHumidity)}%` : 'Standard'}
            </div>
            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
              {humidityRisk.level === 'high' ? 'Moisture favorable' : 'Normal range'}
            </div>
          </div>
        </div>

        {/* 4. Better Window */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-semibold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Best Window
            </span>
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 line-clamp-1">
              {treatmentTiming.timing === 'suitable' ? 'Current Window' : 'See Forecast'}
            </div>
            <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
              {actionPlan.weatherWindow}
            </div>
          </div>
        </div>
      </div>

      {/* ── Warnings Alert (if any) ── */}
      {warnings.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50/60 border border-amber-200/80 p-3 text-xs text-amber-900 space-y-1">
          {warnings.map((warn, i) => (
            <div key={i} className="flex items-start gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
              <span>{warn}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Expand/Collapse Button ── */}
      <div className="mt-3.5 pt-2 border-t border-slate-100 flex items-center justify-between">
        <button
          id="btn-toggle-action-details"
          onClick={() => setIsExpanded((prev) => !prev)}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 py-1 px-2 rounded-lg hover:bg-emerald-50/50 transition-all"
        >
          <span>{isExpanded ? 'Hide Action Details' : 'View Action Details'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          <Lock className="w-3 h-3 text-slate-400" /> 100% Local Intelligence
        </span>
      </div>

      {/* ── Expandable Details Drawer ── */}
      {isExpanded && (
        <div className="mt-3 space-y-3.5 pt-2 border-t border-dashed border-slate-200 animate-fade-in text-xs">
          {/* Action Plan */}
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70 space-y-2">
            <h5 className="font-bold text-slate-900 text-xs tracking-tight flex items-center gap-1.5">
              <span>📋 Immediate Field Action Plan</span>
            </h5>
            <p className="text-slate-700 leading-relaxed">
              <strong className="text-slate-900">Recommended Step:</strong> {actionPlan.nextAction}
            </p>
            <p className="text-slate-600 leading-relaxed">
              <strong className="text-slate-900">Timing Window:</strong> {actionPlan.weatherWindow}
            </p>
          </div>

          {/* Immediate Actions */}
          {immediateActions.length > 0 && (
            <div>
              <p className="font-semibold text-slate-800 mb-1.5">Action Steps:</p>
              <ul className="space-y-1 pl-1">
                {immediateActions.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Monitoring Guidance */}
          {monitoringActions.length > 0 && (
            <div>
              <p className="font-semibold text-slate-800 mb-1.5">Surveillance & Scouting:</p>
              <ul className="space-y-1 pl-1">
                {monitoringActions.map((act, i) => (
                  <li key={i} className="flex items-start gap-2 text-slate-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 flex-shrink-0" />
                    <span>{act}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Confidence and Missing Information Disclaimers */}
          {(confidence.isLowConfidence || missingInformation.length > 0 || uncertainty.length > 0) && (
            <div className="rounded-xl bg-slate-100/80 p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <span>Confidence & Assessment Disclaimers</span>
              </div>
              {confidence.isLowConfidence && (
                <p className="text-amber-800 leading-relaxed">
                  • {confidence.confidenceNote}
                </p>
              )}
              {missingInformation.map((infoMsg, i) => (
                <p key={i} className="leading-relaxed">
                  • {infoMsg}
                </p>
              ))}
              {uncertainty.map((uMsg, i) => (
                <p key={i} className="text-slate-500 italic leading-relaxed">
                  • {uMsg}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
