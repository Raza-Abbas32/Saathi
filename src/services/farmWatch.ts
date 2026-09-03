/**
 * Saathi Farm Watch Service
 *
 * Proactive farm monitoring engine:
 * 1. Generates the Daily Farm Decision Brief.
 * 2. Detects meaningful weather, action, disease, and market changes.
 * 3. Drives the proactive "What happened?" follow-up loop into Step 8 Farm Memory.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY, INTEGRITY & ETHICAL BOUNDARIES:
 * 1. 100% on-device local storage under 'saathi-farm-watch'.
 * 2. ZERO continuous GPS tracking; uses existing FarmContext location only.
 * 3. ZERO Gemini / LLM calls. ZERO external network transmission.
 * 4. EVENT ≠ IMPACT: Weather/disease conditions are observed; actual farm impact
 *    is strictly farmer-reported without artificial causal claims.
 * 5. Deterministic deduplication prevents alert fatigue across page reloads.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  DailyFarmBrief,
  DailyFarmBriefSection,
  EvaluateFarmWatchParams,
  FarmWatchEvent,
  FarmWatchEventStatus,
  FarmWatchEventType,
  FarmWatchFollowUpInput,
  FarmWatchState,
  WeatherSnapshot,
} from '../types/farmWatch';
import type { WeatherData } from './weather';
import type { FarmAction } from '../types/farmActionPlanner';
import type { FarmActionOutcome } from '../types/farmOutcome';
import { saveFarmOutcome, getRecentFarmOutcomes } from './farmOutcomeService';

export const FARM_WATCH_STORAGE_KEY = 'saathi-farm-watch';
export const FARM_WATCH_UPDATED_EVENT = 'saathi:farm-watch-updated';

/**
 * Validates whether an arbitrary object conforms to a valid FarmWatchEvent.
 */
export function isValidFarmWatchEvent(item: unknown): item is FarmWatchEvent {
  if (!item || typeof item !== 'object') return false;
  const c = item as Record<string, unknown>;

  if (typeof c.id !== 'string' || !c.id.trim()) return false;
  if (typeof c.type !== 'string' || !c.type.trim()) return false;
  if (typeof c.severity !== 'string') return false;
  if (typeof c.title !== 'string' || !c.title.trim()) return false;
  if (typeof c.summary !== 'string' || !c.summary.trim()) return false;
  if (typeof c.detectedAt !== 'string' || isNaN(Date.parse(c.detectedAt))) return false;
  if (typeof c.source !== 'string') return false;
  if (typeof c.requiresFollowUp !== 'boolean') return false;
  if (typeof c.status !== 'string') return false;

  return true;
}

/**
 * Retrieves the persisted Farm Watch state from localStorage safely.
 */
export function getFarmWatchState(): FarmWatchState {
  const defaultState: FarmWatchState = {
    lastCheckedAt: new Date().toISOString(),
    previousWeatherSnapshot: null,
    events: [],
    dismissedFingerprints: [],
  };

  try {
    const raw = localStorage.getItem(FARM_WATCH_STORAGE_KEY);
    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      console.warn('[FarmWatch] Corrupted localStorage state; resetting to safe default.');
      return defaultState;
    }

    const validEvents = Array.isArray(parsed.events)
      ? parsed.events.filter(isValidFarmWatchEvent)
      : [];

    const validDismissed = Array.isArray(parsed.dismissedFingerprints)
      ? parsed.dismissedFingerprints.filter((f: unknown) => typeof f === 'string')
      : [];

    return {
      lastCheckedAt: typeof parsed.lastCheckedAt === 'string' ? parsed.lastCheckedAt : new Date().toISOString(),
      previousWeatherSnapshot: parsed.previousWeatherSnapshot || null,
      events: validEvents,
      dismissedFingerprints: validDismissed,
    };
  } catch (err) {
    console.warn('[FarmWatch] Error reading state from storage:', err);
    return defaultState;
  }
}

/**
 * Persists the Farm Watch state to localStorage safely.
 */
export function saveFarmWatchState(state: FarmWatchState): void {
  try {
    localStorage.setItem(FARM_WATCH_STORAGE_KEY, JSON.stringify(state));
    notifyFarmWatchUpdated(state);
  } catch (err) {
    console.error('[FarmWatch] Failed to persist state:', err);
  }
}

/**
 * Clears Farm Watch state completely.
 */
