import { useState, useEffect, useCallback, useRef, type RefObject } from 'react';
import { X, ChevronRight, Check, ScanSearch, Sprout, MessageSquare, TrendingUp, Store } from 'lucide-react';

const TOUR_STORAGE_KEY = 'saathi-tour-seen';
const PADDING = 12;       // breathing room around cutout (px)
const TOOLTIP_GAP = 14;   // gap between spotlight edge and tooltip (px)
const TOOLTIP_MARGIN = 12; // min distance from viewport edge (px)

interface TourStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  refId: string;
}

interface OnboardingTourProps {
  cardRefs: Record<string, RefObject<HTMLAnchorElement | null>>;
}

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPos {
  top: number;
  left: number;
  /** Arrow offset from tooltip left edge */
  arrowLeft: number;
  /** true = arrow on bottom (tooltip is above spotlight) */
  flipY: boolean;
}

const steps: TourStep[] = [
  {
    icon: <ScanSearch className="w-5 h-5" />,
    title: 'Disease Scanner',
    description: 'Snap a photo of your crop leaf — AI detects disease and suggests treatment.',
    refId: 'disease',
  },
  {
    icon: <Sprout className="w-5 h-5" />,
    title: 'Crop Advisor',
    description: 'Enter your farm details and get AI-powered crop recommendations for maximum yield.',
    refId: 'crop',
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    title: 'Saathi AI',
    description: 'Ask any farming question in your language — get expert advice instantly.',
    refId: 'assistant',
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    title: 'Market Prices',
    description: 'Track live mandi prices for your crops and find the best time to sell.',
    refId: 'market',
  },
  {
    icon: <Store className="w-5 h-5" />,
    title: 'Marketplace',
    description: 'Buy seeds, fertilizers, and equipment or sell your harvest directly.',
    refId: 'marketplace',
  },
];

