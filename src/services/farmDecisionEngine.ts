/**
 * Saathi Farm Decision Engine
 *
 * Combines local FarmContext (crop, soil, stage, irrigation method) with
 * existing Open-Meteo WeatherData to generate deterministic, rule-based
 * agricultural decisions.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 PRIVACY & ARCHITECTURAL GUARANTEE:
 * - 100% deterministic local TypeScript logic.
 * - ZERO external API calls, ZERO Gemini or AI queries.
 * - ZERO transmission of FarmContext to external servers.
 * - Respects uncertainty: uses probabilities and ranges rather than false certainty.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { FarmContext } from '../types/farm';
import { WeatherData, getWeatherInfo } from './weather';
import {
  FarmDecisionResult,
  SprayingDecision,
  IrrigationDecision,
  HeatStressDecision,
  WindDecision,
  TomorrowComparisonDecision,
  DecisionPriority,
  DecisionOverallStatus,
} from '../types/decision';
import { getFarmContext } from './farmContext';
import { evaluateCropLifecycle } from './cropLifecycle';

/**
 * Evaluates spraying suitability based on wind speed, precipitation probability,
 * expected rainfall, and atmospheric stability.
 *
 * Thresholds:
 * - Avoid: Precipitation probability >= 50% OR expected rain >= 2.0 mm OR wind >= 25 km/h
 * - Caution: Precipitation probability 30–49% OR expected rain >= 0.5 mm OR wind 15–24 km/h OR wind < 4 km/h (inversion risk)
 * - Suitable: Precipitation probability < 30% AND wind 4–14 km/h
 */
export function evaluateSpraying(weather: WeatherData): SprayingDecision {
  const currentWind = weather.current.windSpeed ?? 0;
  const todayForecast = weather.forecast[0];
  const maxWindToday = todayForecast?.windSpeedMax ?? currentWind;

  // Use agricultural metric if available, fallback to today's max rain prob
  const rainProb =
    weather.agricultural?.sprayingAssessment?.rainRiskNext6h ??
    todayForecast?.precipitationProbabilityMax ??
    0;
  const rainSum = todayForecast?.precipitationSum ?? 0;

  const reasons: string[] = [];
  let isAvoid = false;
  let isCaution = false;

  // 1. Evaluate precipitation
  if (rainProb >= 50 || rainSum >= 2.0) {
    isAvoid = true;
    reasons.push(
      `High precipitation probability (~${rainProb}%, ~${rainSum.toFixed(1)} mm forecast). Rainfall soon after application can wash off foliar chemicals.`
    );
  } else if (rainProb >= 30 || rainSum >= 0.5) {
    isCaution = true;
    reasons.push(
      `Moderate precipitation probability (~${rainProb}%). Chemicals may be diluted or washed off if rain develops.`
    );
  }

  // 2. Evaluate wind
  if (currentWind >= 25 || maxWindToday >= 28) {
    isAvoid = true;
    reasons.push(
      `High wind speed (${currentWind} km/h, peak ${maxWindToday} km/h). Strong drift hazard to non-target areas and rapid droplet evaporation.`
    );
  } else if (currentWind >= 15 || maxWindToday >= 20) {
    isCaution = true;
    reasons.push(
      `Moderate wind speed (${currentWind} km/h). Moderate drift hazard; use low-drift nozzles and maintain appropriate buffer zones.`
    );
  } else if (currentWind < 4) {
    isCaution = true;
    reasons.push(
      `Very calm wind (${currentWind} km/h). Check for temperature inversion in early mornings which can keep spray droplets suspended.`
    );
  }

  if (isAvoid) {
    return {
      status: 'avoid',
      rating: 'Avoid Spraying',
      headline: 'High rain/wind risk. Avoid spraying during this period.',
      reason: reasons.join(' '),
      precipitationProbability: rainProb,
      expectedPrecipitationMm: rainSum,
      windSpeedKmH: currentWind,
      details:
        'Wait for wind speeds between 5–14 km/h and a clear weather window with rain probability below 30%.',
    };
  }

  if (isCaution) {
    return {
      status: 'caution',
      rating: 'Exercise Caution',
      headline: 'Spraying conditions are not ideal. Consider another time.',
      reason: reasons.join(' '),
      precipitationProbability: rainProb,
      expectedPrecipitationMm: rainSum,
      windSpeedKmH: currentWind,
      details:
        'If spraying is urgent, monitor local gusts, spray early morning, and avoid fine droplets.',
    };
  }

  return {
    status: 'suitable',
    rating: 'Suitable',
    headline: 'Weather conditions look suitable for spraying.',
    reason: `Favorable wind speed (${currentWind} km/h) and low precipitation probability (~${rainProb}%).`,
    precipitationProbability: rainProb,
    expectedPrecipitationMm: rainSum,
    windSpeedKmH: currentWind,
    details:
      'Ideal application window. Ensure personal protective equipment (PPE) and target coverage.',
  };
}

