import React, { useState } from 'react';
import {
  Eye,
  Bell,
  Sun,
  Droplets,
  AlertTriangle,
  TrendingUp,
  History,
  Sparkles,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  CheckCircle2,
  Sliders,
  Compass,
} from 'lucide-react';
import { useFarmWatch } from '../hooks/useFarmWatch';
import { FarmWatchAlert } from './FarmWatchAlert';
import { FarmWatchFollowUp } from './FarmWatchFollowUp';
import { DecisionEvidenceDrawer } from './DecisionEvidenceDrawer';
import { FarmDecisionSimulator } from './FarmDecisionSimulator';
import type { FarmWatchEvent, FarmWatchFollowUpInput } from '../types/farmWatch';
import type { FarmAction } from '../types/farmActionPlanner';
import type { DecisionScenarioType } from '../types/farmDecisionSimulator';
import type { DiseaseWeatherAssessment } from '../types/diseaseWeather';
import type { DiseaseResult } from '../types';
import type { NormalizedMarketCropPrice } from '../types/market';

interface FarmWatchProps {
  diseaseAssessment?: DiseaseWeatherAssessment | null;
  diseaseResult?: DiseaseResult | null;
  marketPrices?: NormalizedMarketCropPrice[] | null;
  className?: string;
  onSelectAction?: (action: FarmAction) => void;
}