export default function OnboardingTour({ cardRefs }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [spotlight, setSpotlight] = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  // Track the step that the current spotlight belongs to — prevents stale rects
  const spotlightStepRef = useRef<number>(-1);

  // Show tour on first visit
  useEffect(() => {
    const seen = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!seen) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  /**
   * Read the current step's target rect and update both spotlight and tooltip.
   * Accepts the step index explicitly so it's always reading the CURRENT step —
   * never a stale closure value.
   */
  const computeLayout = useCallback((stepIndex: number) => {
    const step = steps[stepIndex];
    const ref = cardRefs[step.refId];
    if (!ref?.current) return;

    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const isCardVisible =
      rect.top >= 0 &&
      rect.bottom <= vh &&
      rect.left >= 0 &&
      rect.right <= vw;

    if (!isCardVisible) {
      spotlightStepRef.current = -1;
      setSpotlight(null);
      setTooltipPos(null);
      return;
    }

    // ── Spotlight ─────────────────────────────────────────────────────────
    const sp: SpotlightRect = {
      top:    rect.top    - PADDING,
      left:   rect.left   - PADDING,
      width:  rect.width  + PADDING * 2,
      height: rect.height + PADDING * 2,
    };

    // Only set spotlight if it belongs to the step we're computing for
    spotlightStepRef.current = stepIndex;
    setSpotlight(sp);

    // ── Tooltip ───────────────────────────────────────────────────────────
    // Read tooltip dimensions (or use sensible defaults before first render)
    const ttH = tooltipRef.current?.offsetHeight ?? 170;
    const ttW = tooltipRef.current?.offsetWidth  ?? 320;

    // Decide vertical placement: prefer below, flip above if not enough room
    const spaceBelow = vh - (rect.bottom + PADDING + TOOLTIP_GAP);
    const spaceAbove =       rect.top    - PADDING - TOOLTIP_GAP;
    const flipY = spaceBelow < ttH + TOOLTIP_MARGIN && spaceAbove >= ttH + TOOLTIP_MARGIN;

    let ttTop: number;
    if (flipY) {
      ttTop = rect.top - PADDING - TOOLTIP_GAP - ttH;
    } else {
      ttTop = rect.bottom + PADDING + TOOLTIP_GAP;
    }
    // Clamp top/bottom to viewport
    ttTop = Math.max(TOOLTIP_MARGIN, Math.min(ttTop, vh - ttH - TOOLTIP_MARGIN));

    // Center tooltip horizontally on the target card, then clamp to viewport
    const idealLeft = rect.left + rect.width / 2 - ttW / 2;
    const clampedLeft = Math.max(
      TOOLTIP_MARGIN,
      Math.min(idealLeft, vw - ttW - TOOLTIP_MARGIN)
    );

    // Arrow offset: where the card center is, relative to the tooltip's left edge
    // Clamped so the arrow stays within the tooltip bounds (with 16px margin each side)
    const cardCenterX = rect.left + rect.width / 2;
    const rawArrow = cardCenterX - clampedLeft;
    const arrowLeft = Math.max(20, Math.min(rawArrow, ttW - 20));

    setTooltipPos({ top: ttTop, left: clampedLeft, arrowLeft, flipY });
  }, [cardRefs]);

  // When step changes: compute layout immediately — no scrolling.
  useEffect(() => {
    if (!isVisible) return;

    setSpotlight(null);
    setTooltipPos(null);
    spotlightStepRef.current = -1;

    const frameId = requestAnimationFrame(() => computeLayout(currentStep));
    return () => cancelAnimationFrame(frameId);
  }, [currentStep, isVisible, cardRefs, computeLayout]);

  // Recalculate on scroll / resize while tour is open
  useEffect(() => {
    if (!isVisible) return;
    const refresh = () => computeLayout(currentStep);
    window.addEventListener('scroll', refresh, { passive: true });
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('scroll', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, [isVisible, currentStep, computeLayout]);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    localStorage.setItem(TOUR_STORAGE_KEY, 'true');
  }, []);

  const next = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [currentStep, dismiss]);

  if (!isVisible) return null;

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <>
      {/* ── Spotlight overlay ───────────────────────────────────────────── */}
      {spotlight && (
        <div
          className="fixed inset-0 z-50 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="absolute rounded-2xl"
            style={{
              top:    spotlight.top,
              left:   spotlight.left,
              width:  spotlight.width,
              height: spotlight.height,
              boxShadow: `0 0 0 9999px rgba(15, 40, 25, 0.68), 0 0 0 3px rgba(255, 179, 0, 0.85)`,
            }}
          />
        </div>
      )}

      {/* ── Tooltip ──────────────────────────────────────────────────────── */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className="fixed z-[60]"
          style={{
            top:   tooltipPos.top,
            left:  tooltipPos.left,
            width: Math.min(340, window.innerWidth - TOOLTIP_MARGIN * 2),
          }}
          role="dialog"
          aria-label="Onboarding tour"
          aria-describedby="tour-description"
        >
          <div
            className={`absolute w-4 h-4 bg-white border-harvest-200 rotate-45 ${
              tooltipPos.flipY
                ? 'bottom-[-9px] border-b-2 border-r-2'
                : 'top-[-9px] border-t-2 border-l-2'
            }`}
            style={{ left: tooltipPos.arrowLeft - 8 }}
          />

          <div className="hero-card !p-0 overflow-hidden shadow-2xl border-2 border-harvest-200 relative">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === currentStep
                        ? 'w-6 bg-harvest-500'
                        : i < currentStep
                        ? 'w-1.5 bg-harvest-300'
                        : 'w-1.5 bg-saathi-200'
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={dismiss}
                className="p-1.5 -mr-1.5 text-saathi-400 hover:text-saathi-600 hover:bg-saathi-50 rounded-lg transition-colors"
                aria-label="Skip tour"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-4">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-harvest-50 flex items-center justify-center text-harvest-700 flex-shrink-0">
                  {step.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-saathi-900 text-base">
                    {step.title}
                  </h3>
                  <p id="tour-description" className="text-saathi-600 text-sm mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={dismiss}
                  className="text-sm text-saathi-500 hover:text-saathi-700 px-3 py-2 rounded-lg hover:bg-saathi-50 transition-colors"
                >
                  Skip tour
                </button>
                <button
                  onClick={next}
                  className="btn-accent text-sm px-4 py-2"
                >
                  {isLastStep ? (
                    <>
                      Get Started
                      <Check className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}