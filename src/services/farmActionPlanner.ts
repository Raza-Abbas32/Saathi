/**
 * Saathi Farm Action Planner Service
 *
 * Deterministic service answering:
 * "What should I do today, why, when, and with what confidence?"
 *
 * Combines existing signals:
 * 1. Farm Context (FarmContext / Farm Memory)
 * 2. Weather Data (Open-Meteo WeatherData)
 * 3. Farm Decision Engine (FarmDecisionResult)
 * 4. Disease + Weather Intelligence (DiseaseWeatherAssessment)
 * 5. Crop Lifecycle Intelligence (CropLifecycleContext)
 * 6. Government Market Prices (AMIS Punjab)
 * 7. Economic Impact Intelligence (EconomicImpactResult)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 SAFETY, PRIVACY, & ARCHITECTURAL GUARANTEES:
 * 1. ZERO AI/LLM: 100% deterministic local TypeScript logic. No Gemini calls.
 * 2. ZERO EXTERNAL NETWORK REQUESTS: Pure offline calculation on client memory.
 * 3. TRANSPARENT PROVENANCE: Every action is backed by explicit evidence bullets
 *    and source signals.
 * 4. REVERENCE FOR TRUTH: Does not invent pesticide doses, price predictions,
 *    or fake percentages. If information is missing, explicitly states it.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  FarmAction,
  FarmActionPlan,
  FarmActionPriority,
  FarmActionCategory,
  FarmActionStatus,
  FarmActionDataCompleteness,
  EvaluateFarmActionPlanParams,
} from '../types/farmActionPlanner';
import { evaluateFarmDecisions } from './farmDecisionEngine';
import { evaluateCropLifecycle, getQualitativePhase } from './cropLifecycle';
import { evaluateEconomicImpact } from './economicImpactEngine';
import type { CropStage } from '../types/farm';

/**
 * Weights for deterministic action sorting
 */
const PRIORITY_WEIGHTS: Record<FarmActionPriority, number> = {
  HIGH: 300,
  MEDIUM: 200,
  LOW: 100,
};

const CATEGORY_WEIGHTS: Record<FarmActionCategory, number> = {
  DISEASE: 90,
  SPRAYING: 85,
  WEATHER: 80,
  IRRIGATION: 70,
  SCOUTING: 60,
  CROP_LIFECYCLE: 50,
  MARKET: 40,
  ECONOMIC: 30,
  GENERAL: 10,
};

const STATUS_WEIGHTS: Record<FarmActionStatus, number> = {
  ACTION_REQUIRED: 5,
  WAIT: 4,
  MONITOR: 3,
  NO_ACTION: 2,
  INSUFFICIENT_DATA: 1,
};

/**
 * Pure evaluation function generating a deterministic daily farm action plan.
 */