/**
 * Evaluates irrigation guidance combining ET₀, 24–48h precipitation forecast,
 * root-zone soil moisture (if present), and crop growth stage.
 *
 * Rules:
 * - Delay: Rain probability >= 50% OR expected rain >= 4.0 mm in next 24-48h
 * - Adequate: Root zone soil moisture >= 28% OR moderate ET₀ with moist soil
 * - Irrigate Soon: High evaporative demand (ET₀ >= 5.0 mm/day) OR soil moisture depleted (< 16%) with low rain risk
 * - Insufficient Data: No ET₀ or soil moisture readings available
 */
export function evaluateIrrigation(
  farm: FarmContext | null,
  weather: WeatherData
): IrrigationDecision {
  const todayForecast = weather.forecast[0];
  const tomorrowForecast = weather.forecast[1];

  // 24-48h rain forecast
  const rainProbToday = todayForecast?.precipitationProbabilityMax ?? 0;
  const rainProbTomorrow = tomorrowForecast?.precipitationProbabilityMax ?? 0;
  const maxRainProb24_48h = Math.max(rainProbToday, rainProbTomorrow);

  const rainSumToday = todayForecast?.precipitationSum ?? 0;
  const rainSumTomorrow = tomorrowForecast?.precipitationSum ?? 0;
  const totalRainSum24_48h = rainSumToday + rainSumTomorrow;

  // ET0 & Soil moisture from weather
  const et0 =
    weather.agricultural?.et0DailySum ??
    weather.current.et0 ??
    todayForecast?.et0 ??
    undefined;

  const soilMoisture =
    weather.agricultural?.soilMoistureRootZone ??
    weather.current.soilMoisture0to1cm ??
    undefined;

  const cropStage = farm?.cropStage;
  const waterSource = farm?.waterSource;

  // Rule 1: Rain forecast in 24-48 hours
  if (maxRainProb24_48h >= 50 || totalRainSum24_48h >= 4.0) {
    let sourceNote = '';
    if (waterSource === 'Tube well') {
      sourceNote = ' Delaying can save diesel or electricity pumping expenses.';
    } else if (waterSource === 'Canal') {
      sourceNote = ' Check your canal turn (wari) schedule in anticipation of rain.';
    }

    return {
      status: 'delay',
      headline: 'Rain is expected; consider delaying irrigation.',
      reason: `Forecast indicates a ~${maxRainProb24_48h}% chance of precipitation (~${totalRainSum24_48h.toFixed(1)} mm total expected in next 24–48h). Holding off can prevent waterlogging and conserve water.${sourceNote}`,
      expectedRainSum24h: totalRainSum24_48h,
      rainProbability24h: maxRainProb24_48h,
      et0Daily: et0,
      soilMoisturePct: soilMoisture != null ? Math.round(soilMoisture * 100) : undefined,
      details:
        'Inspect field surface after the rain event before deciding on supplementary irrigation.',
    };
  }

  // Rule 2: Soil moisture available and adequate
  if (soilMoisture != null && soilMoisture >= 0.28) {
    return {
      status: 'adequate',
      headline: 'Soil moisture appears adequate based on available data.',
      reason: `Estimated soil moisture is approximately ${(soilMoisture * 100).toFixed(0)}%. Current field moisture appears adequate under recent weather conditions.`,
      expectedRainSum24h: totalRainSum24_48h,
      rainProbability24h: maxRainProb24_48h,
      et0Daily: et0,
      soilMoisturePct: Math.round(soilMoisture * 100),
      details:
        'Continue routine monitoring; check soil texture manually before scheduling next irrigation.',
    };
  }

  // Rule 3: High ET0 or low soil moisture with dry forecast
  if ((et0 != null && et0 >= 5.0 && maxRainProb24_48h < 30) || (soilMoisture != null && soilMoisture < 0.16 && maxRainProb24_48h < 30)) {
    let stageNote = '';
    if (cropStage === 'Flowering' || cropStage === 'Fruiting / grain filling') {
      stageNote = ` Your crop is at ${cropStage}, a moisture-critical phase where moisture deficit can reduce yield.`;
    } else if (cropStage === 'Germination' || cropStage === 'Sowing') {
      stageNote = ` Field is in ${cropStage}; maintain light, uniform moisture to avoid soil crusting.`;
    }

    const et0Str = et0 != null ? `(reference ET₀: ~${et0.toFixed(1)} mm/day)` : '';
    const moistureStr = soilMoisture != null ? ` and soil moisture is low (~${(soilMoisture * 100).toFixed(0)}%)` : '';

    return {
      status: 'irrigate',
      headline: 'Irrigation may be needed soon.',
      reason: `Atmospheric water demand is elevated ${et0Str}${moistureStr} with low chance of rain (~${maxRainProb24_48h}%).${stageNote}`,
      expectedRainSum24h: totalRainSum24_48h,
      rainProbability24h: maxRainProb24_48h,
      et0Daily: et0,
      soilMoisturePct: soilMoisture != null ? Math.round(soilMoisture * 100) : undefined,
      details:
        'Irrigate in early morning or evening to minimize evaporative losses.',
    };
  }

  // Rule 4: Moderate ET0, no high rain, soil moisture moderate or unmeasured
  if (et0 != null) {
    return {
      status: 'adequate',
      headline: 'Moderate atmospheric moisture demand under current forecast.',
      reason: `Daily evapotranspiration is estimated around ~${et0.toFixed(1)} mm/day with ~${maxRainProb24_48h}% precipitation chance.`,
      expectedRainSum24h: totalRainSum24_48h,
      rainProbability24h: maxRainProb24_48h,
      et0Daily: et0,
      soilMoisturePct: soilMoisture != null ? Math.round(soilMoisture * 100) : undefined,
      details:
        'Check soil moisture in root zone at 15–20 cm depth to determine exact application timing.',
    };
  }

  // Fallback: Insufficient data
  return {
    status: 'insufficient_data',
    headline: 'Insufficient data to confidently recommend irrigation.',
    reason:
      'Atmospheric evapotranspiration (ET₀) and soil moisture data are not available for this location. Inspect field soil moisture manually.',
    expectedRainSum24h: totalRainSum24_48h,
    rainProbability24h: maxRainProb24_48h,
    details: 'More farm and weather sensor data is needed for automated irrigation guidance.',
  };
}