export function clearFarmWatchState(): void {
  try {
    localStorage.removeItem(FARM_WATCH_STORAGE_KEY);
    notifyFarmWatchUpdated({
      lastCheckedAt: new Date().toISOString(),
      previousWeatherSnapshot: null,
      events: [],
      dismissedFingerprints: [],
    });
  } catch (err) {
    console.error('[FarmWatch] Failed to clear state:', err);
  }
}

/**
 * Extracts a normalized weather snapshot from WeatherData for comparison.
 */
export function extractWeatherSnapshot(
  weather?: WeatherData | null,
  currentDate?: Date
): WeatherSnapshot | null {
  if (!weather) return null;

  const current = weather.current;
  const daily = weather.daily;
  const forecast = weather.forecast;

  const temp = current?.temperature_2m ?? current?.temp ?? current?.temperature;
  const maxTemp = daily?.temperature_2m_max?.[0] ?? forecast?.[0]?.temp ?? temp;
  const minTemp = daily?.temperature_2m_min?.[0];
  const rainProb =
    daily?.precipitation_probability_max?.[0] ??
    forecast?.[0]?.rain ??
    current?.precipitation_probability;
  const rainSum = daily?.precipitation_sum?.[0] ?? current?.precipitation;
  const isRaining = (current?.precipitation !== undefined && current.precipitation > 0) || (current?.is_day !== undefined && current?.weather_code !== undefined && [51, 53, 55, 61, 63, 65, 80, 81, 82].includes(current.weather_code));
  const windSpeed = current?.wind_speed_10m ?? current?.windSpeed;
  const humidity = current?.relative_humidity_2m ?? current?.humidity;
  const conditionCode = current?.weather_code ?? current?.weathercode;

  return {
    capturedAt: (currentDate || new Date()).toISOString(),
    temp,
    maxTemp,
    minTemp,
    rainProb,
    rainSum,
    isRaining: Boolean(isRaining),
    windSpeed,
    humidity,
    conditionCode,
    forecastRainNext24h: rainSum,
  };
}

/**
 * Generates a stable deterministic event fingerprint.
 */
export function generateEventFingerprint(
  type: FarmWatchEventType,
  dateStr: string,
  keyDetail: string
): string {
  const sanitizedKey = keyDetail.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 40);
  return `fw-${type.toLowerCase()}-${dateStr}-${sanitizedKey}`;
}

/**
 * Generates the action-oriented Daily Farm Decision Brief.
 */
