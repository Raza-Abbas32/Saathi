/**
 * Saathi Economic Impact Intelligence Engine
 *
 * Deterministic service answering:
 * "What could this farming decision mean financially?"
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 SAFETY, ACCURACY, & PRIVACY GUARANTEE:
 * 1. ZERO AI/LLM: 100% deterministic arithmetic. No Gemini calls.
 * 2. NO INVENTED VALUES: Yields, costs, loss percentages, and prices are NEVER
 *    manufactured. Missing fields return explicit "Insufficient information".
 * 3. 100% LOCAL PRIVACY: No FarmContext, farm acreage, or financial inputs
 *    are transmitted to any external server or API.
 * 4. SOURCE PROVENANCE: Official government prices (AMIS Punjab) are strictly
 *    tracked with bulletin dates, market mandis, and conversion math.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import type {
  EconomicImpactResult,
  EconomicStatus,
  EconomicConfidence,
  EconomicMarketPrice,
  EconomicQuantity,
  EconomicRiskExposure,
  EconomicInterventionCost,
  EconomicPotentialLossAvoided,
  EconomicNetImpact,
  EconomicDecisionContext,
  EconomicFormulaTransparency,
  EvaluateEconomicImpactParams,
} from '../types/economicImpact';
import type { NormalizedMarketCropPrice, MandiPriceRecord } from '../types/market';

/**
 * Helper to format PKR numbers without fake decimals
 */
export function formatPKR(num?: number | null): string {
  if (num === null || num === undefined || isNaN(num)) return 'Unavailable';
  return `Rs ${Math.round(num).toLocaleString('en-PK')}`;
}

/**
 * Compact PKR range display (e.g. "Rs 460k – Rs 480k" or "Rs 4,600 – Rs 4,800")
 */
export function formatPKRRange(min?: number | null, max?: number | null): string {
  if (min === null || min === undefined || max === null || max === undefined) {
    return 'Unavailable';
  }
  const roundMin = Math.round(min);
  const roundMax = Math.round(max);

  if (roundMin >= 100000 && roundMax >= 100000) {
    const minK = (roundMin / 1000).toFixed(0);
    const maxK = (roundMax / 1000).toFixed(0);
    return `Rs ${minK}k – Rs ${maxK}k`;
  }

  return `Rs ${roundMin.toLocaleString('en-PK')} – Rs ${roundMax.toLocaleString('en-PK')}`;
}

/**
 * Parse an AMIS date string (DD-MM-YYYY) into a Date object
 */
export function parseReportedDate(dateStr?: string): Date | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return new Date(year, month, day);
    }
  }
  const fallback = new Date(dateStr);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Compute days elapsed between reported market date and current evaluation date
 */
export function calculateMarketFreshness(
  reportedDateStr?: string,
  now: Date = new Date()
): { freshness: string; daysOld: number; isStale: boolean; isToday: boolean } {
  if (!reportedDateStr) {
    return { freshness: 'Unknown date', daysOld: 999, isStale: true, isToday: false };
  }

  const reported = parseReportedDate(reportedDateStr);
  if (!reported) {
    return { freshness: 'Reported date format unverified', daysOld: 999, isStale: true, isToday: false };
  }

  // Calculate day difference
  const reportedZero = new Date(reported.getFullYear(), reported.getMonth(), reported.getDate());
  const nowZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = nowZero.getTime() - reportedZero.getTime();
  const daysOld = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (daysOld === 0) {
    return { freshness: 'Reported today', daysOld: 0, isStale: false, isToday: true };
  }
  if (daysOld === 1) {
    return { freshness: '1 day old', daysOld: 1, isStale: false, isToday: false };
  }
  if (daysOld > 1 && daysOld <= 7) {
    return { freshness: `${daysOld} days old`, daysOld, isStale: false, isToday: false };
  }
  if (daysOld > 7) {
    return { freshness: `${daysOld} days old (Stale)`, daysOld, isStale: true, isToday: false };
  }

  // If reported date is slightly in future (timezone offset)
  return { freshness: 'Reported today', daysOld: 0, isStale: false, isToday: true };
}

