/**
 * Saathi Decision Evidence & Explainability Service
 *
 * Deterministically gathers and structures verifiable evidence from all existing
 * intelligence layers (Farm Context, Open-Meteo, Disease Engine, Crop Lifecycle,
 * AMIS Government Prices, Economic Impact, and Farm Memory).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 EVIDENCE & ATTRIBUTION INTEGRITY:
 * 1. ZERO Gemini/LLM calls.
 * 2. 100% factual data citations without fabricated numbers.
 * 3. Preserves official AMIS government provenance (reported date, market).
 * 4. Treats Farm Memory strictly as subjective farmer-reported history.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  DecisionEvidence,
  DecisionEvidenceReport,
  DecisionChainStep,
  EvidenceRelevance,
} from '../types/decisionEvidence';
import type { EvaluateScenarioParams } from '../types/farmDecisionSimulator';
import type { FarmAction } from '../types/farmActionPlanner';
import type { FarmActionOutcome } from '../types/farmOutcome';
import { formatOutcomeLabel, formatActionTakenLabel } from './farmOutcomeService';

/**
 * Extracts all relevant factual evidence items from available intelligence context.
 */
export function buildEvidenceCollection(params: EvaluateScenarioParams): DecisionEvidence[] {
  const evidence: DecisionEvidence[] = [];
  const farmContext = params.farmContext;
  const weather = params.weatherData || params.weather;
  const decisionResult = params.decisionResult;
  const diseaseAssessment = params.diseaseAssessment;
  const diseaseResult = params.diseaseResult;
  const lifecycleContext = params.lifecycleContext;
  const marketPrices = params.marketPrices;
  const economicImpact = params.economicImpact;
  const farmOutcomes = params.farmMemories || params.farmOutcomes;

  // ── 1. Weather Signals (Open-Meteo) ──
  if (weather) {
    const current = weather.current;
    const daily = weather.daily;
    const forecast = weather.forecast;

    // Precipitation Probability
    const maxPrecipProb =
      daily?.precipitation_probability_max?.[0] ??
      forecast?.[0]?.rain ??
      current?.precipitation_probability;
    const precipSum = daily?.precipitation_sum?.[0] ?? current?.precipitation;

    if (maxPrecipProb !== undefined && maxPrecipProb !== null) {
      let implication = 'Low likelihood of precipitation; favorable for field activities.';
      let relevance: EvidenceRelevance = 'LOW';

      if (maxPrecipProb >= 60) {
        implication = 'Elevated rain probability increases pesticide wash-off risk and may saturate fields.';
        relevance = 'HIGH';
      } else if (maxPrecipProb >= 35) {
        implication = 'Moderate rain probability suggests monitoring skies before chemical applications.';
        relevance = 'MEDIUM';
      }

      const rainDetail = precipSum !== undefined ? ` (~${precipSum}mm expected)` : '';
      evidence.push({
        id: 'evidence-weather-rain-prob',
        category: 'WEATHER',
        title: 'Precipitation Probability',
        observation: `Forecast reports ${maxPrecipProb}% probability of rain${rainDetail}.`,
        implication,
        source: 'Open-Meteo Rainfall Forecast',
        sourceDate: daily?.time?.[0] || forecast?.[0]?.day || new Date().toISOString().split('T')[0],
        confidence: 'HIGH',
        relevance,
        limitation: 'Weather models reflect regional probability distributions; local convection can vary.',
      });
    }

    // Wind Speed
    const windSpeed = current?.wind_speed_10m ?? current?.windSpeed;
    if (windSpeed !== undefined && windSpeed !== null) {
      let implication = 'Gentle wind conditions suitable for spraying.';
      let relevance: EvidenceRelevance = 'LOW';

      if (windSpeed >= 20) {
        implication = 'Strong wind creates severe spray-drift hazard to non-target areas and reduces deposition.';
        relevance = 'HIGH';
      } else if (windSpeed >= 12) {
        implication = 'Moderate breeze; requires low-drift nozzles and caution during spraying.';
        relevance = 'MEDIUM';
      }

      evidence.push({
        id: 'evidence-weather-wind',
        category: 'WEATHER',
        title: 'Wind Speed & Drift Risk',
        observation: `Current wind speed measured at ${windSpeed} km/h.`,
        implication,
        source: 'Open-Meteo Wind Forecast',
        sourceDate: daily?.time?.[0] || new Date().toISOString().split('T')[0],
        confidence: 'HIGH',
        relevance,
      });
    }

    // Temperature & Heat
    const maxTemp =
      daily?.temperature_2m_max?.[0] ??
      forecast?.[0]?.temp ??
      current?.temperature_2m ??
      current?.temp ??
      current?.temperature;
    if (maxTemp !== undefined && maxTemp !== null) {
      let implication = 'Temperatures are within normal physiological range.';
      let relevance: EvidenceRelevance = 'LOW';

      if (maxTemp >= 40) {
        implication = 'Extreme heat stress can accelerate flower drop and cause rapid spray droplet evaporation.';
        relevance = 'HIGH';
      } else if (maxTemp >= 35) {
        implication = 'Elevated temperatures suggest avoiding midday field operations and checking soil moisture.';
        relevance = 'MEDIUM';
      }

      evidence.push({
        id: 'evidence-weather-temp',
        category: 'WEATHER',
        title: 'Air Temperature & Thermal Stress',
        observation: `Maximum temperature forecast is ${maxTemp}°C.`,
        implication,
        source: 'Open-Meteo Temperature Analysis',
        sourceDate: daily?.time?.[0] || new Date().toISOString().split('T')[0],
        confidence: 'HIGH',
        relevance,
      });
    }

    // Humidity
    const humidity = current?.relative_humidity_2m ?? current?.humidity;
    if (humidity !== undefined && humidity !== null) {
      let implication = 'Relative humidity is in moderate range.';
      let relevance: EvidenceRelevance = 'LOW';

      if (humidity >= 80) {
        implication = 'High relative humidity prolongs leaf wetness, creating favorable conditions for fungal development.';
        relevance = 'HIGH';
      } else if (humidity <= 30) {
        implication = 'Very low humidity causes rapid spray droplet evaporation before plant absorption.';
        relevance = 'MEDIUM';
      }

      evidence.push({
        id: 'evidence-weather-humidity',
        category: 'WEATHER',
        title: 'Relative Humidity',
        observation: `Relative humidity measured at ${humidity}%.`,
        implication,
        source: 'Open-Meteo Humidity Sensor Model',
        confidence: 'HIGH',
        relevance,
      });
    }
  }

  // ── 2. Farm Context Signals ──
  if (farmContext) {
    const cropName = farmContext.crop || farmContext.currentCrop;
    const cropStage = farmContext.stage || farmContext.cropStage;
    const landSize = farmContext.landSizeAcres || farmContext.farmSize;
    const location = farmContext.location || farmContext.district;

    if (cropName) {
      evidence.push({
        id: 'evidence-farm-crop',
        category: 'FARM_CONTEXT',
        title: 'Active Farm Crop',
        observation: `Farm profile registers ${cropName}${landSize ? ` across ${landSize} acres` : ''} in ${location || 'district'}.`,
        implication: `Recommendations are customized for agronomic thresholds of ${cropName}.`,
        source: 'Farm Context',
        confidence: 'HIGH',
        relevance: 'HIGH',
      });
    }

    if (cropStage) {
      evidence.push({
        id: 'evidence-farm-stage',
        category: 'CROP_LIFECYCLE',
        title: 'Crop Growth Stage',
        observation: `Reported crop development stage is "${cropStage}".`,
        implication: `Vulnerability to weather stress and chemical applications depends on "${cropStage}" growth phase; reproductive phases are especially sensitive.`,
        source: 'Farm Context Profile',
        confidence: 'HIGH',
        relevance: 'HIGH',
      });
    }

    if (farmContext.soilType || farmContext.irrigationSource) {
      const details = [
        farmContext.soilType ? `Soil: ${farmContext.soilType}` : '',
        farmContext.irrigationSource ? `Water Source: ${farmContext.irrigationSource}` : '',
      ].filter(Boolean).join(', ');

      evidence.push({
        id: 'evidence-farm-soil-water',
        category: 'FARM_CONTEXT',
        title: 'Soil & Water Infrastructure',
        observation: details,
        implication: 'Water retention capacity and irrigation feasibility reflect these soil and water parameters.',
        source: 'Farm Context',
        confidence: 'HIGH',
        relevance: 'MEDIUM',
      });
    }
  }

  // ── 3. Disease & Diagnostic Signals ──
  if (diseaseAssessment) {
    const diseaseName = diseaseAssessment.disease || diseaseAssessment.crop;
    const isConfidenceHigh = diseaseAssessment.confidence === 'HIGH';

    if (diseaseName) {
      evidence.push({
        id: 'evidence-disease-diagnosis',
        category: 'DISEASE',
        title: 'Disease Diagnosis Assessment',
        observation: `Assessment identified "${diseaseName}" (${diseaseAssessment.weatherRisk?.overallRisk || 'moderate'} risk level).`,
        implication: isConfidenceHigh
          ? `High confidence in ${diseaseName} justifies targeted agronomic intervention if weather permits.`
          : `Requires on-ground visual scouting before chemical application.`,
        source: 'Disease Intelligence Engine',
        confidence: isConfidenceHigh ? 'HIGH' : 'MEDIUM',
        relevance: 'HIGH',
        limitation: 'Assessment indicates potential symptoms; laboratory verification is not performed.',
      });
    }

    if (diseaseAssessment.weatherRisk?.summary) {
      evidence.push({
        id: 'evidence-disease-weather-risk',
        category: 'DISEASE',
        title: 'Weather-Driven Pathogen Risk',
        observation: diseaseAssessment.weatherRisk.summary,
        implication: diseaseAssessment.sprayWindow?.recommendation || 'Environmental conditions govern pathogen multiplication.',
        source: 'Disease Weather Intelligence',
        confidence: 'HIGH',
        relevance: 'HIGH',
      });
    }
  } else if (diseaseResult) {
    const diseaseName = diseaseResult.detectedDisease;
    const confidencePct = Math.round(diseaseResult.confidence * (diseaseResult.confidence <= 1 ? 100 : 1));
    const isConfidenceHigh = confidencePct >= 70;

    evidence.push({
      id: 'evidence-disease-diagnosis',
      category: 'DISEASE',
      title: 'Disease Diagnosis Assessment',
      observation: `Visual assessment detected "${diseaseName}" at ${confidencePct}% confidence (${diseaseResult.severity} severity).`,
      implication: isConfidenceHigh
        ? `High confidence in ${diseaseName} justifies targeted agronomic intervention if weather permits.`
        : `Moderate/low confidence (${confidencePct}%) requires on-ground visual scouting before chemical application.`,
      source: 'Disease Intelligence Engine',
      confidence: isConfidenceHigh ? 'HIGH' : 'MEDIUM',
      relevance: 'HIGH',
      limitation: 'Image assessment indicates potential symptoms; laboratory verification is not performed.',
    });
  }

  // ── 4. Crop Lifecycle Signals ──
  if (lifecycleContext) {
    if (lifecycleContext.isReproductivePhase) {
      evidence.push({
        id: 'evidence-lifecycle-reproductive',
        category: 'CROP_LIFECYCLE',
        title: 'Critical Reproductive Phase',
        observation: `Crop is in ${lifecycleContext.currentStage} (flowering/grain fill phase).`,
        implication: 'Reproductive stages are highly sensitive to thermal stress, moisture deficit, and phytotoxic spray drift.',
        source: 'Crop Lifecycle Intelligence',
        confidence: 'HIGH',
        relevance: 'HIGH',
      });
    }

    if (lifecycleContext.stageConsistencyWarning) {
      evidence.push({
        id: 'evidence-lifecycle-consistency',
        category: 'CROP_LIFECYCLE',
        title: 'Growth Stage Timeline Check',
        observation: lifecycleContext.stageConsistencyWarning,
        implication: 'Reported stage differs from expected calendar duration; field verification recommended.',
        source: 'Crop Lifecycle Intelligence',
        confidence: 'MEDIUM',
        relevance: 'MEDIUM',
      });
    }
  }

  // ── 5. Government Market Price Signals (AMIS) ──
  if (marketPrices && marketPrices.length > 0) {
    const primaryPrice = marketPrices[0];
    const priceVal = primaryPrice.modalPrice ?? primaryPrice.price;
    const mandiName = primaryPrice.mandi ?? primaryPrice.market ?? 'district';
    const repDate = primaryPrice.arrivalDate ?? primaryPrice.reportedDate;
    const isOfficial = primaryPrice.isOfficial ?? true;

    if (priceVal !== undefined && priceVal !== null) {
      evidence.push({
        id: 'evidence-market-amis-price',
        category: 'MARKET',
        title: 'Government Wholesale Mandi Price',
        observation: `AMIS Punjab quotes ${primaryPrice.crop} at Rs ${priceVal.toLocaleString()} per ${primaryPrice.unit || 'maund'} in ${mandiName} mandi.`,
        implication: 'Represents official wholesale auction rate; transport, quality grade, and commission deductions apply at farmgate.',
        source: 'AMIS Punjab Directorate of Agriculture Economics',
        sourceDate: repDate,
        confidence: isOfficial ? 'HIGH' : 'MEDIUM',
        relevance: 'HIGH',
        metadata: {
          official: isOfficial,
          reportedDate: repDate,
          commodity: primaryPrice.crop,
          market: mandiName,
          unit: primaryPrice.unit,
        },
        limitation: 'Government mandi price reflects wholesale auction arrivals, not a guaranteed farmgate contract.',
      });
    }
  }

  // ── 6. Economic Impact Signals ──
  if (economicImpact) {
    if (economicImpact.estimatedGrossValue && economicImpact.expectedQuantity) {
      evidence.push({
        id: 'evidence-economic-gross-value',
        category: 'ECONOMIC',
        title: 'Estimated Crop Market Value',
        observation: `Estimated gross harvest value is Rs ${economicImpact.estimatedGrossValue.formatted} based on ${economicImpact.expectedQuantity.formatted} at current mandi rate.`,
        implication: `Calculation: ${economicImpact.expectedQuantity.value} ${economicImpact.expectedQuantity.unit} × Rs ${economicImpact.marketPrice?.pricePerMaund || 'market rate'}.`,
        source: 'Economic Impact Engine',
        confidence: economicImpact.confidence === 'HIGH' ? 'HIGH' : 'MEDIUM',
        relevance: 'HIGH',
        limitation: 'Calculated directly from farmer-stated quantity and wholesale rate; does not deduct input or harvesting costs.',
      });
    }
  }

  // ── 7. Farm Memory (Farmer-Reported Historical Context) ──
  if (farmOutcomes && farmOutcomes.length > 0) {
    farmOutcomes.slice(0, 3).forEach((outcomeItem: FarmActionOutcome) => {
      const dateStr = outcomeItem.recordedAt
        ? new Date(outcomeItem.recordedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })
        : 'recent date';

      const actionTakenLabel = formatActionTakenLabel(outcomeItem.actionTaken);
      const outcomeLabel = formatOutcomeLabel(outcomeItem.outcome);

      evidence.push({
        id: `evidence-memory-${outcomeItem.id}`,
        category: 'FARM_MEMORY',
        title: `Past Field Log: ${outcomeItem.actionTitle || 'Field Action'}`,
        observation: `On ${dateStr}, farmer took action "${actionTakenLabel}" with observed result: "${outcomeLabel}".${outcomeItem.notes ? ` Note: "${outcomeItem.notes}"` : ''}`,
        implication: 'Historical farmer record provides past field context for this farm plot.',
        source: 'Farm Memory Local Log',
        sourceDate: outcomeItem.recordedAt,
        confidence: 'MEDIUM',
        relevance: 'MEDIUM',
        metadata: {
          isFarmerReport: true,
        },
        limitation: 'Farmer-reported subjective observation; does not constitute verified scientific or laboratory proof.',
      });
    });
  }

  // ── 8. Farm Decision Result ──
  if (decisionResult) {
    if (decisionResult.sprayRecommendation) {
      evidence.push({
        id: 'evidence-decision-spray-eval',
        category: 'ACTION_PLAN',
        title: 'Spraying Window Assessment',
        observation: `Spray status evaluated as ${decisionResult.sprayRecommendation.status}: "${decisionResult.sprayRecommendation.action}".`,
        implication: decisionResult.sprayRecommendation.reason,
        source: 'Farm Action Planner',
        confidence: 'HIGH',
        relevance: 'HIGH',
      });
    }

    if (decisionResult.irrigationRecommendation) {
      evidence.push({
        id: 'evidence-decision-irrigation-eval',
        category: 'ACTION_PLAN',
        title: 'Irrigation Need Assessment',
        observation: `Irrigation status evaluated as ${decisionResult.irrigationRecommendation.status}: "${decisionResult.irrigationRecommendation.action}".`,
        implication: decisionResult.irrigationRecommendation.reason,
        source: 'Farm Action Planner',
        confidence: 'HIGH',
        relevance: 'HIGH',
      });
    }
  }

  return evidence;
}

