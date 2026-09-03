/**
 * Saathi Disease + Weather Intelligence Engine
 *
 * Combines:
 *  1. Existing Disease Detection Result (DiseaseResult)
 *  2. Farm Context (FarmContext / Farm Memory)
 *  3. Weather Data (Open-Meteo WeatherData)
 *  4. Farm Decision Engine (FarmDecisionResult)
 *
 * To generate a practical, deterministic Disease Action Assessment without
 * diagnosing the disease again, re-calling external APIs, or sending private
 * data off-device.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY GUARANTEE:
 * All evaluations run 100% locally on the device. No farm details, coordinates,
 * or disease photos are transmitted to external services for this decision layer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type { DiseaseResult, Severity } from '../types';
import type { FarmContext } from '../types/farm';
import type { WeatherData } from './weather';
import { getFarmContext } from './farmContext';
import { loadCachedWeather } from './weather';
import { evaluateFarmDecisions } from './farmDecisionEngine';
import { evaluateCropLifecycle } from './cropLifecycle';
import type { FarmDecisionResult, SprayingStatus } from '../types/decision';
import type {
  DiseaseWeatherAssessment,
  TreatmentTiming,
  WeatherRiskLevel,
  RainRiskAssessment,
  HumidityRiskAssessment,
  WindRiskAssessment,
  TreatmentTimingAssessment,
  ImmediateActionPlan,
  DiseaseConfidenceAssessment,
  CropContextSummary,
} from '../types/diseaseWeather';

export interface DiseaseWeatherInput {
  diseaseResult: DiseaseResult;
  farmContext?: FarmContext | null;
  weather?: WeatherData | null;
  decisionResult?: FarmDecisionResult | null;
}

/**
 * Pure evaluation function combining disease result, farm context, and weather data.
 */