/**
 * Evaluates general weather-based heat stress.
 *
 * Rules:
 * - High: maxTemp >= 40°C OR apparentMax >= 42°C
 * - Moderate: maxTemp 35–39°C OR apparentMax 37–41°C
 * - Low: maxTemp < 35°C
 */
export function evaluateHeatStress(
  farm: FarmContext | null,
  weather: WeatherData
): HeatStressDecision {
  const todayForecast = weather.forecast[0];
  const maxTemp = todayForecast?.tempMax ?? weather.current.temperature;
  const apparentMax =
    todayForecast?.apparentTempMax ??
    weather.current.apparentTemperature ??
    maxTemp;

  const currentCrop = farm?.currentCrop;
  const cropStage = farm?.cropStage;

  let level: 'low' | 'moderate' | 'high' = 'low';
  let headline = '';
  let reason = '';
  let details = '';

  if (maxTemp >= 40 || apparentMax >= 42) {
    level = 'high';
    headline = 'High general weather-based heat risk.';
    reason = `Forecast daytime high of ~${maxTemp.toFixed(0)}°C (apparent temperature ~${apparentMax.toFixed(0)}°C). High atmospheric heat accelerates crop transpiration.`;
  } else if (maxTemp >= 35 || apparentMax >= 37) {
    level = 'moderate';
    headline = 'Moderate general weather-based heat risk.';
    reason = `Forecast daytime high of ~${maxTemp.toFixed(0)}°C (apparent temperature ~${apparentMax.toFixed(0)}°C). Warm conditions may increase crop moisture stress.`;
  } else {
    level = 'low';
    headline = 'Low general heat risk.';
    reason = `Forecast daytime high of ~${maxTemp.toFixed(0)}°C is within typical seasonal operational ranges.`;
  }

  // Crop-specific nuance if known
  if (currentCrop && (cropStage === 'Flowering' || cropStage === 'Fruiting / grain filling')) {
    details = `Planted crop '${currentCrop}' is reported in '${cropStage}' stage. Prolonged temperatures above 35°C during pollination or grain filling can reduce seed set or cause flower drop.`;
  } else if (!currentCrop) {
    details =
      'General weather-based assessment. No crop specified in farm profile; add crop details for stage-specific insights.';
  } else if (!cropStage) {
    details =
      'General weather-based assessment. Crop stage is not specified; add crop stage for reproductive sensitivity analysis.';
  } else {
    details = 'General weather-based indicator; not a crop-specific physiological diagnosis.';
  }

  return {
    level,
    headline,
    reason,
    maxTempToday: maxTemp,
    apparentTempMax: apparentMax,
    details,
  };
}