/**
 * Builds a structured, explainable evidence chain for a specific recommendation:
 * INPUT -> OBSERVATION -> INTERPRETATION -> DECISION
 */
export function buildEvidenceChain(
  action: FarmAction,
  evidenceItems: DecisionEvidence[]
): DecisionChainStep[] {
  const chain: DecisionChainStep[] = [];

  // Step 1: Inputs
  const inputSources = Array.from(new Set(evidenceItems.map((e) => e.source))).join(', ');
  chain.push({
    step: 'INPUT',
    label: 'Observe Environmental Inputs',
    detail: `Grounded in verified local signals from: ${inputSources || 'Available Farm Signals'}.`,
  });

  // Step 2: Primary Observation
  const topEvidence = evidenceItems.find((e) => e.relevance === 'HIGH') || evidenceItems[0];
  if (topEvidence) {
    chain.push({
      step: 'OBSERVATION',
      label: 'Understand Farm Signals',
      detail: `${topEvidence.title}: ${topEvidence.observation}`,
    });
  }

  // Step 3: Interpretation
  if (topEvidence) {
    chain.push({
      step: 'INTERPRETATION',
      label: 'Evaluate Agronomic Risks',
      detail: topEvidence.implication,
    });
  } else {
    chain.push({
      step: 'INTERPRETATION',
      label: 'Evaluate Agronomic Risks',
      detail: action.reason,
    });
  }

  // Step 4: Decision
  chain.push({
    step: 'DECISION',
    label: 'Final Recommended Action',
    detail: `${action.title}: ${action.action}`,
  });

  return chain;
}