export function evaluateDiseaseWeather(input: DiseaseWeatherInput): DiseaseWeatherAssessment {
  const { diseaseResult, farmContext, weather, decisionResult } = input;

  const missingInformation: string[] = [];
  const uncertainty: string[] = [];
  const warnings: string[] = [];
  const immediateActions: string[] = [];
  const monitoringActions: string[] = [];

  // ── 1. Inspect Disease Result ─────────────────────────────────────────────
  const diseaseName = diseaseResult?.diseaseName || 'Unspecified Condition';
  const confidence = typeof diseaseResult?.confidence === 'number' ? diseaseResult.confidence : 0;
  const severity: Severity = diseaseResult?.severity || 'none';
  const isHealthy = severity === 'none' || diseaseName.toLowerCase().includes('healthy');

  // Confidence check
  const isLowConfidence = confidence > 0 && confidence < 70;
  let confidenceNote = `Diagnostic confidence: ${confidence}%.`;
  if (isLowConfidence) {
    confidenceNote = `Diagnosis confidence is below 70% (${confidence}%). Symptoms could resemble nutrient deficiency or environmental stress. Consider consulting an agronomic extension specialist or capturing another photo under even lighting before spraying.`;
    uncertainty.push(`AI confidence is ${confidence}% — visual symptoms may overlap with other foliar disorders.`);
  }

  const confidenceAssessment: DiseaseConfidenceAssessment = {
    confidence,
    isLowConfidence,
    confidenceNote,
  };

  // ── 2. Inspect Farm Context & Crop Lifecycle ─────────────────────────────
  const lifecycleContext = evaluateCropLifecycle(farmContext);
  const profileCrop = farmContext?.currentCrop?.trim() || undefined;
  const cropIdentified = diseaseResult?.cropType?.trim() || 'Unknown crop';
  const cropStage = farmContext?.cropStage?.trim() || undefined;
  const isStageKnown = Boolean(cropStage && cropStage.length > 0);

  if (!profileCrop) {
    missingInformation.push(`Target crop was not specified in farm profile; evaluated against detected crop (${cropIdentified}).`);
  }
  if (!isStageKnown) {
    missingInformation.push('Crop stage is not available, so this assessment is based on general weather conditions.');
  }

  const cropContext: CropContextSummary = {
    cropIdentified,
    profileCrop,
    cropStage,
    isStageKnown,
    daysSinceSowing: lifecycleContext.daysSinceSowing,
    lifecycleProgress: lifecycleContext.lifecycleProgress,
  };

  // ── 3. Inspect Weather Parameters ────────────────────────────────────────
  let rainProb = 0;
  let expectedRainMm = 0;
  let currentWind = 0;
  let maxWind = 0;
  let humidity: number | undefined;
  let tomorrowRainProb = 0;
  let tomorrowBetterForSpraying = false;

  if (!weather) {
    missingInformation.push('Weather forecast is currently unavailable; timing recommendations are based on standard agronomic best practices.');
    uncertainty.push('Real-time rain and wind probabilities could not be retrieved.');
  } else {
    // Current conditions
    currentWind = weather.current?.windSpeed ?? 0;
    humidity = weather.current?.humidity;

    // Today / 24h Forecast
    const todayForecast = weather.forecast?.[0];
    const tomorrowForecast = weather.forecast?.[1];

    if (todayForecast) {
      rainProb = todayForecast.precipitationProbabilityMax ?? 0;
      expectedRainMm = todayForecast.precipitationSum ?? 0;
      maxWind = todayForecast.windSpeedMax ?? currentWind;
    } else {
      maxWind = currentWind;
    }

    if (tomorrowForecast) {
      tomorrowRainProb = tomorrowForecast.precipitationProbabilityMax ?? 0;
    }

    if (weather.agricultural?.tomorrowComparison) {
      tomorrowBetterForSpraying = weather.agricultural.tomorrowComparison.tomorrowBetterForWork;
    } else if (tomorrowForecast && todayForecast) {
      tomorrowBetterForSpraying =
        (tomorrowForecast.precipitationProbabilityMax ?? 0) < (todayForecast.precipitationProbabilityMax ?? 0) &&
        (tomorrowForecast.windSpeedMax ?? 0) <= (todayForecast.windSpeedMax ?? 0);
    }
  }

  // Derive existing spraying assessment if decisionResult is supplied
  const existingSprayingStatus: SprayingStatus =
    decisionResult?.sprayingDecision?.status ??
    (weather?.agricultural?.sprayingAssessment?.suitable
      ? 'suitable'
      : weather?.agricultural?.sprayingAssessment?.windStatus === 'high_drift_risk'
      ? 'avoid'
      : 'caution');

  // ── 4. Decision 1: Spray / Treatment Timing ──────────────────────────────
  let treatmentTiming: TreatmentTiming = 'suitable';
  let timingHeadline = 'Current weather conditions appear suitable for treatment timing.';
  let timingReason = 'Low probability of precipitation and favorable wind speeds support uniform application and absorption.';
  let recommendedWindow = 'Next 4 to 6 hours during morning or late afternoon.';

  if (isHealthy) {
    treatmentTiming = 'not_applicable';
    timingHeadline = 'No treatment application required.';
    timingReason = 'The leaf exhibits healthy characteristics without visible disease symptoms.';
    recommendedWindow = 'Maintain regular inspection schedule.';
  } else if (!weather) {
    treatmentTiming = 'caution';
    timingHeadline = 'Weather data unavailable — verify conditions before spraying.';
    timingReason = 'Ensure wind is calm (< 15 km/h) and no rain is expected within 4–6 hours of treatment.';
    recommendedWindow = 'Early morning or late afternoon when winds are calmest.';
  } else {
    const isHighRainRisk = rainProb >= 50 || expectedRainMm >= 2.0;
    const isModerateRainRisk = (rainProb >= 30 && rainProb < 50) || (expectedRainMm >= 0.5 && expectedRainMm < 2.0);
    const isHighWindRisk = currentWind >= 25 || maxWind >= 30;
    const isModerateWindRisk = currentWind >= 15 && currentWind < 25;

    if (isHighRainRisk && isHighWindRisk) {
      treatmentTiming = 'avoid';
      timingHeadline = 'Rain and wind risks are elevated. Postpone treatment.';
      timingReason = `High rain probability (${rainProb}%) and strong winds (${Math.round(currentWind)} km/h) present high risks of chemical drift and wash-off.`;
      recommendedWindow = tomorrowBetterForSpraying
        ? 'Consider waiting until tomorrow when conditions may improve.'
        : 'Wait for a clearer, calmer weather window.';
    } else if (isHighRainRisk) {
      treatmentTiming = 'avoid';
      timingHeadline = 'Rain risk is high during the available window. Consider postponing treatment.';
      timingReason = `Forecast indicates a ${rainProb}% chance of precipitation (${expectedRainMm.toFixed(1)} mm expected), which may wash away foliar applications before absorption.`;
      recommendedWindow = tomorrowBetterForSpraying
        ? 'Tomorrow appears to offer a drier window than today.'
        : 'Postpone treatment until rain probability drops below 30%.';
    } else if (isHighWindRisk) {
      treatmentTiming = 'avoid';
      timingHeadline = 'Wind conditions may increase spray drift. Consider a calmer treatment window.';
      timingReason = `Current wind speed of ${Math.round(currentWind)} km/h (peak gusts up to ${Math.round(maxWind)} km/h) will cause significant chemical drift off target foliage.`;
      recommendedWindow = 'Early morning or dusk when thermal winds subside.';
    } else if (isModerateRainRisk || isModerateWindRisk) {
      treatmentTiming = 'caution';
      timingHeadline = 'Weather conditions may reduce treatment effectiveness. Consider a better weather window.';
      if (isModerateRainRisk && isModerateWindRisk) {
        timingReason = `Marginal precipitation chance (${rainProb}%) coupled with a moderate breeze (${Math.round(currentWind)} km/h) may lower application efficiency.`;
      } else if (isModerateRainRisk) {
        timingReason = `Forecast indicates a ${rainProb}% chance of light precipitation. If spraying, use an appropriate sticking agent or wait for drier forecast.`;
      } else {
        timingReason = `Breeze at ${Math.round(currentWind)} km/h may cause slight drift with fine spray nozzles.`;
      }
      recommendedWindow = tomorrowBetterForSpraying
        ? 'Tomorrow forecast suggests calmer, more stable conditions.'
        : 'Early morning spray window before midday winds pick up.';
    } else {
      treatmentTiming = 'suitable';
      timingHeadline = 'Current weather conditions appear suitable for treatment timing.';
      timingReason = `Dry forecast (${rainProb}% rain chance) and calm wind (${Math.round(currentWind)} km/h) allow optimal leaf contact and retention.`;
      recommendedWindow = 'Morning window (after dew evaporates) or late afternoon.';
    }
  }

  const treatmentTimingAssessment: TreatmentTimingAssessment = {
    timing: treatmentTiming,
    headline: timingHeadline,
    reason: timingReason,
    recommendedWindow,
  };

  // ── 5. Decision 2: Rain / Wash-off Risk ───────────────────────────────────
  let rainRiskLevel: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown';
  let rainHeadline = 'No immediate precipitation hazard detected.';
  let rainDescription = 'Precipitation risk appears low for the upcoming treatment window.';

  if (weather) {
    if (rainProb >= 50 || expectedRainMm >= 2.0) {
      rainRiskLevel = 'high';
      rainHeadline = `High Rain Risk (${rainProb}% probability)`;
      rainDescription = `Forecast indicates a ${rainProb}% chance of precipitation (~${expectedRainMm.toFixed(1)} mm). Rain risk may reduce treatment effectiveness through wash-off.`;
      warnings.push(`Forecast indicates a ${rainProb}% chance of precipitation. Wash-off hazard is elevated.`);
    } else if (rainProb >= 30 || expectedRainMm >= 0.5) {
      rainRiskLevel = 'moderate';
      rainHeadline = `Moderate Rain Risk (${rainProb}% probability)`;
      rainDescription = `Forecast indicates a ${rainProb}% chance of precipitation. Light showers could partially dilute unabsorbed foliar treatments.`;
    } else {
      rainRiskLevel = 'low';
      rainHeadline = `Low Rain Risk (${rainProb}% probability)`;
      rainDescription = `Low probability of precipitation (${rainProb}%) over the next 24 hours. Foliar treatments have adequate dry time.`;
    }
  }

  const rainRisk: RainRiskAssessment = {
    level: rainRiskLevel,
    probability: rainProb,
    expectedAmountMm: expectedRainMm,
    headline: rainHeadline,
    description: rainDescription,
  };

  // ── 6. Decision 3: Humidity / Disease-Favorable Weather ───────────────────
  let humidityLevel: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown';
  let humidityHeadline = 'Normal atmospheric humidity';
  let humidityDescription = 'Ambient humidity levels do not indicate acute foliar moisture stress.';

  if (typeof humidity === 'number') {
    if (humidity >= 75) {
      humidityLevel = 'high';
      humidityHeadline = `High Relative Humidity (${Math.round(humidity)}%)`;
      humidityDescription = `High humidity (${Math.round(humidity)}%) and prolonged wet foliage may favor fungal and bacterial disease proliferation. Note: this is a general environmental condition, not a confirmation of disease transmission.`;
      warnings.push(`High atmospheric humidity (${Math.round(humidity)}%) is conducive to foliar moisture retention.`);
    } else if (humidity >= 50) {
      humidityLevel = 'moderate';
      humidityHeadline = `Moderate Relative Humidity (${Math.round(humidity)}%)`;
      humidityDescription = `Moderate ambient moisture (${Math.round(humidity)}%). Routine disease surveillance advised across crop rows.`;
    } else {
      humidityLevel = 'low';
      humidityHeadline = `Low Relative Humidity (${Math.round(humidity)}%)`;
      humidityDescription = `Dry ambient air (${Math.round(humidity)}%) generally limits extended leaf wetness durations.`;
    }
  }

  const humidityRisk: HumidityRiskAssessment = {
    level: humidityLevel,
    currentHumidity: humidity,
    headline: humidityHeadline,
    description: humidityDescription,
  };

  // ── 7. Decision 4: Wind Assessment ───────────────────────────────────────
  let windLevel: 'low' | 'moderate' | 'high' | 'unknown' = 'unknown';
  let windHeadline = 'Calm to light air';
  let windDescription = 'Wind speeds are favorable for localized foliar intervention.';

  if (weather) {
    if (currentWind >= 25 || maxWind >= 30) {
      windLevel = 'high';
      windHeadline = `High Wind Risk (${Math.round(currentWind)} km/h, gusts to ${Math.round(maxWind)} km/h)`;
      windDescription = 'Wind conditions may increase spray drift significantly. Avoid chemical spraying during high wind gusts.';
      warnings.push(`Wind speed (${Math.round(currentWind)} km/h) exceeds safe spraying thresholds (15–20 km/h).`);
    } else if (currentWind >= 15) {
      windLevel = 'moderate';
      windHeadline = `Moderate Wind (${Math.round(currentWind)} km/h)`;
      windDescription = 'Brisk breeze. Droplets may drift downwind. Use low-drift nozzles or delay application until wind subsides.';
    } else {
      windLevel = 'low';
      windHeadline = `Calm Wind (${Math.round(currentWind)} km/h)`;
      windDescription = 'Wind is calm and within the optimal 5–12 km/h spraying range.';
    }
  }

  const windRisk: WindRiskAssessment = {
    level: windLevel,
    currentSpeedKmH: currentWind,
    maxSpeedKmH: maxWind,
    headline: windHeadline,
    description: windDescription,
  };

  // ── 8. Decision 5: Severity & Action Guidance ─────────────────────────────
  // Respect severity returned by Disease Detection without modifying it
  if (isHealthy) {
    monitoringActions.push('Continue standard agronomic monitoring and balanced irrigation.');
    monitoringActions.push('Re-inspect leaf health every 7–10 days.');
  } else if (severity === 'low') {
    monitoringActions.push('Continue monitoring the field and follow appropriate agronomic guidance.');
    monitoringActions.push('Inspect neighboring rows to verify whether symptoms are isolated or spreading.');
    immediateActions.push('Remove isolated infected leaves if practical to reduce local spore load.');
  } else if (severity === 'moderate') {
    immediateActions.push('Consider timely intervention and closer monitoring over the next 48 hours.');
    if (treatmentTiming === 'suitable') {
      immediateActions.push('Prepare recommended treatment supplies for application during the current favorable window.');
    } else {
      immediateActions.push('Delay application until the weather window improves to prevent wasted input costs.');
    }
    monitoringActions.push('Check the undersides of leaves in 20 random plants across the field.');
    monitoringActions.push('Verify if symptoms advance after morning dew.');
  } else if (severity === 'high' || severity === 'severe') {
    immediateActions.push('Prompt agronomic attention may be warranted to prevent broader crop damage.');
    if (treatmentTiming === 'suitable') {
      immediateActions.push('Apply targeted agronomic intervention promptly while wind and rain conditions remain calm.');
    } else {
      immediateActions.push('Identify the earliest sheltered or calm window to apply treatment without drift or wash-off.');
    }
    monitoringActions.push('Flag affected field sections to evaluate treatment efficacy 3 days post-application.');
    monitoringActions.push('Consult your local district agriculture extension officer for verified regional recommendations.');
  }

  // Include user treatments from the existing disease result if available
  if (Array.isArray(diseaseResult?.treatment) && diseaseResult.treatment.length > 0) {
    // Note: Do not prescribe chemicals, just reference the existing AI suggestions
  } else if (!isHealthy) {
    missingInformation.push('Specific treatment steps were not detailed in the diagnosis result; standard field hygiene applies.');
  }

  // ── 9. Decision 6: Immediate Action Plan ──────────────────────────────────
  const weatherSummaryText = weather
    ? `Rain prob: ${rainProb}%, Wind: ${Math.round(currentWind)} km/h, Humidity: ${humidity !== undefined ? `${Math.round(humidity)}%` : 'N/A'}`
    : 'Weather forecast unavailable';

  let nextActionText = '';
  if (isHealthy) {
    nextActionText = 'No chemical treatment needed. Maintain healthy soil moisture and regular crop scouting.';
  } else if (treatmentTiming === 'avoid') {
    nextActionText = 'Hold off on chemical or foliar spraying. Monitor the affected area and wait for a drier, calmer window.';
  } else if (treatmentTiming === 'caution') {
    nextActionText = 'Review local forecast before mixing inputs. Consider waiting for the calmest part of the day.';
  } else {
    nextActionText = 'Proceed with planned intervention if required, ensuring proper personal protective equipment.';
  }

  let weatherWindowText = '';
  if (isHealthy) {
    weatherWindowText = 'Conditions are standard for vegetative maintenance.';
  } else if (tomorrowBetterForSpraying) {
    weatherWindowText = `Tomorrow forecast appears more favorable (${tomorrowRainProb}% rain chance) than current conditions.`;
  } else if (treatmentTiming === 'suitable') {
    weatherWindowText = 'Current window (next 4–6 hours) appears favorable before evening humidity rise.';
  } else {
    weatherWindowText = 'Monitor local radar and delay application until rain and wind risks drop.';
  }

  const actionPlan: ImmediateActionPlan = {
    disease: diseaseName,
    severity,
    weatherSummary: weatherSummaryText,
    treatmentTiming,
    why: timingReason,
    nextAction: nextActionText,
    weatherWindow: weatherWindowText,
  };

  // Weather risk level composite
  let weatherRisk: WeatherRiskLevel = 'low';
  if (!weather) {
    weatherRisk = 'unknown';
  } else if (rainRisk.level === 'high' || windRisk.level === 'high') {
    weatherRisk = 'high';
  } else if (rainRisk.level === 'moderate' || windRisk.level === 'moderate' || humidityRisk.level === 'high') {
    weatherRisk = 'moderate';
  }

  return {
    disease: diseaseName,
    diseaseConfidence: confidence,
    severity,
    weatherRisk,
    treatmentTiming: treatmentTimingAssessment,
    spraySuitability: existingSprayingStatus,
    rainRisk,
    humidityRisk,
    windRisk,
    immediateActions,
    monitoringActions,
    warnings,
    actionPlan,
    confidence: confidenceAssessment,
    uncertainty,
    missingInformation,
    cropContext,
    lifecycleContext,
    generatedAt: Date.now(),
  };
}

/**
 * Convenience helper to evaluate disease weather assessment using current
 * stored farm context and cached weather data.
 */
export function getDiseaseWeatherAssessment(diseaseResult: DiseaseResult): DiseaseWeatherAssessment {
  const farmContext = getFarmContext();
  const weather = loadCachedWeather();
  const decisionResult = weather ? evaluateFarmDecisions(farmContext, weather) : null;

  return evaluateDiseaseWeather({
    diseaseResult,
    farmContext,
    weather,
    decisionResult,
  });
}