/**
 * Evaluates wind risk for spraying and outdoor farm work.
 *
 * Rules:
 * - High: maxWind >= 25 km/h OR currentWind >= 25 km/h
 * - Moderate: maxWind 15–24 km/h OR currentWind 15–24 km/h
 * - Low: maxWind < 15 km/h AND currentWind < 15 km/h
 */
export function evaluateWind(weather: WeatherData): WindDecision {
  const currentWind = weather.current.windSpeed ?? 0;
  const maxWindToday = weather.forecast[0]?.windSpeedMax ?? currentWind;

  if (currentWind >= 25 || maxWindToday >= 25) {
    return {
      risk: 'high',
      headline: 'High wind risk.',
      reason: `Wind speeds reaching up to ~${maxWindToday.toFixed(0)} km/h. Foliar spraying is strongly discouraged due to drift; inspect tall lodging-prone crops and secure light structures.`,
      currentWindSpeed: currentWind,
      maxWindSpeedForecast: maxWindToday,
      details: 'Wait for wind gusts to subside below 15 km/h before conducting field spraying.',
    };
  }

  if (currentWind >= 15 || maxWindToday >= 15) {
    return {
      risk: 'moderate',
      headline: 'Moderate wind risk.',
      reason: `Winds expected around ~${maxWindToday.toFixed(0)} km/h. May cause fine spray drift and accelerate surface soil evaporation.`,
      currentWindSpeed: currentWind,
      maxWindSpeedForecast: maxWindToday,
      details: 'Use drift-reducing nozzles and monitor wind direction relative to neighboring fields.',
    };
  }

  return {
    risk: 'low',
    headline: 'Low wind risk.',
    reason: `Gentle wind conditions (~${maxWindToday.toFixed(0)} km/h peak). Favorable for spraying and general outdoor field operations.`,
    currentWindSpeed: currentWind,
    maxWindSpeedForecast: maxWindToday,
    details: 'Calm conditions allow uniform spray distribution and standard field work.',
  };
}

/**
 * Compares today's weather metrics with tomorrow's forecast.
 */