export function evaluateFarmActionPlan(params: EvaluateFarmActionPlanParams): FarmActionPlan {
  const {
    farmContext,
    weather,
    diseaseResult,
    diseaseAssessment,
    currentDate = new Date(),
  } = params;

  // 1. Resolve or compute decisionResult
  const decisionResult =
    params.decisionResult ??
    (weather ? evaluateFarmDecisions(farmContext, weather) : null);

  // 2. Resolve or compute lifecycleContext
  const lifecycleContext =
    params.lifecycleContext ?? evaluateCropLifecycle(farmContext, currentDate);

  // 3. Resolve or compute economicImpact
  const economicImpact =
    params.economicImpact ??
    (params.marketPrices && params.marketPrices.length > 0
      ? evaluateEconomicImpact({
          farmContext,
          marketPrices: params.marketPrices,
          diseaseAssessment,
          decisionResult,
          currentDate,
        })
      : null);

  const actions: FarmAction[] = [];
  const missingDataFields: string[] = [];

  // Track data completeness
  if (!farmContext?.currentCrop || !farmContext.currentCrop.trim()) {
    missingDataFields.push('Crop name in Farm Profile');
  }
  if (!farmContext?.cropStage || !farmContext.cropStage.trim()) {
    missingDataFields.push('Crop growth stage');
  }
  if (!farmContext?.sowingDate || !farmContext.sowingDate.trim()) {
    missingDataFields.push('Sowing date');
  }
  if (!farmContext?.district || !farmContext.district.trim()) {
    missingDataFields.push('Farm district / location');
  }
  if (!weather) {
    missingDataFields.push('Real-time weather data');
  }
  if (
    weather &&
    weather.current?.soilMoisture0to1cm === undefined &&
    weather.agricultural?.soilMoistureRootZone === undefined
  ) {
    missingDataFields.push('Soil moisture sensor/model data');
  }

  let completenessStatus: FarmActionDataCompleteness['status'] = 'GOOD';
  if (!farmContext?.currentCrop || !weather) {
    completenessStatus = 'LIMITED';
  } else if (!farmContext?.cropStage || !farmContext?.sowingDate) {
    completenessStatus = 'PARTIAL';
  }

  const dataCompleteness: FarmActionDataCompleteness = {
    status: completenessStatus,
    missing: missingDataFields,
  };

  // ── A. DISEASE & SPRAYING ACTIONS ──────────────────────────────────────────
  if (diseaseAssessment) {
    const timing = diseaseAssessment.treatmentTiming.timing;
    const diseaseName = diseaseAssessment.diseaseResult.diseaseName;
    const severity = diseaseAssessment.diseaseResult.severity;
    const isLowConf = diseaseAssessment.confidenceAssessment.isLowConfidence;

    if (timing === 'avoid') {
      actions.push({
        id: 'action-disease-avoid-spray',
        priority: 'HIGH',
        category: 'DISEASE',
        status: 'WAIT',
        title: 'Avoid Applying Crop Treatment',
        action: 'Postpone spraying or chemical application during this weather window.',
        reason: diseaseAssessment.treatmentTiming.headline,
        timing: 'Current weather window',
        confidence: isLowConf ? 'MEDIUM' : 'HIGH',
        evidence: [
          diseaseAssessment.treatmentTiming.headline,
          ...diseaseAssessment.warnings.slice(0, 2),
          `Target condition: ${diseaseName} (${severity} severity)`,
        ].filter(Boolean),
        sourceSignals: ['DiseaseWeatherAssessment', 'WeatherData', 'DiseaseResult'],
        limitations: [
          'Saathi does not have a validated pesticide-specific wash-off model for this chemical. Field conditions must be verified before spraying.',
        ],
      });
    } else if (timing === 'caution') {
      actions.push({
        id: 'action-disease-caution-spray',
        priority: 'MEDIUM',
        category: 'SPRAYING',
        status: 'MONITOR',
        title: 'Exercise Caution If Spraying',
        action: 'Check wind speed and cloud cover at field level before applying treatment.',
        reason: diseaseAssessment.treatmentTiming.headline,
        timing: 'Next 6–12 hours',
        confidence: 'MEDIUM',
        evidence: [
          diseaseAssessment.treatmentTiming.headline,
          ...diseaseAssessment.warnings.slice(0, 2),
        ].filter(Boolean),
        sourceSignals: ['DiseaseWeatherAssessment', 'WeatherData'],
        limitations: [
          'Adhere to pesticide label buffer zones and use anti-drift nozzles under moderate winds.',
        ],
      });
    } else if (timing === 'suitable') {
      actions.push({
        id: 'action-disease-suitable-spray',
        priority: 'MEDIUM',
        category: 'SPRAYING',
        status: 'ACTION_REQUIRED',
        title: 'Favorable Window For Treatment',
        action: 'Proceed with planned crop treatment if required for diagnosed condition.',
        reason:
          diseaseAssessment.treatmentTiming.headline ||
          'Current wind and rain conditions are within favorable application parameters.',
        timing: 'Current favorable window',
        confidence: isLowConf ? 'MEDIUM' : 'HIGH',
        evidence: [
          'Favorable spraying window (low rain risk, safe wind speeds)',
          `Target condition: ${diseaseName}`,
        ],
        sourceSignals: ['DiseaseWeatherAssessment', 'WeatherData'],
        limitations: [
          'Follow official label rates, pre-harvest intervals (PHI), and safety standards.',
        ],
      });
    }
  } else if (decisionResult?.sprayingDecision) {
    const spray = decisionResult.sprayingDecision;
    if (spray.status === 'avoid') {
      actions.push({
        id: 'action-spraying-avoid',
        priority: 'HIGH',
        category: 'SPRAYING',
        status: 'WAIT',
        title: 'Avoid Spraying Operations',
        action: 'Do not spray crops during the current weather window.',
        reason: spray.reason,
        timing: 'Today / Current window',
        confidence: weather ? 'HIGH' : 'MEDIUM',
        evidence: [spray.headline, spray.reason],
        sourceSignals: ['FarmDecisionEngine (Spraying)', 'WeatherData'],
        limitations: ['Local microclimates and tree/crop shelter may modify actual wind drift.'],
      });
    } else if (spray.status === 'caution') {
      actions.push({
        id: 'action-spraying-caution',
        priority: 'MEDIUM',
        category: 'SPRAYING',
        status: 'MONITOR',
        title: 'Caution For Spraying',
        action: 'Review wind and cloud conditions before spraying.',
        reason: spray.reason,
        timing: 'Next 6–12 hours',
        confidence: weather ? 'HIGH' : 'MEDIUM',
        evidence: [spray.headline, spray.reason],
        sourceSignals: ['FarmDecisionEngine (Spraying)', 'WeatherData'],
        limitations: ['Use drift-reduction nozzles and check wind speed at canopy height.'],
      });
    } else if (spray.status === 'suitable') {
      actions.push({
        id: 'action-spraying-suitable',
        priority: 'LOW',
        category: 'SPRAYING',
        status: 'MONITOR',
        title: 'Spraying Window Favorable',
        action: 'Weather conditions are suitable if spraying operations are planned.',
        reason: spray.reason,
        timing: 'Current weather window',
        confidence: 'HIGH',
        evidence: [
          spray.headline,
          `Wind: ${spray.windSpeedKmH} km/h, Rain prob: ${spray.precipitationProbability}%`,
        ],
        sourceSignals: ['FarmDecisionEngine (Spraying)', 'WeatherData'],
      });
    }
  }

  // ── B. SCOUTING ACTION ─────────────────────────────────────────────────────
  const targetDiseaseResult = diseaseAssessment?.diseaseResult || diseaseResult;
  if (targetDiseaseResult) {
    const conf = targetDiseaseResult.confidence ?? 0;
    const isLowConf = conf > 0 && conf < 70;
    const severity = targetDiseaseResult.severity;

    if (isLowConf) {
      actions.push({
        id: 'action-scouting-verify-diagnosis',
        priority: 'MEDIUM',
        category: 'SCOUTING',
        status: 'ACTION_REQUIRED',
        title: 'Scout Affected Crop Area',
        action: 'Inspect affected plants in the field to verify foliar symptoms.',
        reason: `Diagnosis confidence is limited (${conf}%). Visual symptoms may overlap with nutrient deficiencies or environmental stress.`,
        timing: 'Before applying chemical treatments',
        confidence: 'HIGH',
        evidence: [
          `Diagnostic confidence: ${conf}%`,
          `Detected condition: ${targetDiseaseResult.diseaseName}`,
        ],
        sourceSignals: ['DiseaseResult', 'DiseaseWeatherAssessment'],
        limitations: [
          'Visual image analysis is indicative and requires physical field verification.',
        ],
      });
    } else if (severity === 'high' || severity === 'severe') {
      actions.push({
        id: 'action-scouting-disease-spread',
        priority: 'MEDIUM',
        category: 'SCOUTING',
        status: 'ACTION_REQUIRED',
        title: 'Monitor Disease Spread',
        action: 'Scout surrounding rows to check if foliar lesions are spreading to healthy plants.',
        reason: `High disease severity detected for ${targetDiseaseResult.diseaseName}. Regular field scouting prevents unnoticed field-wide outbreaks.`,
        timing: 'Next 24–48 hours',
        confidence: 'HIGH',
        evidence: [
          `Condition: ${targetDiseaseResult.diseaseName}`,
          `Severity: ${severity}`,
        ],
        sourceSignals: ['DiseaseResult'],
      });
    }
  }

  // ── C. IRRIGATION ACTION ───────────────────────────────────────────────────
  if (decisionResult?.irrigationDecision) {
    const irr = decisionResult.irrigationDecision;
    if (irr.status === 'delay') {
      const isHighRainRisk =
        (irr.expectedPrecipitationMm !== undefined && irr.expectedPrecipitationMm >= 4) ||
        (irr.precipitationProbability !== undefined && irr.precipitationProbability >= 60);

      actions.push({
        id: 'action-irrigation-delay',
        priority: isHighRainRisk ? 'HIGH' : 'MEDIUM',
        category: 'IRRIGATION',
        status: 'WAIT',
        title: 'Delay Scheduled Irrigation',
        action: 'Hold off on irrigation and reassess soil moisture after expected rainfall.',
        reason: irr.reason,
        timing: 'Next 24 hours',
        confidence: weather ? 'HIGH' : 'MEDIUM',
        evidence: [
          irr.headline,
          irr.reason,
          `Rain forecast: ~${irr.expectedPrecipitationMm?.toFixed(1) ?? 0} mm (${irr.precipitationProbability ?? 0}% probability)`,
        ].filter(Boolean),
        sourceSignals: ['FarmDecisionEngine (Irrigation)', 'WeatherData'],
        limitations: [
          irr.details ||
            'Irrigation need cannot be quantified from soil moisture if sensor or depth model data is unavailable.',
        ],
      });
    } else if (irr.status === 'irrigate') {
      actions.push({
        id: 'action-irrigation-needed',
        priority: 'MEDIUM',
        category: 'IRRIGATION',
        status: 'ACTION_REQUIRED',
        title: 'Review Irrigation Timing',
        action: 'Plan irrigation to meet crop evapotranspiration demand.',
        reason: irr.reason,
        timing: 'Next 24–48 hours',
        confidence: weather ? 'HIGH' : 'MEDIUM',
        evidence: [irr.headline, irr.reason],
        sourceSignals: ['FarmDecisionEngine (Irrigation)', 'WeatherData'],
        limitations: [
          'Exact water volume (liters/acre) depends on field soil intake rate and canal/tube-well capacity.',
        ],
      });
    } else if (irr.status === 'adequate') {
      actions.push({
        id: 'action-irrigation-adequate',
        priority: 'LOW',
        category: 'IRRIGATION',
        status: 'MONITOR',
        title: 'Adequate Moisture Balance',
        action: 'Maintain routine moisture monitoring; no immediate irrigation needed.',
        reason: irr.reason,
        timing: 'Next 24–48 hours',
        confidence: 'HIGH',
        evidence: [irr.headline, irr.reason],
        sourceSignals: ['FarmDecisionEngine (Irrigation)'],
      });
    }
  }

  // ── D. WEATHER HAZARDS (HEAT STRESS & WIND) ────────────────────────────────
  if (decisionResult?.heatStressDecision) {
    const heat = decisionResult.heatStressDecision;
    const maxTemp = heat.maxTempToday;
    const isSevereHeat = maxTemp >= 40 || heat.level === 'high';

    if (isSevereHeat) {
      actions.push({
        id: 'action-weather-heat-severe',
        priority: maxTemp >= 40 ? 'HIGH' : 'MEDIUM',
        category: 'WEATHER',
        status: 'ACTION_REQUIRED',
        title: 'Severe Heat Stress Precaution',
        action: 'Protect crop hydration and restrict strenuous field labor to early morning/evening hours.',
        reason: heat.reason,
        timing: 'Peak afternoon (12 PM – 4 PM)',
        confidence: 'HIGH',
        evidence: [heat.headline, `Forecast Max Temp: ${maxTemp}°C`],
        sourceSignals: ['FarmDecisionEngine (Heat Stress)', 'WeatherData'],
      });
    } else if (heat.level === 'moderate') {
      actions.push({
        id: 'action-weather-heat-high',
        priority: 'MEDIUM',
        category: 'WEATHER',
        status: 'MONITOR',
        title: 'High Temperature Alert',
        action: 'Monitor field moisture; elevated evapotranspiration expected.',
        reason: heat.reason,
        timing: 'Afternoon window',
        confidence: 'HIGH',
        evidence: [heat.headline, `Max Temp: ${maxTemp}°C`],
        sourceSignals: ['FarmDecisionEngine (Heat Stress)', 'WeatherData'],
      });
    }
  }

  if (decisionResult?.windDecision) {
    const wind = decisionResult.windDecision;
    // Only add a separate wind action if risk is high and not already covered under high-priority spraying
    const hasHighSprayingAvoid = actions.some(
      (a) => a.priority === 'HIGH' && (a.category === 'SPRAYING' || a.category === 'DISEASE')
    );

    if (wind.risk === 'high' && !hasHighSprayingAvoid) {
      actions.push({
        id: 'action-weather-wind-danger',
        priority: 'MEDIUM',
        category: 'WEATHER',
        status: 'MONITOR',
        title: 'Strong Gusts / Wind Hazard',
        action: 'Check windbreak protections and secure nursery / tunnel covers.',
        reason: wind.reason,
        timing: 'Today',
        confidence: 'HIGH',
        evidence: [wind.headline, `Current Wind Speed: ${wind.currentWindSpeed} km/h`],
        sourceSignals: ['FarmDecisionEngine (Wind)', 'WeatherData'],
      });
    }
  }

  // ── E. CROP LIFECYCLE ACTION ───────────────────────────────────────────────
  const rawStage = farmContext?.cropStage || lifecycleContext?.currentStage;
  if (rawStage) {
    const stageLower = rawStage.toLowerCase();
    const isReproductive =
      stageLower.includes('flower') ||
      stageLower.includes('heading') ||
      stageLower.includes('fruit') ||
      stageLower.includes('grain') ||
      lifecycleContext?.lifecycleProgress === 'reproductive' ||
      getQualitativePhase(rawStage as CropStage) === 'reproductive';

    if (isReproductive) {
      actions.push({
        id: 'action-lifecycle-reproductive',
        priority: 'MEDIUM',
        category: 'CROP_LIFECYCLE',
        status: 'MONITOR',
        title: `Reproductive Phase: ${rawStage}`,
        action: 'Prioritize water consistency and pest scouting during flowering and fruit setting.',
        reason:
          'Reproductive growth stages have peak physiological sensitivity to moisture stress and foliar pests.',
        timing: 'Current crop stage',
        confidence: 'HIGH',
        evidence: [
          `Farmer-selected stage: ${rawStage}`,
          `Crop: ${farmContext?.currentCrop || lifecycleContext?.crop || 'Field crop'}`,
        ],
        sourceSignals: ['CropLifecycleContext', 'FarmContext'],
        limitations: [
          'Stage timing is based on farmer-selected stage, preserving the farmer as the source of truth.',
        ],
      });
    } else if (
      lifecycleContext?.stageConsistency === 'possibly_inconsistent' ||
      (lifecycleContext?.daysSinceSowing !== null &&
        lifecycleContext?.daysSinceSowing !== undefined &&
        lifecycleContext.daysSinceSowing <= 7 &&
        (stageLower.includes('matur') || stageLower.includes('harvest') || stageLower.includes('flower')))
    ) {
      actions.push({
        id: 'action-lifecycle-consistency',
        priority: 'LOW',
        category: 'CROP_LIFECYCLE',
        status: 'MONITOR',
        title: 'Review Sowing Date & Stage',
        action: 'Verify if recorded sowing date matches current crop growth in the field.',
        reason:
          lifecycleContext?.stageExplanation ||
          'Reported sowing date is very recent compared to advanced crop stage.',
        timing: 'At convenience',
        confidence: 'MEDIUM',
        evidence: [
          lifecycleContext?.stageExplanation || 'Stage/sowing date alignment review',
          `Elapsed days: ${lifecycleContext?.daysSinceSowing ?? 'Unknown'}`,
        ],
        sourceSignals: ['CropLifecycleContext'],
      });
    }
  }

  // ── F. MARKET ACTION ───────────────────────────────────────────────────────
  if (params.marketPrices && params.marketPrices.length > 0) {
    const cropName = farmContext?.currentCrop?.toLowerCase().trim();
    const matchedCropPrice = cropName
      ? params.marketPrices.find(
          (p) =>
            p.crop.toLowerCase().trim() === cropName ||
            cropName.includes(p.crop.toLowerCase().trim()) ||
            p.crop.toLowerCase().trim().includes(cropName)
        )
      : params.marketPrices[0];

    if (matchedCropPrice) {
      actions.push({
        id: `action-market-${matchedCropPrice.crop.toLowerCase()}`,
        priority: 'LOW',
        category: 'MARKET',
        status: 'MONITOR',
        title: `Official Mandi Rate: ${matchedCropPrice.crop}`,
        action: 'Review current official mandi rates before finalizing selling or harvest plans.',
        reason: `Official AMIS Punjab rate reported at ${matchedCropPrice.primaryMandi?.mandiName || 'Punjab mandi'} (FQP: Rs ${Math.round(matchedCropPrice.currentPrice).toLocaleString('en-PK')}/maund, bulletin ${matchedCropPrice.reportedDate}).`,
        timing: matchedCropPrice.isFresh ? 'Current bulletin' : 'Historical bulletin',
        confidence: matchedCropPrice.isOfficial ? 'HIGH' : 'MEDIUM',
        evidence: [
          `Source: AMIS Punjab (${matchedCropPrice.reportedDate})`,
          `Mandi: ${matchedCropPrice.primaryMandi?.mandiName || 'Punjab average'}`,
          `FQP Rate: Rs ${Math.round(matchedCropPrice.currentPrice).toLocaleString('en-PK')}/40kg maund`,
        ],
        sourceSignals: ['GovernmentMarketPriceLayer (AMIS Punjab)'],
        limitations: [
          'Government mandi quotations reflect wholesale arrivals and are not guaranteed farmgate selling prices.',
          'The planner does not predict future price trends.',
        ],
      });
    }
  }

  // ── G. ECONOMIC ACTION ─────────────────────────────────────────────────────
  if (economicImpact?.estimatedGrossValue?.value) {
    const grossVal = Math.round(economicImpact.estimatedGrossValue.value);
    const qtyVal = economicImpact.quantity?.value;
    const qtyUnit = economicImpact.quantity?.unit || 'maunds';
    const priceMaund = Math.round(economicImpact.marketPrice?.pricePerMaund || 0);

    actions.push({
      id: 'action-economic-gross-value',
      priority: 'LOW',
      category: 'ECONOMIC',
      status: 'MONITOR',
      title: 'Estimated Gross Market Value',
      action: 'Reference calculated gross market estimate for harvest and sales planning.',
      reason: `Calculated estimate: Rs ${grossVal.toLocaleString('en-PK')} based on ${qtyVal} ${qtyUnit} at official rate Rs ${priceMaund.toLocaleString('en-PK')}/maund.`,
      timing: 'Current season',
      confidence: economicImpact.confidence === 'HIGH' ? 'HIGH' : 'MEDIUM',
      evidence: [
        `Expected Quantity: ${qtyVal} ${qtyUnit}`,
        `Gross Value: Rs ${grossVal.toLocaleString('en-PK')}`,
        `Calculation: ${economicImpact.transparency.grossValueCalculation || 'Quantity × Rate'}`,
      ],
      sourceSignals: ['EconomicImpactEngine'],
      limitations: [
        'Gross value is a mathematical estimate, not guaranteed income or profit.',
        'Deductions for transport, harvesting, labor, and commission are not included.',
      ],
    });
  }

  // ── H. FALLBACK & ZERO-ACTION SAFEGUARD ─────────────────────────────────────
  if (actions.length === 0) {
    if (!farmContext?.currentCrop) {
      actions.push({
        id: 'action-general-incomplete-profile',
        priority: 'LOW',
        category: 'GENERAL',
        status: 'INSUFFICIENT_DATA',
        title: 'Incomplete Farm Profile',
        action: 'Set up your crop in Farm Profile to unlock personalized daily actions.',
        reason:
          'Without a specified crop and district, actions are limited to general weather observations.',
        timing: 'Any time',
        confidence: 'NOT_ENOUGH_DATA',
        evidence: ['No crop selected in Farm Profile'],
        sourceSignals: ['FarmContext'],
        limitations: ['Recommendations require crop profile and field context.'],
      });
    } else {
      actions.push({
        id: 'action-general-routine-monitoring',
        priority: 'LOW',
        category: 'GENERAL',
        status: 'NO_ACTION',
        title: 'No Urgent Farm Action Required',
        action: 'Continue routine crop and weather monitoring.',
        reason:
          'Current weather conditions are stable with no immediate hazards or critical treatment windows detected.',
        timing: 'Today',
        confidence: 'HIGH',
        evidence: [
          'Stable weather parameters (low rain risk, safe wind speeds)',
          'No critical disease or moisture alerts flagged',
        ],
        sourceSignals: ['WeatherData', 'FarmDecisionEngine'],
      });
    }
  }

  // ── I. DETERMINISTIC SORTING & PRIORITIZATION ───────────────────────────────
  // Sort deterministically:
  // 1. Priority (HIGH > MEDIUM > LOW)
  // 2. Category urgency
  // 3. Status urgency
  // 4. Stable ID fallback
  actions.sort((a, b) => {
    const prioDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    if (prioDiff !== 0) return prioDiff;

    const catDiff = CATEGORY_WEIGHTS[b.category] - CATEGORY_WEIGHTS[a.category];
    if (catDiff !== 0) return catDiff;

    const statDiff = STATUS_WEIGHTS[b.status] - STATUS_WEIGHTS[a.status];
    if (statDiff !== 0) return statDiff;

    return a.id.localeCompare(b.id);
  });

  // Limit total actions to top 5 to prevent action spam
  const prioritizedActions = actions.slice(0, 5);

  const topAction = prioritizedActions[0];
  const attentionCount = prioritizedActions.filter((a) => a.status !== 'NO_ACTION').length;
  const highPriorityCount = prioritizedActions.filter((a) => a.priority === 'HIGH').length;
  const hasUrgentAction = highPriorityCount > 0;

  // Generate farm summary
  const summaryParts: string[] = [];
  if (farmContext?.currentCrop) summaryParts.push(farmContext.currentCrop);
  if (farmContext?.cropStage) summaryParts.push(farmContext.cropStage);
  if (farmContext?.district) summaryParts.push(farmContext.district);
  const farmSummary = summaryParts.length > 0 ? summaryParts.join(' • ') : undefined;

  return {
    generatedAt: new Date().toISOString(),
    farmSummary,
    topAction,
    actions: prioritizedActions,
    attentionCount,
    highPriorityCount,
    hasUrgentAction,
    dataCompleteness,
  };
}