/**
 * Locate matching market price for a given crop name
 */
export function findMatchingCropPrice(
  cropName?: string,
  marketPrices?: NormalizedMarketCropPrice[] | null
): NormalizedMarketCropPrice | null {
  if (!cropName || !marketPrices || marketPrices.length === 0) return null;
  const cleanName = cropName.trim().toLowerCase();

  return (
    marketPrices.find((p) => {
      const pCrop = p.crop.toLowerCase();
      return (
        pCrop === cleanName ||
        pCrop.includes(cleanName) ||
        cleanName.includes(pCrop) ||
        (cleanName.includes('basmati') && pCrop.includes('rice')) ||
        (cleanName.includes('paddy') && pCrop.includes('rice'))
      );
    }) || null
  );
}

/**
 * Locate specific mandi inside a commodity price record
 */
export function findSpecificMandi(
  mandiQuery?: string,
  mandis?: MandiPriceRecord[]
): MandiPriceRecord | null {
  if (!mandiQuery || !mandis || mandis.length === 0) return null;
  const cleanQuery = mandiQuery.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

  return (
    mandis.find((m) => {
      const cleanMandi = m.mandi.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
      return cleanMandi === cleanQuery || cleanMandi.includes(cleanQuery) || cleanQuery.includes(cleanMandi);
    }) || null
  );
}

/**
 * Primary deterministic evaluation function for Economic Impact
 */