export function evaluateTomorrowComparison(
  weather: WeatherData,
  sprayingToday: SprayingDecision
): TomorrowComparisonDecision {
  const today = weather.forecast[0];
  const tomorrow = weather.forecast[1];

  if (!tomorrow || !today) {
    return {
      tomorrowBetterForSpraying: false,
      tomorrowBetterForWork: true,
      headline: "Tomorrow's detailed forecast is not available.",
      comparisonDetails: ['Only current day forecast data is available at this time.'],
    };
  }

  const comparisonDetails: string[] = [];

  // 1. Rain comparison
  const rainToday = today.precipitationProbabilityMax ?? 0;
  const rainTomorrow = tomorrow.precipitationProbabilityMax ?? 0;
  const rainDiff = rainTomorrow - rainToday;

  if (rainDiff >= 20) {
    comparisonDetails.push(
      `Tomorrow has higher precipitation risk (~${rainTomorrow}% vs ~${rainToday}% today).`
    );
  } else if (rainDiff <= -20) {
    comparisonDetails.push(
      `Tomorrow has lower precipitation risk (~${rainTomorrow}% vs ~${rainToday}% today).`
    );
  }

  // 2. Temperature comparison
  const tempToday = today.tempMax;
  const tempTomorrow = tomorrow.tempMax;
  const tempDiff = tempTomorrow - tempToday;

  if (tempDiff >= 3) {
    comparisonDetails.push(
      `Tomorrow will be warmer (forecast high ~${tempTomorrow.toFixed(0)}°C vs ~${tempToday.toFixed(0)}°C today).`
    );
  } else if (tempDiff <= -3) {
    comparisonDetails.push(
      `Tomorrow will be cooler (forecast high ~${tempTomorrow.toFixed(0)}°C vs ~${tempToday.toFixed(0)}°C today).`
    );
  }

  // 3. Wind comparison
  const windToday = today.windSpeedMax ?? weather.current.windSpeed;
  const windTomorrow = tomorrow.windSpeedMax ?? 15;
  const windDiff = windTomorrow - windToday;

  if (windDiff >= 6) {
    comparisonDetails.push(
      `Tomorrow has stronger winds (up to ~${windTomorrow.toFixed(0)} km/h vs ~${windToday.toFixed(0)} km/h today).`
    );
  } else if (windDiff <= -6) {
    comparisonDetails.push(
      `Tomorrow will have calmer winds (~${windTomorrow.toFixed(0)} km/h vs ~${windToday.toFixed(0)} km/h today).`
    );
  }

  // 4. Spraying comparison
  const tomorrowSprayingSuitable = rainTomorrow < 30 && windTomorrow >= 4 && windTomorrow < 15;
  const tomorrowSprayingHarsh = rainTomorrow >= 45 || windTomorrow >= 22;

  let tomorrowBetterForSpraying = false;
  if (sprayingToday.status !== 'suitable' && tomorrowSprayingSuitable) {
    tomorrowBetterForSpraying = true;
    comparisonDetails.push('Tomorrow appears more suitable for spraying than today.');
  } else if (sprayingToday.status === 'suitable' && tomorrowSprayingHarsh) {
    tomorrowBetterForSpraying = false;
    comparisonDetails.push('Today appears more suitable for spraying than tomorrow.');
  }

  // 5. Work comparison
  let tomorrowBetterForWork = true;
  const tomorrowHarsh = rainTomorrow >= 50 || tempTomorrow >= 40 || windTomorrow >= 25;
  const todayHarsh = rainToday >= 50 || tempToday >= 40 || windToday >= 25;

  if (tomorrowHarsh && !todayHarsh) {
    tomorrowBetterForWork = false;
    comparisonDetails.push('Tomorrow appears less suitable for strenuous outdoor field work.');
  } else if (todayHarsh && !tomorrowHarsh) {
    tomorrowBetterForWork = true;
    comparisonDetails.push('Tomorrow appears more favorable for outdoor field work.');
  }

  if (comparisonDetails.length === 0) {
    comparisonDetails.push(
      `Tomorrow has similar weather conditions (~${tempTomorrow.toFixed(0)}°C high, ~${rainTomorrow}% rain risk, ~${windTomorrow.toFixed(0)} km/h wind).`
    );
  }

  const headline =
    tomorrowBetterForSpraying
      ? 'Tomorrow offers an improved spraying window.'
      : !tomorrowBetterForWork
      ? 'Tomorrow has less favorable outdoor working conditions.'
      : 'Tomorrow has comparable field conditions.';

  return {
    tomorrowBetterForSpraying,
    tomorrowBetterForWork,
    headline,
    comparisonDetails,
  };
}

/**
 * Pure function: Combines FarmContext and WeatherData to compute full FarmDecisionResult.
 */