/**
 * Generates a full explainability report for a specific FarmAction.
 */
export function generateDecisionEvidenceReport(
  action: FarmAction,
  params: EvaluateScenarioParams,
  farmMemory?: FarmActionOutcome[]
): DecisionEvidenceReport {
  const allEvidence = buildEvidenceCollection({
    ...params,
    farmOutcomes: farmMemory || params.farmMemories || params.farmOutcomes,
  });

  // Filter and rank evidence relevant to this action category
  const relevantEvidence = allEvidence.filter((item) => {
    if (action.category === 'SPRAYING') {
      return item.category === 'WEATHER' || item.category === 'DISEASE' || item.category === 'FARM_CONTEXT' || item.category === 'ACTION_PLAN' || item.category === 'FARM_MEMORY';
    }
    if (action.category === 'IRRIGATION') {
      return item.category === 'WEATHER' || item.category === 'FARM_CONTEXT' || item.category === 'CROP_LIFECYCLE' || item.category === 'ACTION_PLAN';
    }
    if (action.category === 'DISEASE' || action.category === 'SCOUTING') {
      return item.category === 'DISEASE' || item.category === 'WEATHER' || item.category === 'FARM_CONTEXT' || item.category === 'FARM_MEMORY';
    }
    if (action.category === 'MARKET' || action.category === 'ECONOMIC') {
      return item.category === 'MARKET' || item.category === 'ECONOMIC' || item.category === 'FARM_CONTEXT';
    }
    return true;
  });

  const evidenceChain = buildEvidenceChain(action, relevantEvidence);

  const limitations = [
    ...(action.limitations || []),
    'Based strictly on available farm, weather, and market signals; field verification by farmer remains essential.',
    'Farmer observations in Farm Memory are subjective historical logs, not laboratory-proven facts.',
  ];

  return {
    targetActionId: action.id,
    targetTitle: action.title,
    targetRecommendation: action.action,
    overallConfidence: action.confidence,
    evidenceItems: relevantEvidence.length > 0 ? relevantEvidence : allEvidence,
    evidenceChain,
    limitations,
    generatedAt: new Date().toISOString(),
  };
}