export function generateDailyFarmBrief(params: EvaluateFarmWatchParams): DailyFarmBrief {
  const now = params.currentDate || new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const dateIso = now.toISOString().split('T')[0];

  const farmContext = params.farmContext;
  const weather = params.weather;
  const decisionResult = params.decisionResult;
  const diseaseAssessment = params.diseaseAssessment;
  const diseaseResult = params.diseaseResult;
  const lifecycleContext = params.lifecycleContext;
  const marketPrices = params.marketPrices;
  const plan = params.farmActionPlan;
  const farmOutcomes = params.farmOutcomes || getRecentFarmOutcomes(3);

  // 1. Crop Summary
  const cropName = farmContext?.crop || farmContext?.currentCrop || '';
  const cropStage = farmContext?.stage || farmContext?.cropStage || lifecycleContext?.currentStage || '';
  const cropVariety = farmContext?.variety || '';
  const cropDistrict = farmContext?.location || farmContext?.district || '';
  const isCropSet = Boolean(cropName.trim());

  // 2. Weather Section
  let weatherSection: DailyFarmBriefSection;
  const snapshot = extractWeatherSnapshot(weather, now);

  if (snapshot) {
    const rainP = snapshot.rainProb;
    const maxT = snapshot.maxTemp;
    const wind = snapshot.windSpeed;

    if (snapshot.isRaining || (rainP !== undefined && rainP >= 60)) {
      weatherSection = {
        title: 'Weather & Field Conditions',
        status: 'ATTENTION',
        headline: `Rain expected today (${rainP ?? 60}% probability).`,
        detail: 'Pesticide application risks wash-off; hold off on spraying until rain clears.',
        source: 'Open-Meteo Forecast',
        sourceDate: dateIso,
      };
    } else if (wind !== undefined && wind >= 18) {
      weatherSection = {
        title: 'Weather & Field Conditions',
        status: 'CAUTION',
        headline: `Breezy conditions (${wind} km/h wind speed).`,
        detail: 'High chemical drift hazard; use low-drift nozzles or postpone spraying.',
        source: 'Open-Meteo Forecast',
        sourceDate: dateIso,
      };
    } else if (maxT !== undefined && maxT >= 38) {
      weatherSection = {
        title: 'Weather & Field Conditions',
        status: 'CAUTION',
        headline: `Intense heat forecast (${maxT}°C max temperature).`,
        detail: 'Perform field operations in early morning or evening to avoid heat stress.',
        source: 'Open-Meteo Forecast',
        sourceDate: dateIso,
      };
    } else {
      weatherSection = {
        title: 'Weather & Field Conditions',
        status: 'OPTIMAL',
        headline: `Favorable field weather (${maxT !== undefined ? `${maxT}°C, ` : ''}${wind !== undefined ? `${wind} km/h wind, ` : ''}low rain risk).`,
        detail: 'Suitable atmospheric window for routine field scouting and operations.',
        source: 'Open-Meteo Forecast',
        sourceDate: dateIso,
      };
    }
  } else {
    weatherSection = {
      title: 'Weather & Field Conditions',
      status: 'UNAVAILABLE',
      headline: 'Weather forecast unavailable.',
      detail: 'Set district location or check internet connection for live weather.',
      source: 'Open-Meteo',
    };
  }

  // 3. Water / Irrigation Section
  let waterSection: DailyFarmBriefSection;
  if (decisionResult?.irrigationRecommendation) {
    const irRec = decisionResult.irrigationRecommendation;
    const isHold = irRec.status === 'WAIT' || irRec.status === 'NO_ACTION';
    waterSection = {
      title: 'Irrigation & Moisture',
      status: isHold ? 'OPTIMAL' : 'ATTENTION',
      headline: irRec.action || 'Hold irrigation.',
      detail: irRec.reason,
      source: 'Farm Decision Engine',
      sourceDate: dateIso,
      actionId: 'action-irrigation',
    };
  } else if (snapshot?.rainProb !== undefined && snapshot.rainProb >= 45) {
    waterSection = {
      title: 'Irrigation & Moisture',
      status: 'OPTIMAL',
      headline: 'Hold irrigation — rain is forecasted.',
      detail: 'Utilize incoming natural rainfall to conserve fuel and prevent waterlogging.',
      source: 'Farm Decision Engine',
      sourceDate: dateIso,
    };
  } else if (snapshot?.maxTemp !== undefined && snapshot.maxTemp >= 38) {
    waterSection = {
      title: 'Irrigation & Moisture',
      status: 'ATTENTION',
      headline: 'Irrigate during cool morning/evening hours.',
      detail: 'High evaporative demand increases crop moisture stress.',
      source: 'Farm Decision Engine',
      sourceDate: dateIso,
    };
  } else {
    waterSection = {
      title: 'Irrigation & Moisture',
      status: isCropSet ? 'INFO' : 'UNAVAILABLE',
      headline: isCropSet ? 'Check root zone soil moisture depth.' : 'Soil moisture assessment unavailable.',
      detail: isCropSet ? 'Test soil core before scheduling tube-well pumping.' : 'Complete farm profile for tailored water guidance.',
      source: 'Farm Decision Engine',
    };
  }

  // 4. Attention Section (Key Risk)
  let attentionSection: DailyFarmBriefSection;
  if (diseaseAssessment?.weatherRisk?.overallRisk === 'HIGH' || diseaseAssessment?.weatherRisk?.overallRisk === 'CRITICAL') {
    attentionSection = {
      title: 'Pathogen & Health Alert',
      status: 'ATTENTION',
      headline: `High weather risk for ${diseaseAssessment.disease || 'crop disease'}.`,
      detail: diseaseAssessment.weatherRisk.summary || 'Environmental conditions favor rapid fungal multiplication.',
      source: 'Disease Weather Engine',
      sourceDate: dateIso,
    };
  } else if (diseaseResult) {
    attentionSection = {
      title: 'Disease Scouting',
      status: 'ATTENTION',
      headline: `Visual symptom detected: ${diseaseResult.detectedDisease}.`,
      detail: `Severity: ${diseaseResult.severity}. Inspect field rows to verify spread.`,
      source: 'Disease Intelligence Engine',
      sourceDate: dateIso,
    };
  } else if (plan?.topAction && plan.topAction.priority === 'HIGH' && plan.topAction.status !== 'NO_ACTION') {
    attentionSection = {
      title: 'Priority Farm Action',
      status: 'ATTENTION',
      headline: plan.topAction.title,
      detail: plan.topAction.action,
      source: 'Farm Action Planner',
      sourceDate: dateIso,
      actionId: plan.topAction.id,
    };
  } else if (snapshot?.isRaining || (snapshot?.rainProb !== undefined && snapshot.rainProb >= 60)) {
    attentionSection = {
      title: 'Weather Precaution',
      status: 'ATTENTION',
      headline: 'Rainfall window active.',
      detail: 'Postpone chemical spraying to prevent chemical wash-off.',
      source: 'Open-Meteo Forecast',
      sourceDate: dateIso,
    };
  } else {
    attentionSection = {
      title: 'Farm Attention',
      status: 'OPTIMAL',
      headline: 'No urgent crop or weather hazards detected.',
      detail: 'Continue routine field monitoring and crop maintenance.',
      source: 'Farm Intelligence',
      sourceDate: dateIso,
    };
  }

  // 5. Market Section
  let marketSection: DailyFarmBriefSection | null = null;
  if (marketPrices && marketPrices.length > 0) {
    const primary = marketPrices[0];
    const priceVal = primary.modalPrice ?? primary.price;
    const mandiName = primary.mandi ?? primary.market ?? 'Punjab';
    const repDate = primary.arrivalDate ?? primary.reportedDate;

    if (priceVal !== undefined && priceVal !== null) {
      marketSection = {
        title: 'Mandi Market Rate',
        status: 'INFO',
        headline: `${primary.crop}: Rs ${priceVal.toLocaleString()} / ${primary.unit || 'maund'} in ${mandiName} mandi.`,
        detail: `Official AMIS wholesale auction arrival quotation. Deductions apply at farmgate.`,
        source: 'AMIS Punjab Directorate of Agriculture Economics',
        sourceDate: repDate || dateIso,
      };
    }
  }

  // 6. Recent Activity Section (from Farm Memory)
  let recentActivitySection: DailyFarmBriefSection | null = null;
  if (farmOutcomes && farmOutcomes.length > 0) {
    const latest = farmOutcomes[0];
    const dateFormatted = new Date(latest.recordedAt).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    recentActivitySection = {
      title: 'Recent Field Observation',
      status: 'INFO',
      headline: `${latest.actionTitle || 'Field Log'} (${dateFormatted})`,
      detail: `Farmer report: ${latest.observation || latest.outcome || 'Observation logged'}.`,
      source: 'Farm Memory Local Log',
      sourceDate: latest.recordedAt,
    };
  }

  // 7. Today's Priority Action
  const topAction = plan?.topAction;
  let todayPrioritySection: DailyFarmBriefSection;

  if (topAction) {
    todayPrioritySection = {
      title: "Today's Priority Action",
      status: topAction.priority === 'HIGH' ? 'ATTENTION' : 'INFO',
      headline: topAction.title,
      detail: `${topAction.action} (${topAction.reason})`,
      source: 'Farm Action Planner',
      sourceDate: dateIso,
      actionId: topAction.id,
    };
  } else if (isCropSet) {
    todayPrioritySection = {
      title: "Today's Priority Action",
      status: 'INFO',
      headline: 'Walk field rows for pest and weed scouting.',
      detail: 'Regular visual scouting ensures early intervention before economic damage.',
      source: 'Farm Action Planner',
      sourceDate: dateIso,
    };
  } else {
    todayPrioritySection = {
      title: "Today's Priority Action",
      status: 'UNAVAILABLE',
      headline: 'Set up your Farm Profile to generate action plans.',
      detail: 'Add your active crop, stage, and location for customized daily advice.',
      source: 'Farm Profile',
    };
  }

  // Data completeness
  let dataCompleteness: 'GOOD' | 'PARTIAL' | 'LIMITED' = 'GOOD';
  if (!isCropSet && !weather) {
    dataCompleteness = 'LIMITED';
  } else if (!isCropSet || !weather) {
    dataCompleteness = 'PARTIAL';
  }

  return {
    generatedAt: now.toISOString(),
    dateStr,
    cropSummary: {
      crop: cropName || 'Crop not set',
      stage: cropStage || undefined,
      variety: cropVariety || undefined,
      district: cropDistrict || undefined,
      isSet: isCropSet,
    },
    weatherSection,
    waterSection,
    attentionSection,
    marketSection,
    recentActivitySection,
    todayPrioritySection,
    topPriorityAction: topAction || null,
    activeAlertCount: 0, // filled by orchestrator
    followUpPendingCount: 0, // filled by orchestrator
    dataCompleteness,
  };
}