export function FarmWatch({
  diseaseAssessment,
  diseaseResult,
  marketPrices,
  className = '',
  onSelectAction,
}: FarmWatchProps) {
  const {
    brief,
    events,
    activeAlerts,
    pendingFollowUps,
    acknowledgeEvent,
    dismissEvent,
    recordFollowUp,
    refreshWatch,
    farmContext,
    plan,
  } = useFarmWatch({
    diseaseAssessment,
    diseaseResult,
    marketPrices,
  });

  const [followUpEvent, setFollowUpEvent] = useState<FarmWatchEvent | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [evidenceDrawerAction, setEvidenceDrawerAction] = useState<FarmAction | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [simulatorScenario, setSimulatorScenario] = useState<DecisionScenarioType>('SPRAYING');
  const [simulatorAction, setSimulatorAction] = useState<FarmAction | null>(null);

  const handleReviewDecision = (event: FarmWatchEvent) => {
    // If event links to topAction or action in plan, open simulator
    const matchedAction = plan.actions.find((a) => a.id === event.actionId) || plan.topAction;
    setSimulatorAction(matchedAction || null);

    if (event.type === 'RAIN' || event.type === 'RAIN_FORECAST_CHANGE' || event.type === 'WIND') {
      setSimulatorScenario('SPRAYING');
    } else if (event.type === 'IRRIGATION') {
      setSimulatorScenario('IRRIGATION');
    } else if (event.type === 'DISEASE_WEATHER') {
      setSimulatorScenario('DISEASE');
    } else if (event.type === 'MARKET_UPDATE') {
      setSimulatorScenario('MARKET');
    }

    setSimulatorOpen(true);
  };

  const handleFollowUpSubmit = (input: FarmWatchFollowUpInput) => {
    recordFollowUp(input);
    setFollowUpEvent(null);
  };

  return (
    <div
      id="saathi-farm-watch"
      className={`bg-white rounded-2xl border border-saathi-100 shadow-sm p-5 sm:p-6 transition-all ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-saathi-100">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-saathi-500 to-saathi-600 text-white rounded-xl shadow-xs">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-saathi-900 tracking-tight">
                Saathi Farm Watch
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Active Monitor
              </span>
            </div>
            <p className="text-xs text-saathi-600">
              Proactive weather shifts, daily brief, and field follow-ups
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {pendingFollowUps.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300">
              <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
              {pendingFollowUps.length} follow-up{pendingFollowUps.length > 1 ? 's' : ''}
            </span>
          )}
          <button
            onClick={() => refreshWatch()}
            title="Refresh Farm Watch signals"
            className="p-2 rounded-xl text-saathi-600 hover:text-saathi-800 hover:bg-saathi-50 border border-saathi-100 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Alerts Banner (if any) */}
      {activeAlerts.length > 0 && (
        <div className="mt-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-saathi-900 uppercase tracking-wide flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-rose-600" />
              Meaningful Farm Changes ({activeAlerts.length})
            </span>
            <span className="text-[11px] text-saathi-500">
              Deterministic detection • Zero false panic
            </span>
          </div>
          {activeAlerts.map((alert) => (
            <FarmWatchAlert
              key={alert.id}
              event={alert}
              onFollowUp={(ev) => setFollowUpEvent(ev)}
              onDismiss={(id) => dismissEvent(id)}
              onAcknowledge={(id) => acknowledgeEvent(id)}
              onReviewDecision={handleReviewDecision}
            />
          ))}
        </div>
      )}

      {/* Daily Farm Brief Section */}
      <div className="mt-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-saathi-900 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-harvest-600" />
            Daily Farm Brief • {brief.dateStr}
          </h3>
          <div className="flex items-center gap-1.5">
            {brief.cropSummary.isSet ? (
              <span className="text-[11px] font-medium text-saathi-700 bg-saathi-50 px-2 py-0.5 rounded-md border border-saathi-100">
                {brief.cropSummary.crop}
                {brief.cropSummary.stage ? ` • ${brief.cropSummary.stage}` : ''}
                {brief.cropSummary.district ? ` • ${brief.cropSummary.district}` : ''}
              </span>
            ) : (
              <span className="text-[11px] text-saathi-400 italic">
                Set crop for specific brief
              </span>
            )}
          </div>
        </div>

        {/* Structured Brief Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Weather & Field */}
          <div className="p-3.5 rounded-xl bg-saathi-50/60 border border-saathi-100 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white text-saathi-700 shadow-xs shrink-0 mt-0.5">
              <Sun className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-saathi-500">
                {brief.weatherSection.title}
              </span>
              <p className="text-xs font-bold text-saathi-900 mt-0.5">
                {brief.weatherSection.headline}
              </p>
              {brief.weatherSection.detail && (
                <p className="text-[11px] text-saathi-600 mt-0.5 leading-relaxed">
                  {brief.weatherSection.detail}
                </p>
              )}
            </div>
          </div>

          {/* Water & Irrigation */}
          <div className="p-3.5 rounded-xl bg-saathi-50/60 border border-saathi-100 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white text-saathi-700 shadow-xs shrink-0 mt-0.5">
              <Droplets className="w-4 h-4 text-cyan-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-saathi-500">
                {brief.waterSection.title}
              </span>
              <p className="text-xs font-bold text-saathi-900 mt-0.5">
                {brief.waterSection.headline}
              </p>
              {brief.waterSection.detail && (
                <p className="text-[11px] text-saathi-600 mt-0.5 leading-relaxed">
                  {brief.waterSection.detail}
                </p>
              )}
            </div>
          </div>

          {/* Farm Attention */}
          <div className="p-3.5 rounded-xl bg-saathi-50/60 border border-saathi-100 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white text-saathi-700 shadow-xs shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-harvest-600" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-saathi-500">
                {brief.attentionSection.title}
              </span>
              <p className="text-xs font-bold text-saathi-900 mt-0.5">
                {brief.attentionSection.headline}
              </p>
              {brief.attentionSection.detail && (
                <p className="text-[11px] text-saathi-600 mt-0.5 leading-relaxed">
                  {brief.attentionSection.detail}
                </p>
              )}
            </div>
          </div>

          {/* Market / Mandi Price */}
          {brief.marketSection ? (
            <div className="p-3.5 rounded-xl bg-saathi-50/60 border border-saathi-100 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white text-saathi-700 shadow-xs shrink-0 mt-0.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-saathi-500">
                  {brief.marketSection.title}
                </span>
                <p className="text-xs font-bold text-saathi-900 mt-0.5">
                  {brief.marketSection.headline}
                </p>
                {brief.marketSection.detail && (
                  <p className="text-[11px] text-saathi-600 mt-0.5 leading-relaxed">
                    {brief.marketSection.detail}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-saathi-50/60 border border-saathi-100 flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white text-saathi-700 shadow-xs shrink-0 mt-0.5">
                <Compass className="w-4 h-4 text-saathi-500" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-saathi-500">
                  Official Market Data
                </span>
                <p className="text-xs font-bold text-saathi-900 mt-0.5">
                  Mandi prices updated daily from AMIS Punjab.
                </p>
                <p className="text-[11px] text-saathi-600 mt-0.5">
                  Check the Market Prices module for regional wholesale arrivals.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Priority Action Highlight */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-saathi-50 to-harvest-50/30 border border-saathi-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-saathi-600 text-white shadow-xs shrink-0 mt-0.5">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-saathi-700">
                  {brief.todayPrioritySection.title}
                </span>
                {brief.todayPrioritySection.sourceDate && (
                  <span className="text-[10px] text-saathi-500">
                    • {brief.todayPrioritySection.sourceDate}
                  </span>
                )}
              </div>
              <h4 className="text-sm font-bold text-saathi-900">
                {brief.todayPrioritySection.headline}
              </h4>
              {brief.todayPrioritySection.detail && (
                <p className="text-xs text-saathi-700 mt-0.5">
                  {brief.todayPrioritySection.detail}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {brief.topPriorityAction && (
              <>
                <button
                  id="btn-farmwatch-evidence"
                  onClick={() => setEvidenceDrawerAction(brief.topPriorityAction!)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white text-saathi-700 border border-saathi-200 hover:bg-saathi-50 transition shadow-xs"
                >
                  View Evidence
                </button>
                <button
                  id="btn-farmwatch-simulate"
                  onClick={() => {
                    setSimulatorAction(brief.topPriorityAction!);
                    setSimulatorScenario(
                      brief.topPriorityAction!.category === 'SPRAYING'
                        ? 'SPRAYING'
                        : brief.topPriorityAction!.category === 'IRRIGATION'
                        ? 'IRRIGATION'
                        : brief.topPriorityAction!.category === 'DISEASE'
                        ? 'DISEASE'
                        : 'MARKET'
                    );
                    setSimulatorOpen(true);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-saathi-600 text-white hover:bg-saathi-700 transition shadow-xs"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Compare Options
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* History Toggle */}
      {events.length > 0 && (
        <div className="mt-4 pt-3 border-t border-saathi-100">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="w-full flex items-center justify-between text-xs font-medium text-saathi-600 hover:text-saathi-800 py-1 transition"
          >
            <span className="flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Recent Farm Watch History ({events.length})
            </span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="mt-3 space-y-2 animate-fade-in">
              {events.slice(0, 5).map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-saathi-50/50 border border-saathi-100 text-xs flex items-start justify-between gap-2"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-saathi-900">{ev.title}</span>
                      <span className="text-[10px] text-saathi-500">
                        {new Date(ev.detectedAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-saathi-600">{ev.summary}</p>
                    {ev.farmerResponse && (
                      <p className="text-saathi-800 font-medium mt-1 bg-white p-1.5 rounded border border-saathi-200">
                        Farmer Observation:{' '}
                        {ev.farmerResponse.affected === 'YES'
                          ? 'Field affected'
                          : ev.farmerResponse.affected === 'NO'
                          ? 'No impact'
                          : 'Uncertain'}{' '}
                        {ev.farmerResponse.note ? `— "${ev.farmerResponse.note}"` : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-saathi-600 border border-saathi-200 shrink-0">
                    {ev.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Follow-Up Modal */}
      {followUpEvent && (
        <FarmWatchFollowUp
          event={followUpEvent}
          isOpen={Boolean(followUpEvent)}
          onClose={() => setFollowUpEvent(null)}
          onSubmit={handleFollowUpSubmit}
          crop={farmContext?.crop || farmContext?.currentCrop}
          cropStage={farmContext?.stage || farmContext?.cropStage}
          district={farmContext?.location || farmContext?.district}
        />
      )}

      {/* Decision Evidence Drawer */}
      {evidenceDrawerAction && (
        <DecisionEvidenceDrawer
          action={evidenceDrawerAction}
          isOpen={Boolean(evidenceDrawerAction)}
          onClose={() => setEvidenceDrawerAction(null)}
          onSimulate={(action) => {
            setEvidenceDrawerAction(null);
            setSimulatorAction(action);
            setSimulatorScenario(
              action.category === 'SPRAYING'
                ? 'SPRAYING'
                : action.category === 'IRRIGATION'
                ? 'IRRIGATION'
                : action.category === 'DISEASE'
                ? 'DISEASE'
                : 'MARKET'
            );
            setSimulatorOpen(true);
          }}
        />
      )}

      {/* Decision Simulator Modal */}
      {simulatorOpen && (
        <FarmDecisionSimulator
          isOpen={simulatorOpen}
          onClose={() => setSimulatorOpen(false)}
          defaultScenario={simulatorScenario}
          defaultAction={simulatorAction || undefined}
          onSelectAction={(action) => {
            if (onSelectAction) onSelectAction(action);
          }}
        />
      )}
    </div>
  );
}
