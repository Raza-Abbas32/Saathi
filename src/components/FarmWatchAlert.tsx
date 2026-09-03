import React from 'react';
import {
  AlertTriangle,
  CloudRain,
  Wind,
  Sun,
  Bug,
  Droplets,
  TrendingUp,
  HelpCircle,
  CheckCircle2,
  X,
  ChevronRight,
} from 'lucide-react';
import type { FarmWatchEvent, FarmWatchEventType } from '../types/farmWatch';

interface FarmWatchAlertProps {
  event: FarmWatchEvent;
  onFollowUp?: (event: FarmWatchEvent) => void;
  onDismiss?: (eventId: string) => void;
  onAcknowledge?: (eventId: string) => void;
  onReviewDecision?: (event: FarmWatchEvent) => void;
}

export function FarmWatchAlert({
  event,
  onFollowUp,
  onDismiss,
  onAcknowledge,
  onReviewDecision,
}: FarmWatchAlertProps) {
  const getEventIcon = (type: FarmWatchEventType) => {
    switch (type) {
      case 'RAIN':
      case 'RAIN_FORECAST_CHANGE':
        return <CloudRain className="w-5 h-5 text-blue-600" />;
      case 'WIND':
        return <Wind className="w-5 h-5 text-teal-600" />;
      case 'HEAT':
        return <Sun className="w-5 h-5 text-amber-600" />;
      case 'DISEASE_WEATHER':
        return <Bug className="w-5 h-5 text-rose-600" />;
      case 'IRRIGATION':
        return <Droplets className="w-5 h-5 text-cyan-600" />;
      case 'MARKET_UPDATE':
        return <TrendingUp className="w-5 h-5 text-emerald-600" />;
      case 'ACTION_CHANGE':
      default:
        return <AlertTriangle className="w-5 h-5 text-saathi-600" />;
    }
  };

  const getSeverityBadge = () => {
    switch (event.severity) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            High Attention
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            Advisory
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-saathi-100 text-saathi-800 border border-saathi-200">
            Notice
          </span>
        );
    }
  };

  const isFollowUpPending = event.requiresFollowUp && !event.farmerResponse && event.status !== 'RESOLVED';

  return (
    <div
      id={`farm-watch-alert-${event.id}`}
      className={`rounded-xl border p-4 transition-all ${
        isFollowUpPending
          ? 'bg-amber-50/70 border-amber-200 shadow-sm'
          : 'bg-white border-saathi-100 hover:border-saathi-200'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2 rounded-lg bg-white shadow-xs border border-saathi-100 shrink-0">
            {getEventIcon(event.type)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              {getSeverityBadge()}
              <span className="text-[11px] text-saathi-500 font-medium">
                {event.source}
              </span>
              {event.sourceDate && (
                <span className="text-[10px] text-saathi-400">
                  • {event.sourceDate}
                </span>
              )}
            </div>
            <h4 className="text-sm font-bold text-saathi-900 leading-snug">
              {event.title}
            </h4>
            <p className="text-xs text-saathi-700 mt-1 leading-relaxed">
              {event.summary}
            </p>
            {event.detail && (
              <p className="text-[11px] text-saathi-500 mt-1 italic">
                {event.detail}
              </p>
            )}

            {/* Farmer Response if already answered */}
            {event.farmerResponse && (
              <div className="mt-2.5 px-2.5 py-1.5 rounded-md bg-saathi-50 border border-saathi-200 text-xs text-saathi-800">
                <span className="font-semibold text-saathi-900">Your observation: </span>
                {event.farmerResponse.affected === 'YES'
                  ? 'Field was affected'
                  : event.farmerResponse.affected === 'NO'
                  ? 'No impact observed'
                  : 'Uncertain impact'}
                {event.farmerResponse.note ? ` — "${event.farmerResponse.note}"` : ''}
                <span className="text-[10px] text-saathi-500 block mt-0.5">
                  Saved to private local Farm Memory
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            onClick={() => onDismiss(event.id)}
            title="Dismiss alert"
            className="text-saathi-400 hover:text-saathi-600 p-1 rounded-md hover:bg-saathi-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 pt-3 border-t border-saathi-100 flex flex-wrap items-center gap-2">
        {isFollowUpPending && onFollowUp && (
          <button
            id={`btn-followup-${event.id}`}
            onClick={() => onFollowUp(event)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-saathi-600 text-white hover:bg-saathi-700 transition shadow-xs"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            What happened on your farm?
          </button>
        )}

        {event.actionId && onReviewDecision && (
          <button
            id={`btn-review-${event.id}`}
            onClick={() => onReviewDecision(event)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white text-saathi-700 border border-saathi-200 hover:bg-saathi-50 transition"
          >
            <ChevronRight className="w-3.5 h-3.5 text-saathi-500" />
            Review Decision
          </button>
        )}

        {event.status === 'NEW' && onAcknowledge && (
          <button
            onClick={() => onAcknowledge(event.id)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-saathi-600 hover:text-saathi-800 hover:bg-saathi-50 transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Got it
          </button>
        )}
      </div>
    </div>
  );
}