/**
 * Detects meaningful changes between previous snapshot and current intelligence signals.
 */
export function detectMeaningfulChanges(
  params: EvaluateFarmWatchParams
): FarmWatchEvent[] {
  const events: FarmWatchEvent[] = [];
  const now = params.currentDate || new Date();
  const dateIso = now.toISOString().split('T')[0];

  const weather = params.weather;
  const prevSnapshot = params.previousSnapshot;
  const currentSnapshot = extractWeatherSnapshot(weather, now);
  const diseaseAssessment = params.diseaseAssessment;
  const decisionResult = params.decisionResult;
  const plan = params.farmActionPlan;
  const marketPrices = params.marketPrices;

  // ── 1. Rain Event Detection ──
  if (currentSnapshot) {
    const isCurrentlyRaining = currentSnapshot.isRaining;
    const currentRainSum = currentSnapshot.rainSum ?? 0;
    const wasRaining = prevSnapshot?.isRaining ?? false;
    const prevRainSum = prevSnapshot?.rainSum ?? 0;

    // Trigger rain event if newly raining or significant rain sum detected
    if ((isCurrentlyRaining && !wasRaining) || (currentRainSum >= 1.0 && prevRainSum < 0.5)) {
      const id = generateEventFingerprint('RAIN', dateIso, `rain-${Math.round(currentRainSum * 10)}mm`);
      events.push({
        id,
        type: 'RAIN',
        severity: 'HIGH',
        title: '🌧️ Rain Observed Around Your Farm',
        summary: `Precipitation detected in local weather signals (~${currentRainSum.toFixed(1)} mm). Did it affect your farm or planned work?`,
        detail: 'Rainfall washes off applied chemicals and alters field soil moisture.',
        detectedAt: now.toISOString(),
        occurredAt: now.toISOString(),
        source: 'Open-Meteo',
        sourceDate: dateIso,
        requiresFollowUp: true,
        status: 'NEW',
        actionId: 'action-weather-rain',
      });
    }

    // ── 2. Rain Forecast Change ──
    const currProb = currentSnapshot.rainProb;
    const prevProb = prevSnapshot?.rainProb;

    if (currProb !== undefined && prevProb !== undefined) {
      const probDiff = currProb - prevProb;
      // Meaningful shift: increased by >= 25% to >= 40%
      if (probDiff >= 25 && currProb >= 40) {
        const id = generateEventFingerprint('RAIN_FORECAST_CHANGE', dateIso, `prob-up-${currProb}`);
        events.push({
          id,
          type: 'RAIN_FORECAST_CHANGE',
          severity: currProb >= 60 ? 'HIGH' : 'MEDIUM',
          title: '🌧️ Rain Forecast Increased',
          summary: `Precipitation probability adjusted to ${currProb}% (previously ${prevProb}%). Review planned spraying or irrigation before proceeding.`,
          detectedAt: now.toISOString(),
          source: 'Open-Meteo',
          sourceDate: dateIso,
          requiresFollowUp: currProb >= 60,
          status: 'NEW',
          actionId: 'action-spraying-avoid',
        });
      } else if (probDiff <= -30 && prevProb >= 50) {
        const id = generateEventFingerprint('RAIN_FORECAST_CHANGE', dateIso, `prob-down-${currProb}`);
        events.push({
          id,
          type: 'RAIN_FORECAST_CHANGE',
          severity: 'LOW',
          title: '🌤️ Rain Probability Decreased',
          summary: `Rain probability lowered to ${currProb}% (previously ${prevProb}%). Weather window for field operations may be clearing.`,
          detectedAt: now.toISOString(),
          source: 'Open-Meteo',
          sourceDate: dateIso,
          requiresFollowUp: false,
          status: 'NEW',
        });
      }
    }

    // ── 3. Wind Hazard ──
    const wind = currentSnapshot.windSpeed;
    const prevWind = prevSnapshot?.windSpeed ?? 0;
    if (wind !== undefined && wind >= 18 && prevWind < 18) {
      const id = generateEventFingerprint('WIND', dateIso, `wind-${Math.round(wind)}kmh`);
      events.push({
        id,
        type: 'WIND',
        severity: wind >= 24 ? 'HIGH' : 'MEDIUM',
        title: '🌬️ Wind Conditions Unfavorable for Spraying',
        summary: `Wind speed measured at ${wind} km/h. High spray-drift hazard to non-target areas and reduced droplet deposition.`,
        detectedAt: now.toISOString(),
        source: 'Open-Meteo',
        sourceDate: dateIso,
        requiresFollowUp: true,
        status: 'NEW',
        actionId: 'action-spraying-avoid',
      });
    }

    // ── 4. Heat Hazard ──
    const maxT = currentSnapshot.maxTemp;
    const prevMaxT = prevSnapshot?.maxTemp ?? 0;
    if (maxT !== undefined && maxT >= 38 && prevMaxT < 38) {
      const id = generateEventFingerprint('HEAT', dateIso, `heat-${Math.round(maxT)}c`);
      events.push({
        id,
        type: 'HEAT',
        severity: maxT >= 42 ? 'HIGH' : 'MEDIUM',
        title: '🌡️ High Temperature Concern',
        summary: `Forecasted maximum temperature is ${maxT}°C. High evaporative demand increases crop water stress and droplet evaporation.`,
        detectedAt: now.toISOString(),
        source: 'Open-Meteo',
        sourceDate: dateIso,
        requiresFollowUp: false,
        status: 'NEW',
      });
    }
  }

  // ── 5. Disease Weather Risk ──
  if (diseaseAssessment?.weatherRisk?.overallRisk === 'HIGH' || diseaseAssessment?.weatherRisk?.overallRisk === 'CRITICAL') {
    const diseaseName = diseaseAssessment.disease || 'Crop Pathogen';
    const id = generateEventFingerprint('DISEASE_WEATHER', dateIso, `disease-${diseaseName}`);
    events.push({
      id,
      type: 'DISEASE_WEATHER',
      severity: 'HIGH',
      title: `🦠 Favorable Weather for ${diseaseName}`,
      summary: diseaseAssessment.weatherRisk.summary || `Current humidity and temperature favor ${diseaseName} multiplication. Field scouting recommended.`,
      detectedAt: now.toISOString(),
      source: 'Disease Weather Engine',
      sourceDate: dateIso,
      requiresFollowUp: true,
      status: 'NEW',
      actionId: 'action-disease-scout',
    });
  }

  // ── 6. Irrigation Status Shift ──
  if (decisionResult?.irrigationRecommendation) {
    const irRec = decisionResult.irrigationRecommendation;
    if (irRec.status === 'WAIT' && irRec.reason?.toLowerCase().includes('rain')) {
      const id = generateEventFingerprint('IRRIGATION', dateIso, 'hold-rain');
      events.push({
        id,
        type: 'IRRIGATION',
        severity: 'MEDIUM',
        title: '💧 Hold Irrigation Ahead of Rain',
        summary: irRec.reason,
        detectedAt: now.toISOString(),
        source: 'Farm Decision Engine',
        sourceDate: dateIso,
        requiresFollowUp: false,
        status: 'NEW',
        actionId: 'action-irrigation',
      });
    }
  }

  // ── 7. Top Priority Action Change ──
  const topAction: FarmAction | undefined = plan?.topAction;
  if (topAction && topAction.priority === 'HIGH' && topAction.status !== 'NO_ACTION') {
    const id = generateEventFingerprint('ACTION_CHANGE', dateIso, topAction.id);
    events.push({
      id,
      type: 'ACTION_CHANGE',
      severity: 'HIGH',
      title: `🎯 Today's Action: ${topAction.title}`,
      summary: topAction.action,
      detail: topAction.reason,
      detectedAt: now.toISOString(),
      source: 'Farm Action Planner',
      sourceDate: dateIso,
      requiresFollowUp: false,
      status: 'NEW',
      actionId: topAction.id,
    });
  }

  // ── 8. Market Mandi Arrival ──
  if (marketPrices && marketPrices.length > 0) {
    const primary = marketPrices[0];
    const priceVal = primary.modalPrice ?? primary.price;
    const mandiName = primary.mandi ?? primary.market ?? 'mandi';
    if (primary.isOfficial && priceVal) {
      const id = generateEventFingerprint('MARKET_UPDATE', dateIso, `${primary.crop}-${mandiName}`);
      events.push({
        id,
        type: 'MARKET_UPDATE',
        severity: 'LOW',
        title: `💰 Mandi Price: ${primary.crop}`,
        summary: `AMIS quotes ${primary.crop} at Rs ${priceVal.toLocaleString()}/${primary.unit || 'maund'} in ${mandiName}.`,
        detectedAt: now.toISOString(),
        source: 'AMIS',
        sourceDate: primary.arrivalDate || dateIso,
        requiresFollowUp: false,
        status: 'NEW',
      });
    }
  }

  return events;
}