export function evaluateEconomicImpact(params: EvaluateEconomicImpactParams): EconomicImpactResult {
  const {
    farmContext,
    cropLifecycleContext,
    decisionResult,
    diseaseAssessment,
    marketPrices,
    farmerInput,
    currentDate = new Date(),
  } = params;

  const missingInformation: string[] = [];
  const assumptions: string[] = [];
  const warnings: string[] = [];
  const sourceRecords: string[] = [];
  const transparency: EconomicFormulaTransparency = {};

  // 1. Identify Target Crop
  const targetCrop =
    diseaseAssessment?.cropContext?.cropIdentified ||
    diseaseAssessment?.cropContext?.profileCrop ||
    farmContext?.currentCrop ||
    undefined;

  if (!targetCrop) {
    missingInformation.push('Target crop is not specified in farm context or disease assessment.');
  }

  // 2. Identify Farm Location & Market
  const userDistrict = farmContext?.district?.trim();
  const preferredMarket = farmerInput?.preferredMarket?.trim() || userDistrict;

  // 3. Resolve Market Price from Government Layer
  let economicMarketPrice: EconomicMarketPrice | undefined;
  const matchedPriceRecord = findMatchingCropPrice(targetCrop, marketPrices);

  if (matchedPriceRecord) {
    // Check for negative price data corruption
    if (matchedPriceRecord.currentPrice < 0) {
      warnings.push('Encountered invalid negative price in market price source.');
    } else {
      const freshnessData = calculateMarketFreshness(matchedPriceRecord.reportedDate, currentDate);
      if (freshnessData.isStale) {
        warnings.push(`Market price data is ${freshnessData.daysOld} days old. It should be treated as historical reference.`);
      }

      // Check if specific mandi matches user's district or preferred market
      const specificMandi = findSpecificMandi(preferredMarket, matchedPriceRecord.mandis);

      if (specificMandi && specificMandi.pricePerMaund > 0) {
        const cleanMandiName = specificMandi.mandi.replace(/^&nbsp;|\s+/g, ' ').trim();
        economicMarketPrice = {
          value: specificMandi.pricePerMaund,
          min: specificMandi.minPrice > 0 ? Math.round(specificMandi.minPrice * 0.40) : null,
          max: specificMandi.maxPrice > 0 ? Math.round(specificMandi.maxPrice * 0.40) : null,
          unit: 'Rs / 40kg maund',
          source: matchedPriceRecord.source,
          sourceLabel: matchedPriceRecord.sourceLabel,
          market: `${cleanMandiName} Mandi (${matchedPriceRecord.source === 'AMIS_PUNJAB' ? 'Punjab' : 'Govt'})`,
          reportedDate: matchedPriceRecord.reportedDate,
          retrievedAt: matchedPriceRecord.retrievedAt,
          isOfficial: matchedPriceRecord.isOfficial,
          freshness: freshnessData.freshness,
          rawUnit: specificMandi.rawUnit || 'Rs/100kg',
          pricePer100Kg: specificMandi.fqp,
        };

        transparency.unitConversionNote = `Official AMIS quotation is ${specificMandi.rawUnit || 'Rs/100kg'}. Standardized to 40kg maund: pricePerMaund = sourcePrice × 40 / 100 (${specificMandi.fqp} × 0.40 = Rs ${specificMandi.pricePerMaund}).`;
        sourceRecords.push(
          `${matchedPriceRecord.sourceLabel}: ${cleanMandiName} mandi, reported ${matchedPriceRecord.reportedDate}, FQP: Rs ${specificMandi.fqp}/100kg (${formatPKR(specificMandi.pricePerMaund)}/maund)`
        );
      } else {
        // Use commodity average
        const isOfficial = matchedPriceRecord.isOfficial;
        economicMarketPrice = {
          value: matchedPriceRecord.currentPrice,
          min: matchedPriceRecord.minPricePer40Kg ?? null,
          max: matchedPriceRecord.maxPricePer40Kg ?? null,
          unit: 'Rs / 40kg maund',
          source: matchedPriceRecord.source,
          sourceLabel: matchedPriceRecord.sourceLabel,
          market:
            matchedPriceRecord.mandisCount > 0
              ? `Punjab Mandis Benchmark (${matchedPriceRecord.mandisCount} centers)`
              : 'Punjab Market Average',
          reportedDate: matchedPriceRecord.reportedDate,
          retrievedAt: matchedPriceRecord.retrievedAt,
          isOfficial,
          freshness: freshnessData.freshness,
          rawUnit: matchedPriceRecord.rawUnit,
          pricePer100Kg: matchedPriceRecord.pricePer100Kg,
        };

        transparency.unitConversionNote = `Standardized to 40kg maund: pricePerMaund = sourcePrice × 40 / 100.`;
        sourceRecords.push(
          `${matchedPriceRecord.sourceLabel} [${isOfficial ? 'Official' : 'Fallback'}]: reported ${matchedPriceRecord.reportedDate}, modal: ${formatPKR(matchedPriceRecord.currentPrice)}/maund`
        );
      }
    }
  } else {
    missingInformation.push(`No market price quotation available for '${targetCrop || 'crop'}'.`);
  }

  // 4. Resolve Production Quantity
  let economicQuantity: EconomicQuantity | undefined;
  const rawQuantityValue = farmerInput?.quantityValue;
  const rawQuantityUnit = farmerInput?.quantityUnit?.toLowerCase() || 'maunds';

  if (rawQuantityValue !== undefined && rawQuantityValue !== null) {
    if (rawQuantityValue < 0) {
      warnings.push('Negative production quantity entered. Quantity must be zero or positive.');
      economicQuantity = {
        value: null,
        unit: rawQuantityUnit,
        source: 'UNAVAILABLE',
        note: 'Invalid negative quantity provided.',
      };
    } else if (rawQuantityUnit === 'maunds' || rawQuantityUnit === 'maund' || rawQuantityUnit === 'من') {
      economicQuantity = {
        value: rawQuantityValue,
        unit: 'maunds',
        source: 'FARMER',
        note: 'Farmer-provided expected harvest quantity',
      };
    } else if (rawQuantityUnit === 'kg' || rawQuantityUnit === 'kilogram') {
      // 1 maund = 40 kg
      const maunds = rawQuantityValue / 40;
      economicQuantity = {
        value: maunds,
        unit: 'maunds',
        source: 'FARMER',
        note: `Farmer-provided ${rawQuantityValue} kg converted to ${maunds.toFixed(2)} maunds (40 kg/maund)`,
      };
    } else {
      warnings.push(`Unrecognized quantity unit '${rawQuantityUnit}'. Cannot convert safely to standard maunds.`);
      economicQuantity = {
        value: null,
        unit: rawQuantityUnit,
        source: 'UNAVAILABLE',
        note: `Unsupported unit '${rawQuantityUnit}'. Supported units are maunds or kg.`,
      };
    }
  } else {
    // Check if acreage is known
    const acres = farmContext?.farmSizeAcres;
    if (acres && acres > 0) {
      missingInformation.push('Expected production quantity has not been provided.');
      economicQuantity = {
        value: null,
        unit: 'maunds',
        source: 'UNAVAILABLE',
        note: `Farm size is recorded as ${acres} acres, but production quantity cannot be assumed without farmer input.`,
      };
      assumptions.push('Yield per acre is not assumed or fabricated. Expected production must be entered by the farmer.');
    } else {
      missingInformation.push('Expected production quantity is not available.');
      economicQuantity = {
        value: null,
        unit: 'maunds',
        source: 'UNAVAILABLE',
        note: 'Production quantity unavailable.',
      };
    }
  }

  // 5. Calculate Estimated Gross Market Value
  let estimatedGrossValue: MonetaryRange | undefined;
  if (
    economicQuantity?.value !== null &&
    economicQuantity?.value !== undefined &&
    economicQuantity.value > 0 &&
    economicMarketPrice?.value !== null &&
    economicMarketPrice?.value !== undefined &&
    economicMarketPrice.value > 0
  ) {
    const qty = economicQuantity.value;
    const priceVal = economicMarketPrice.value;
    const grossVal = Math.round(qty * priceVal);

    const minGross = economicMarketPrice.min ? Math.round(qty * economicMarketPrice.min) : grossVal;
    const maxGross = economicMarketPrice.max ? Math.round(qty * economicMarketPrice.max) : grossVal;

    estimatedGrossValue = {
      value: grossVal,
      min: minGross,
      max: maxGross,
      unit: 'PKR',
      formatted: formatPKR(grossVal),
      basis: `${qty} maunds × ${formatPKR(priceVal)}/maund (AMIS reference)`,
    };

    transparency.grossValueFormula = 'Gross Market Value = Quantity (maunds) × Market Price (Rs/maund)';
    transparency.grossValueCalculation = `${qty} maunds × Rs ${priceVal.toLocaleString('en-PK')} = Rs ${grossVal.toLocaleString('en-PK')}`;
  } else {
    estimatedGrossValue = {
      value: null,
      min: null,
      max: null,
      unit: 'PKR',
      basis: !economicQuantity?.value
        ? 'Expected production quantity has not been provided.'
        : 'Market price is unavailable.',
    };
  }

  // 6. Calculate Risk Exposure (Deterministic & Grounded)
  let riskExposure: EconomicRiskExposure;
  const validatedLossRange = farmerInput?.validatedLossPercentageRange;

  if (
    validatedLossRange &&
    Array.isArray(validatedLossRange) &&
    validatedLossRange.length === 2 &&
    estimatedGrossValue?.value
  ) {
    const [minPct, maxPct] = validatedLossRange;
    if (minPct >= 0 && maxPct >= minPct && maxPct <= 100) {
      const minRisk = Math.round(estimatedGrossValue.value * (minPct / 100));
      const maxRisk = Math.round(estimatedGrossValue.value * (maxPct / 100));
      riskExposure = {
        status: 'QUANTIFIABLE',
        value: Math.round((minRisk + maxRisk) / 2),
        min: minRisk,
        max: maxRisk,
        unit: 'PKR',
        formatted: formatPKRRange(minRisk, maxRisk),
        basis: `Validated loss range (${minPct}% – ${maxPct}%) applied to estimated gross value.`,
      };
      transparency.riskExposureFormula = `Risk Exposure = Estimated Gross Value × Loss Range (${minPct}% – ${maxPct}%)`;
    } else {
      warnings.push('Validated loss percentage range must be between 0% and 100%.');
      riskExposure = {
        status: 'UNQUANTIFIABLE',
        unit: 'PKR',
        reason: 'Invalid loss percentage range provided.',
      };
    }
  } else {
    // Unquantifiable without validated loss percentage
    const hasDisease = !!diseaseAssessment?.disease && diseaseAssessment.disease !== 'None';
    const reason = hasDisease
      ? 'No validated crop-loss percentage is available for this disease and stage. Risk exposure is not quantifiable without verified loss parameters.'
      : 'No validated loss parameters are available for current conditions.';

    riskExposure = {
      status: 'UNQUANTIFIABLE',
      unit: 'PKR',
      reason,
    };
  }

  // 7. Intervention Cost
  let interventionCost: EconomicInterventionCost;
  const costPkr = farmerInput?.interventionCostPkr;
  if (costPkr !== undefined && costPkr !== null) {
    if (costPkr < 0) {
      warnings.push('Intervention cost cannot be negative.');
      interventionCost = {
        status: 'UNAVAILABLE',
        unit: 'PKR',
        reason: 'Invalid negative intervention cost provided.',
      };
    } else {
      interventionCost = {
        status: 'PROVIDED',
        value: costPkr,
        min: costPkr,
        max: costPkr,
        unit: 'PKR',
        formatted: formatPKR(costPkr),
        basis: farmerInput?.interventionCostBasis || 'Farmer-entered intervention cost',
      };
    }
  } else {
    interventionCost = {
      status: 'UNAVAILABLE',
      unit: 'PKR',
      reason: 'No verified intervention cost has been provided by the farmer.',
    };
  }

  // 8. Potential Loss Avoided = Risk Exposure × Validated Intervention Effectiveness
  // The system MUST NOT assume: Potential Loss Avoided = Full Risk Exposure
  // The system MUST NOT invent arbitrary percentages (e.g. 50%, 70%, 80%).
  let potentialLossAvoided: EconomicPotentialLossAvoided;
  const rawEffectiveness = farmerInput?.validatedInterventionEffectiveness;

  if (
    riskExposure.status === 'QUANTIFIABLE' &&
    riskExposure.min !== null &&
    riskExposure.min !== undefined &&
    riskExposure.max !== null &&
    riskExposure.max !== undefined
  ) {
    if (rawEffectiveness !== undefined && rawEffectiveness !== null) {
      // Helper to normalize effectiveness parameter to ratio in [0, 1]
      const toRatio = (val: number): number | null => {
        if (isNaN(val) || val < 0) return null;
        if (val > 1) {
          if (val <= 100) return val / 100;
          return null; // Invalid percentage > 100%
        }
        return val;
      };

      if (Array.isArray(rawEffectiveness) && rawEffectiveness.length === 2) {
        const [eff1, eff2] = rawEffectiveness;
        const ratio1 = toRatio(eff1);
        const ratio2 = toRatio(eff2);

        if (ratio1 !== null && ratio2 !== null && ratio1 <= ratio2) {
          const minAvoided = Math.round(riskExposure.min * ratio1);
          const maxAvoided = Math.round(riskExposure.max * ratio2);
          const valueAvoided = Math.round((minAvoided + maxAvoided) / 2);

          potentialLossAvoided = {
            status: 'QUANTIFIABLE',
            value: valueAvoided,
            min: minAvoided,
            max: maxAvoided,
            unit: 'PKR',
            formatted: formatPKRRange(minAvoided, maxAvoided),
            basis: `Potential loss avoided: Risk Exposure (${formatPKRRange(riskExposure.min, riskExposure.max)}) × validated effectiveness (${(ratio1 * 100).toFixed(0)}% – ${(ratio2 * 100).toFixed(0)}%).`,
          };
          transparency.lossAvoidedFormula = `Potential Loss Avoided = Risk Exposure × Validated Intervention Effectiveness (${(ratio1 * 100).toFixed(0)}% – ${(ratio2 * 100).toFixed(0)}%)`;
        } else {
          warnings.push('Validated intervention effectiveness range must be between 0% and 100%.');
          potentialLossAvoided = {
            status: 'UNQUANTIFIABLE',
            unit: 'PKR',
            reason: 'Invalid intervention effectiveness range provided.',
          };
        }
      } else if (typeof rawEffectiveness === 'number') {
        const ratio = toRatio(rawEffectiveness);
        if (ratio !== null) {
          const minAvoided = Math.round(riskExposure.min * ratio);
          const maxAvoided = Math.round(riskExposure.max * ratio);
          const valueAvoided = Math.round((minAvoided + maxAvoided) / 2);

          potentialLossAvoided = {
            status: 'QUANTIFIABLE',
            value: valueAvoided,
            min: minAvoided,
            max: maxAvoided,
            unit: 'PKR',
            formatted: formatPKRRange(minAvoided, maxAvoided),
            basis: `Potential loss avoided: Risk Exposure (${formatPKRRange(riskExposure.min, riskExposure.max)}) × validated effectiveness (${(ratio * 100).toFixed(0)}%).`,
          };
          transparency.lossAvoidedFormula = `Potential Loss Avoided = Risk Exposure × Validated Intervention Effectiveness (${(ratio * 100).toFixed(0)}%)`;
        } else {
          warnings.push('Validated intervention effectiveness must be a valid percentage (0% to 100%) or ratio (0 to 1).');
          potentialLossAvoided = {
            status: 'UNQUANTIFIABLE',
            unit: 'PKR',
            reason: 'Invalid intervention effectiveness value provided.',
          };
        }
      } else {
        warnings.push('Unsupported format for validated intervention effectiveness.');
        potentialLossAvoided = {
          status: 'UNQUANTIFIABLE',
          unit: 'PKR',
          reason: 'Unsupported intervention effectiveness format.',
        };
      }
    } else {
      // Intervention effectiveness is unavailable -> DO NOT assume full exposure or guess an arbitrary %
      potentialLossAvoided = {
        status: 'UNQUANTIFIABLE',
        unit: 'PKR',
        reason: 'Validated intervention effectiveness is unavailable. Potential loss avoided cannot be quantified without verified intervention efficacy parameters.',
      };
    }
  } else {
    potentialLossAvoided = {
      status: 'UNQUANTIFIABLE',
      unit: 'PKR',
      reason: 'Risk exposure is unquantifiable. Potential loss avoided cannot be determined without validated risk exposure.',
    };
  }

  // 9. Net Potential Impact = Potential Loss Avoided - Verified Intervention Cost
  let netPotentialImpact: EconomicNetImpact;
  if (
    potentialLossAvoided.status === 'QUANTIFIABLE' &&
    potentialLossAvoided.min !== null &&
    potentialLossAvoided.min !== undefined &&
    potentialLossAvoided.max !== null &&
    potentialLossAvoided.max !== undefined &&
    interventionCost.status === 'PROVIDED' &&
    interventionCost.value !== null &&
    interventionCost.value !== undefined
  ) {
    const netMin = potentialLossAvoided.min - interventionCost.value;
    const netMax = potentialLossAvoided.max - interventionCost.value;
    netPotentialImpact = {
      status: 'CALCULATED',
      value: Math.round((netMin + netMax) / 2),
      min: netMin,
      max: netMax,
      unit: 'PKR',
      formatted: formatPKRRange(netMin, netMax),
      basis: `Potential Loss Avoided (${formatPKRRange(potentialLossAvoided.min, potentialLossAvoided.max)}) minus Verified Intervention Cost (${formatPKR(interventionCost.value)})`,
    };
    transparency.netImpactFormula = 'Net Potential Impact = Potential Loss Avoided - Verified Intervention Cost';
  } else {
    const reasons: string[] = [];
    if (potentialLossAvoided.status !== 'QUANTIFIABLE') {
      reasons.push('quantifiable loss avoidance (requires validated intervention effectiveness)');
    }
    if (interventionCost.status !== 'PROVIDED') {
      reasons.push('verified intervention cost from the farmer');
    }
    netPotentialImpact = {
      status: 'INSUFFICIENT_INFO',
      unit: 'PKR',
      reason: `Net potential impact requires both ${reasons.join(' and ')}.`,
    };
  }

  // 10. Decision Context Signals (Translating Decision Engine without Fake Numbers)
  const decisionContext: EconomicDecisionContext = {};

  if (decisionResult?.sprayingDecision) {
    const status = decisionResult.sprayingDecision.status;
    if (status === 'avoid') {
      decisionContext.sprayingRelevance =
        'Delaying spraying prevents chemical wash-off and saves input costs from wasted application. Exact savings depend on product price.';
    } else if (status === 'suitable') {
      decisionContext.sprayingRelevance =
        'Current weather provides an optimal application window, maximizing chemical efficacy and return on investment.';
    } else if (status === 'caution') {
      decisionContext.sprayingRelevance =
        'Marginal weather conditions may reduce application efficiency. Monitor closely before committing resources.';
    }
  }

  if (decisionResult?.irrigationDecision) {
    const status = decisionResult.irrigationDecision.status;
    if (status === 'delay') {
      decisionContext.irrigationRelevance =
        'Delaying irrigation avoids fuel and tube-well electricity expenses due to anticipated rainfall.';
    } else if (status === 'irrigate') {
      decisionContext.irrigationRelevance =
        'Timely irrigation prevents soil moisture deficit from impeding grain filling or vegetative growth.';
    }
  }

  if (cropLifecycleContext?.currentStage) {
    decisionContext.lifecycleRelevance = `Crop is currently in '${cropLifecycleContext.currentStage}' phase (${cropLifecycleContext.lifecycleProgress}). Reproductive stages have heightened sensitivity to moisture and disease stress.`;
  }

  // 11. Economic Confidence Scoring
  let confidence: EconomicConfidence = 'NOT_ENOUGH_DATA';

  const hasPrice = !!economicMarketPrice?.value && economicMarketPrice.value > 0;
  const isOfficialPrice = !!economicMarketPrice?.isOfficial;
  const isFreshPrice = economicMarketPrice ? calculateMarketFreshness(economicMarketPrice.reportedDate, currentDate).daysOld <= 3 : false;
  const hasQuantity = !!economicQuantity?.value && economicQuantity.value > 0;

  if (isOfficialPrice && isFreshPrice && hasQuantity && estimatedGrossValue?.value) {
    if (interventionCost.status === 'PROVIDED' && riskExposure.status === 'QUANTIFIABLE') {
      confidence = 'HIGH';
    } else {
      confidence = 'MEDIUM';
    }
  } else if (hasPrice && hasQuantity) {
    confidence = 'MEDIUM';
  } else if (hasPrice || hasQuantity) {
    confidence = 'LOW';
  } else {
    confidence = 'NOT_ENOUGH_DATA';
  }

  // 12. Overall Status
  let status: EconomicStatus = 'INSUFFICIENT_DATA';
  if (estimatedGrossValue?.value !== null && estimatedGrossValue?.value !== undefined) {
    if (netPotentialImpact.status === 'CALCULATED') {
      status = 'CALCULATED';
    } else {
      status = 'PARTIAL';
    }
  } else if (economicMarketPrice?.value) {
    status = 'PARTIAL';
  }

  return {
    status,
    crop: targetCrop,
    market: economicMarketPrice?.market,
    marketPrice: economicMarketPrice,
    quantity: economicQuantity,
    farmSizeAcres: farmContext?.farmSizeAcres,
    estimatedGrossValue,
    riskExposure,
    interventionCost,
    potentialLossAvoided,
    netPotentialImpact,
    decisionContext,
    confidence,
    assumptions,
    missingInformation,
    warnings,
    sourceRecords,
    transparency,
    calculatedAt: new Date().toISOString(),
  };
}