export function evaluateFarmDecisions(
  farm: FarmContext | null,
  weather: WeatherData
): FarmDecisionResult {
  // Missing fields tracking
  const missingFields: string[] = [];
  if (!farm?.currentCrop) missingFields.push('currentCrop');
  if (!farm?.cropStage) missingFields.push('cropStage');
  if (!farm?.soilType || farm.soilType === 'Unknown') missingFields.push('soilType');
  if (!farm?.waterSource) missingFields.push('waterSource');
  if (!farm?.farmSizeAcres) missingFields.push('farmSizeAcres');

  // Sub-evaluations
  const sprayingDecision = evaluateSpraying(weather);
  const irrigationDecision = evaluateIrrigation(farm, weather);
  const heatStressDecision = evaluateHeatStress(farm, weather);
  const windDecision = evaluateWind(weather);
  const tomorrowComparison = evaluateTomorrowComparison(weather, sprayingDecision);

  // Determine overall Priority
  let priority: DecisionPriority = 'low';
  let overallStatus: DecisionOverallStatus = 'optimal';

  const isHighUrgency =
    sprayingDecision.status === 'avoid' ||
    irrigationDecision.status === 'delay' ||
    heatStressDecision.level === 'high' ||
    windDecision.risk === 'high';

  const isMediumUrgency =
    sprayingDecision.status === 'caution' ||
    irrigationDecision.status === 'irrigate' ||
    heatStressDecision.level === 'moderate' ||
    windDecision.risk === 'moderate';

  if (isHighUrgency) {
    priority = 'high';
    overallStatus = 'action_needed';
  } else if (isMediumUrgency) {
    priority = 'medium';
    overallStatus = 'monitoring';
  } else {
    priority = 'low';
    overallStatus = 'optimal';
  }

  // Compile Alerts
  const alerts: string[] = [];
  if (sprayingDecision.status === 'avoid') {
    alerts.push(`Spraying: ${sprayingDecision.headline}`);
  }
  if (irrigationDecision.status === 'delay') {
    alerts.push(`Irrigation: ${irrigationDecision.headline}`);
  }
  if (heatStressDecision.level === 'high') {
    alerts.push(`Heat: ${heatStressDecision.headline}`);
  }
  if (windDecision.risk === 'high') {
    alerts.push(`Wind: ${windDecision.headline}`);
  }
  if (sprayingDecision.status === 'caution' && !alerts.length) {
    alerts.push(`Spraying: ${sprayingDecision.headline}`);
  }
  if (heatStressDecision.level === 'moderate' && alerts.length < 2) {
    alerts.push(`Heat: ${heatStressDecision.headline}`);
  }

  // Compile Recommendations
  const recommendations: string[] = [];
  if (sprayingDecision.status === 'avoid') {
    recommendations.push(
      `Postpone foliar applications until precipitation risk drops and winds calm below 15 km/h.`
    );
  } else if (sprayingDecision.status === 'caution') {
    recommendations.push(
      `Spray during early morning or calm windows using low-drift nozzle settings.`
    );
  } else {
    recommendations.push(
      `Current conditions offer a suitable window for foliar applications.`
    );
  }

  if (irrigationDecision.status === 'delay') {
    recommendations.push(
      `Delay planned irrigation by 24–48 hours to assess actual rainfall accumulation.`
    );
  } else if (irrigationDecision.status === 'irrigate') {
    recommendations.push(
      `Schedule irrigation during cool morning or evening hours to minimize evaporative losses.`
    );
  }

  if (heatStressDecision.level === 'high') {
    recommendations.push(
      `Schedule strenuous field labor in early morning; protect sensitive crops from prolonged heat stress.`
    );
  }

  // One-line weather summary
  const info = getWeatherInfo(weather.current.weatherCode);
  const todayForecast = weather.forecast[0];
  const highTemp = todayForecast?.tempMax ?? weather.current.temperature;
  const rainProb = todayForecast?.precipitationProbabilityMax ?? 0;
  const peakWind = todayForecast?.windSpeedMax ?? weather.current.windSpeed;

  const weatherSummary = `${info.label} with a daytime high of ~${highTemp.toFixed(0)}°C, peak wind of ~${peakWind.toFixed(0)} km/h, and ~${rainProb}% chance of precipitation.`;

  return {
    overallStatus,
    priority,
    alerts,
    recommendations,
    weatherSummary,
    sprayingDecision,
    irrigationDecision,
    heatStressDecision,
    windDecision,
    tomorrowComparison,
    lifecycleContext: evaluateCropLifecycle(farm),
    meta: {
      generatedAt: Date.now(),
      hasFarmContext: Boolean(farm && (farm.currentCrop || farm.farmSizeAcres || farm.district)),
      cropEvaluated: farm?.currentCrop,
      stageEvaluated: farm?.cropStage,
      waterSourceEvaluated: farm?.waterSource,
      missingFields,
      notes:
        missingFields.length > 0
          ? `Recommendations use general weather models. Missing farm fields: ${missingFields.join(', ')}.`
          : 'All primary farm context parameters evaluated.',
    },
  };
}

/**
 * Convenience helper: Evaluates farm decisions using saved localStorage FarmContext.
 */
export function getFarmDecisions(weather: WeatherData): FarmDecisionResult {
  const farm = getFarmContext();
  return evaluateFarmDecisions(farm, weather);
}