/**
 * Evaluates Farm Watch state, generates the brief, detects new meaningful changes,
 * deduplicates against dismissed/existing events, and updates local storage.
 */
export function updateFarmWatchWithCurrentState(
  params: EvaluateFarmWatchParams
): {
  brief: DailyFarmBrief;
  events: FarmWatchEvent[];
  newEvents: FarmWatchEvent[];
  state: FarmWatchState;
} {
  const currentState = getFarmWatchState();
  const now = params.currentDate || new Date();
  const currentSnapshot = extractWeatherSnapshot(params.weather, now);

  // Generate Brief
  const brief = generateDailyFarmBrief(params);

  // Detect Candidates
  const detectedCandidates = detectMeaningfulChanges({
    ...params,
    previousSnapshot: currentState.previousWeatherSnapshot,
  });

  // Deduplicate against existing events & dismissed fingerprints
  const existingMap = new Map<string, FarmWatchEvent>();
  currentState.events.forEach((ev) => existingMap.set(ev.id, ev));

  const dismissedSet = new Set(currentState.dismissedFingerprints);
  const newEvents: FarmWatchEvent[] = [];

  detectedCandidates.forEach((candidate) => {
    if (dismissedSet.has(candidate.id)) {
      return; // Farmer dismissed this event
    }

    if (!existingMap.has(candidate.id)) {
      existingMap.set(candidate.id, candidate);
      newEvents.push(candidate);
    }
  });

  // Sort events newest first
  const allEvents = Array.from(existingMap.values()).sort((a, b) => {
    const tA = Date.parse(a.detectedAt) || 0;
    const tB = Date.parse(b.detectedAt) || 0;
    return tB - tA;
  });

  // Calculate active & pending counts
  const activeAlerts = allEvents.filter((ev) => ev.status === 'NEW' || ev.status === 'FOLLOW_UP_NEEDED');
  const pendingFollowUps = allEvents.filter((ev) => ev.requiresFollowUp && ev.status !== 'RESOLVED' && !ev.farmerResponse);

  brief.activeAlertCount = activeAlerts.length;
  brief.followUpPendingCount = pendingFollowUps.length;

  const updatedState: FarmWatchState = {
    lastCheckedAt: now.toISOString(),
    previousWeatherSnapshot: currentSnapshot || currentState.previousWeatherSnapshot,
    events: allEvents.slice(0, 30), // keep latest 30 events for memory safety
    dismissedFingerprints: currentState.dismissedFingerprints,
  };

  saveFarmWatchState(updatedState);

  return {
    brief,
    events: updatedState.events,
    newEvents,
    state: updatedState,
  };
}

