/**
 * Saathi Deal Intelligence Drawer / Modal
 *
 * Explains market context, official AMIS reference comparison, and economic gross reference for produce listings.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 🔒 ZERO HALLUCINATION / DETERMINISTIC SAFETY GUARANTEE:
 * 1. 100% deterministic calculation. Compares seller asking price against AMIS.
 * 2. Transparently cites AMIS Punjab, bulletin dates, and wholesale mandi points.
 * 3. Never claims "fair price" or guaranteed profit without verified cost data.
 * 4. Connects seamlessly with the Decision Evidence Drawer for full 4-step proof.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import {
  X,
  TrendingUp,
  Scale,
  Building2,
  Calendar,
  Layers,
  Phone,
  MessageCircle,
  ExternalLink,
  DollarSign,
  Info,
  CheckCircle2,
} from 'lucide-react';
import type { DealIntelligenceEvaluation, EnhancedMarketplaceListing } from '../types/dealIntelligence';
import type { NormalizedMarketCropPrice } from '../types/market';
import { evaluateMarketplaceDeal } from '../services/dealIntelligence';

interface DealIntelligenceDrawerProps {
  listing: EnhancedMarketplaceListing | null;
  marketPrices: NormalizedMarketCropPrice[];
  isOpen: boolean;
  onClose: () => void;
  onOpenEvidence?: () => void;
}

export function DealIntelligenceDrawer({
  listing,
  marketPrices,
  isOpen,
  onClose,
  onOpenEvidence,
}: DealIntelligenceDrawerProps) {
  if (!isOpen || !listing) return null;

  const evaluation: DealIntelligenceEvaluation = evaluateMarketplaceDeal({
    listing,
    marketPrices,
  });

  const { ratingConfig, observed, calculated, economicReference, unknowns, limitations } =
    evaluation;

  const handleWhatsAppContact = () => {
    const phone = (listing.contactPhone || '+923000000000').replace(/[^0-9]/g, '');
    const text = encodeURIComponent(
      `Assalam-o-Alaikum! I saw your listing for ${listing.cropName} (${listing.quantity} at ${listing.pricePerUnit}) on Saathi Marketplace. Is this produce still available?`
    );
    window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
  };

  const handlePhoneContact = () => {
    const phone = listing.contactPhone || '+923000000000';
    window.location.href = `tel:${phone}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity duration-300"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col overflow-hidden animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-saathi-100 flex items-center justify-between bg-gradient-to-r from-saathi-50 to-white">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-saathi-600 text-white shadow-sm">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-saathi-900 leading-tight">
                  Deal Intelligence
                </h2>
                {listing.listingOrigin === 'demo' ? (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Example Demo Listing
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Farmer Listing
                  </span>
                )}
              </div>
              <p className="text-xs text-saathi-500 mt-0.5">
                Market Context • AMIS Punjab Official Reference
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-saathi-400 hover:text-saathi-700 hover:bg-saathi-100 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Produce Summary Card */}
          <div className="p-4 rounded-xl bg-saathi-50/70 border border-saathi-100 flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-saathi-500 uppercase tracking-wider">
                Produce Listing
              </span>
              <h3 className="text-base font-bold text-saathi-900 mt-0.5">
                {listing.cropName}
              </h3>
              <p className="text-xs text-saathi-600 mt-0.5">
                {listing.location} • Listed by {listing.farmerName}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-saathi-400 block">{listing.quantity}</span>
              <span className="text-base font-extrabold text-saathi-900">
                {listing.pricePerUnit}
              </span>
            </div>
          </div>

          {/* Deal Rating Banner */}
          <div className={`p-4 rounded-xl border flex items-start gap-3.5 ${ratingConfig.badgeClass}`}>
            <div className={`w-3 h-3 rounded-full mt-1 shrink-0 ${ratingConfig.dotColor} ring-4 ring-white shadow-xs`} />
            <div className="flex-1">
              <h4 className="text-sm font-bold capitalize">
                {ratingConfig.label}
              </h4>
              <p className="text-xs mt-1 leading-relaxed opacity-90">
                {calculated?.calculationExplanation || ratingConfig.description}
              </p>
            </div>
          </div>

          {/* Price Context Breakdown Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-saathi-700 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-saathi-600" />
              Price Context & Official Reference
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {/* Seller Asking */}
              <div className="p-3.5 rounded-xl bg-white border border-saathi-200 shadow-xs">
                <span className="text-[11px] font-medium text-saathi-500 block">
                  Seller Asking Price
                </span>
                <span className="text-base font-bold text-saathi-900 mt-1 block">
                  {evaluation.sellerAskingPricePer40Kg
                    ? `Rs ${evaluation.sellerAskingPricePer40Kg.toLocaleString()}`
                    : listing.pricePerUnit}
                </span>
                <span className="text-[10px] text-saathi-400">per 40kg (1 maund)</span>
              </div>

              {/* Official AMIS Reference */}
              <div className="p-3.5 rounded-xl bg-saathi-50 border border-saathi-200 shadow-xs">
                <span className="text-[11px] font-medium text-saathi-600 block flex items-center justify-between">
                  <span>AMIS Reference</span>
                  {observed?.isOfficial && (
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded">
                      Official
                    </span>
                  )}
                </span>
                <span className="text-base font-bold text-saathi-900 mt-1 block">
                  {observed
                    ? `Rs ${observed.modalPricePer40Kg.toLocaleString()}`
                    : 'Unavailable'}
                </span>
                <span className="text-[10px] text-saathi-500">
                  {observed ? `per 40kg (${observed.mandi})` : 'No live rates'}
                </span>
              </div>
            </div>

            {/* Official Range if available */}
            {observed && observed.minPricePer40Kg && observed.maxPricePer40Kg && (
              <div className="p-3 rounded-lg bg-saathi-50/50 border border-saathi-100 flex items-center justify-between text-xs">
                <span className="text-saathi-600 font-medium">Official Mandi Range:</span>
                <span className="font-bold text-saathi-800">
                  Rs {observed.minPricePer40Kg.toLocaleString()} – Rs {observed.maxPricePer40Kg.toLocaleString()} / 40kg
                </span>
              </div>
            )}
          </div>

          {/* Economic Reference (Estimated Gross Value) */}
          {economicReference && (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-700" />
                  Estimated Gross Market Reference
                </span>
                <span className="text-base font-extrabold text-emerald-800">
                  {economicReference.grossFormatted}
                </span>
              </div>
              <p className="text-[11px] font-mono text-emerald-800/90 bg-white/70 p-2 rounded border border-emerald-100">
                {economicReference.formula}
              </p>
              <p className="text-[10px] text-emerald-700 leading-relaxed italic">
                {economicReference.disclaimer}
              </p>
            </div>
          )}

          {/* How this was calculated */}
          <div className="p-4 rounded-xl bg-saathi-50/60 border border-saathi-100 space-y-2">
            <h5 className="text-xs font-bold text-saathi-800 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-saathi-600" />
              How Market Context is Calculated
            </h5>
            <p className="text-xs text-saathi-600 leading-relaxed">
              Saathi compares the seller&apos;s unit price against the verified Directorate of Agriculture (AMIS Punjab) modal wholesale price reported for Punjab mandis.
            </p>
            <p className="text-[11px] text-saathi-500 leading-relaxed">
              ⚠️ This is an informational market benchmark, not a guaranteed transaction price or contractual valuation.
            </p>
          </div>

          {/* Source Provenance */}
          {observed && (
            <div className="p-4 rounded-xl bg-white border border-saathi-200 space-y-2.5">
              <h5 className="text-xs font-bold text-saathi-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-saathi-600" />
                Data Provenance & Source Attribution
              </h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-[10px] text-saathi-400 block">Authority</span>
                  <span className="font-semibold text-saathi-700">{observed.sourceLabel}</span>
                </div>
                <div>
                  <span className="text-[10px] text-saathi-400 block">Reported Date</span>
                  <span className="font-semibold text-saathi-700 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-saathi-400" />
                    {observed.reportedDate}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-saathi-400 block">Mandi Benchmark</span>
                  <span className="font-semibold text-saathi-700">{observed.mandi}</span>
                </div>
                <div>
                  <span className="text-[10px] text-saathi-400 block">Official Record</span>
                  <a
                    href="http://www.amis.pk"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-saathi-700 hover:text-saathi-900 inline-flex items-center gap-1"
                  >
                    amis.pk <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Unknowns / Missing Information */}
          {unknowns.length > 0 && (
            <div className="space-y-1.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200">
              <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                Unverified / Missing Information
              </span>
              <ul className="space-y-1 text-xs text-amber-700">
                {unknowns.map((unk, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500 mt-0.5">•</span>
                    <span>{unk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Limitations */}
          {limitations.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-saathi-600 uppercase tracking-wider">
                Scientific Limitations & Quality Factors
              </span>
              <ul className="space-y-1 text-xs text-saathi-500">
                {limitations.map((lim, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-saathi-400 mt-0.5">•</span>
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* View Evidence Button */}
          {onOpenEvidence && (
            <button
              onClick={() => {
                onClose();
                onOpenEvidence();
              }}
              className="w-full py-2.5 px-4 rounded-xl border border-saathi-300 hover:bg-saathi-50 text-saathi-700 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Layers className="w-4 h-4 text-saathi-600" />
              View 4-Step Decision Evidence Chain
            </button>
          )}
        </div>

        {/* Drawer Footer / Buyer Contact Actions */}
        <div className="p-5 border-t border-saathi-100 bg-saathi-50/50 flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleWhatsAppContact}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Inquiry
          </button>
          <button
            onClick={handlePhoneContact}
            className="flex-1 py-3 px-4 rounded-xl border border-saathi-300 hover:bg-white text-saathi-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Phone className="w-4 h-4 text-saathi-600" />
            Direct Call / SMS
          </button>
        </div>
      </div>
    </div>
  );
}
export default DealIntelligenceDrawer;