/**
 * Acknowledges an event without recording a follow-up.
 */
export function acknowledgeFarmWatchEvent(eventId: string): FarmWatchEvent | null {
  if (!eventId) return null;
  const state = getFarmWatchState();
  const index = state.events.findIndex((e) => e.id === eventId);
  if (index === -1) return null;

  const current = state.events[index];
  const nextStatus: FarmWatchEventStatus = current.requiresFollowUp && !current.farmerResponse
    ? 'FOLLOW_UP_NEEDED'
    : 'ACKNOWLEDGED';

  const updated: FarmWatchEvent = {
    ...current,
    status: nextStatus,
  };

  state.events[index] = updated;
  saveFarmWatchState(state);
  return updated;
}

/**
 * Records a farmer's "What happened?" follow-up answer and links it to Step 8 Farm Memory.
 */
export function recordFarmWatchFollowUp(
  input: FarmWatchFollowUpInput,
  farmContext?: import('../types/farm').FarmContext | null
): {
  event: FarmWatchEvent | null;
  outcome: FarmActionOutcome | null;
} {
  const { eventId, affected, impactCategory, note } = input;
  if (!eventId) {
    throw new Error('Cannot record follow-up: missing eventId.');
  }

  const state = getFarmWatchState();
  const index = state.events.findIndex((e) => e.id === eventId);
  if (index === -1) {
    console.warn(`[FarmWatch] Event ${eventId} not found for follow-up.`);
    return { event: null, outcome: null };
  }

  const currentEvent = state.events[index];
  const nowIso = new Date().toISOString();

  // Map event type to FarmActionCategory
  let actionCategory: import('../types/farmActionPlanner').FarmActionCategory = 'WEATHER';
  if (currentEvent.type === 'RAIN' || currentEvent.type === 'RAIN_FORECAST_CHANGE' || currentEvent.type === 'WIND') {
    actionCategory = 'SPRAYING';
  } else if (currentEvent.type === 'IRRIGATION') {
    actionCategory = 'IRRIGATION';
  } else if (currentEvent.type === 'DISEASE_WEATHER') {
    actionCategory = 'DISEASE';
  } else if (currentEvent.type === 'MARKET_UPDATE') {
    actionCategory = 'MARKET';
  }

  // Format observation note
  const impactLabel = impactCategory
    ? impactCategory === 'CROP'
      ? 'Crop condition affected'
      : impactCategory === 'SPRAY_WORK'
      ? 'Spraying / field work affected'
      : impactCategory === 'IRRIGATION'
      ? 'Irrigation schedule affected'
      : impactCategory === 'NO_VISIBLE_IMPACT'
      ? 'No visible crop impact'
      : 'Other field impact'
    : undefined;

  const observationSummary = [
    `Farmer-reported observation for ${currentEvent.title}:`,
    affected === 'YES' ? 'Field/work was affected.' : affected === 'NO' ? 'No impact observed.' : 'Impact uncertain.',
    impactLabel ? `Category: ${impactLabel}.` : '',
    note ? `Farmer note: "${note.trim()}".` : '',
  ].filter(Boolean).join(' ');

  // Save to Step 8 Farm Memory
  let createdOutcome: FarmActionOutcome | null = null;
  try {
    createdOutcome = saveFarmOutcome({
      actionId: currentEvent.actionId || currentEvent.id,
      actionCategory,
      actionTitle: currentEvent.title,
      actionDescription: currentEvent.summary,
      actionTaken: affected === 'YES' ? 'YES' : affected === 'NO' ? 'NO' : 'NOT_SURE',
      outcome: impactCategory === 'CROP' ? 'WORSE' : impactCategory === 'NO_VISIBLE_IMPACT' ? 'NO_CHANGE' : 'UNKNOWN',
      observation: observationSummary,
      notes: note?.trim() || undefined,
      crop: input.crop || farmContext?.crop || farmContext?.currentCrop,
      cropStage: input.cropStage || farmContext?.stage || farmContext?.cropStage,
      district: input.district || farmContext?.location || farmContext?.district,
    });
  } catch (err) {
    console.error('[FarmWatch] Failed to persist outcome to Farm Memory:', err);
  }

  // Update Event
  const updatedEvent: FarmWatchEvent = {
    ...currentEvent,
    status: 'RESOLVED',
    outcomeId: createdOutcome?.id || null,
    farmerResponse: {
      affected,
      impactCategory,
      note: note?.trim() || undefined,
      recordedAt: nowIso,
    },
  };

  state.events[index] = updatedEvent;
  saveFarmWatchState(state);

  return {
    event: updatedEvent,
    outcome: createdOutcome,
  };
}

/**
 * Dismisses an event so it won't trigger alerts again.
 */
export function dismissFarmWatchEvent(eventId: string): boolean {
  if (!eventId) return false;
  const state = getFarmWatchState();
  const existing = state.events.find((e) => e.id === eventId);
  if (!existing) return false;

  const updatedEvents = state.events.filter((e) => e.id !== eventId);
  const updatedDismissed = Array.from(new Set([...state.dismissedFingerprints, eventId]));

  saveFarmWatchState({
    ...state,
    events: updatedEvents,
    dismissedFingerprints: updatedDismissed,
  });

  return true;
}

/**
 * Dispatches window event when Farm Watch updates.
 */
function notifyFarmWatchUpdated(state: FarmWatchState): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<FarmWatchState>(FARM_WATCH_UPDATED_EVENT, { detail: state })
    );
  }
}
