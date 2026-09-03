import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Search,
  Plus,
  Loader2,
  MapPin,
  User,
  Package,
  Trash2,
  CheckCircle2,
  Bot,
  Scale,
  MessageCircle,
  Phone,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import {
  getMarketplaceListings,
  postListing,
  deleteListing,
} from '@/services/api';
import { getGovernmentMarketPrices } from '@/services/marketPriceService';
import { evaluateMarketplaceDeal } from '@/services/dealIntelligence';
import { DealIntelligenceDrawer } from '@/components/DealIntelligenceDrawer';
import { DecisionEvidenceDrawer } from '@/components/DecisionEvidenceDrawer';
import { useAuth } from '@/context/AuthContext';
import type { NormalizedMarketCropPrice, DecisionEvidenceReport } from '@/types';
import type { EnhancedMarketplaceListing } from '@/types/dealIntelligence';

type View = 'browse' | 'post';
type OriginFilter = 'all' | 'farmer' | 'demo';

export default function MarketplacePage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('browse');
  const [listings, setListings] = useState<EnhancedMarketplaceListing[]>([]);
  const [marketPrices, setMarketPrices] = useState<NormalizedMarketCropPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCrop, setFilterCrop] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState<OriginFilter>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Modal / Drawer states
  const [selectedListingForDeal, setSelectedListingForDeal] = useState<EnhancedMarketplaceListing | null>(null);
  const [isDealDrawerOpen, setIsDealDrawerOpen] = useState(false);
  const [isEvidenceDrawerOpen, setIsEvidenceDrawerOpen] = useState(false);
  const [evidenceReport, setEvidenceReport] = useState<DecisionEvidenceReport | null>(null);
  const [contactModalListing, setContactModalListing] = useState<EnhancedMarketplaceListing | null>(null);

  // Post form state
  const [formData, setFormData] = useState({
    cropName: '',
    quantity: '',
    pricePerUnit: '',
    location: '',
    farmerName: profile?.displayName ?? '',
    contactPhone: '',
    description: '',
    imageUrl: '',
    imageAttribution: '',
  });
  const [posting, setPosting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    Promise.all([
      getMarketplaceListings(),
      getGovernmentMarketPrices().catch(() => ({ prices: [] })),
    ])
      .then(([listingsData, pricesResponse]) => {
        if (!isMounted) return;
        setListings(listingsData as EnhancedMarketplaceListing[]);
        setMarketPrices(pricesResponse.prices || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Could not load marketplace data.');
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const cropTypes = ['all', ...new Set(listings.map((l) => l.cropName))];

  const filteredListings = listings.filter((listing) => {
    const matchesSearch =
      listing.cropName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
      listing.farmerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCrop =
      filterCrop === 'all' || listing.cropName === filterCrop;

    const origin = listing.listingOrigin || (listing.isPersistent ? 'farmer' : 'demo');
    const matchesOrigin =
      filterOrigin === 'all' || origin === filterOrigin;

    return matchesSearch && matchesCrop && matchesOrigin;
  });

  const handleOpenDealEvaluation = (listing: EnhancedMarketplaceListing) => {
    setSelectedListingForDeal(listing);
    setIsDealDrawerOpen(true);
  };

  const handleOpenEvidenceFromDeal = () => {
    if (!selectedListingForDeal) return;
    const evaluation = evaluateMarketplaceDeal({
      listing: selectedListingForDeal,
      marketPrices,
    });

    const report: DecisionEvidenceReport = {
      actionId: selectedListingForDeal.id,
      actionTitle: `Marketplace Deal Context: ${selectedListingForDeal.cropName}`,
      actionCategory: 'HARVEST_STORAGE',
      generatedAt: new Date().toISOString(),
      confidenceLevel: evaluation.observed?.isOfficial ? 'HIGH' : 'MEDIUM',
      summary: `Market context evaluation for ${selectedListingForDeal.farmerName}'s listing of ${selectedListingForDeal.quantity} ${selectedListingForDeal.cropName} at ${selectedListingForDeal.pricePerUnit}.`,
      evidenceList: [
        {
          id: 'ev-mkt-1',
          category: 'MARKET_DATA',
          title: 'Official AMIS Punjab Mandi Rates',
          sourceName: evaluation.observed?.sourceLabel || 'AMIS Punjab (Directorate of Agriculture)',
          sourceType: 'OFFICIAL_GOVERNMENT',
          observedValue: evaluation.observed
            ? `Modal: Rs ${evaluation.observed.modalPricePer40Kg.toLocaleString()} / 40kg (Range: Rs ${evaluation.observed.minPricePer40Kg} - Rs ${evaluation.observed.maxPricePer40Kg})`
            : 'No live government bulletin available for this commodity',
          interpretation: evaluation.calculated?.calculationExplanation || evaluation.ratingConfig.description,
          reliability: evaluation.observed?.isOfficial ? 'HIGH' : 'LOW',
          lastObservedAt: evaluation.observed?.reportedDate || 'Current Session',
          verifiedBySystem: !!evaluation.observed?.isOfficial,
          isUserObservation: false,
        },
        {
          id: 'ev-econ-2',
          category: 'ECONOMIC_DATA',
          title: 'Gross Market Valuation Reference',
          sourceName: 'Deterministic Economic Reference Engine',
          sourceType: 'LOCAL_COMPUTATION',
          observedValue: evaluation.economicReference
            ? evaluation.economicReference.grossFormatted
            : 'Pending volume parsing',
          interpretation:
            evaluation.economicReference?.formula || 'Quantity × Unit price benchmark',
          reliability: 'MEDIUM',
          lastObservedAt: 'Current Calculation',
          verifiedBySystem: true,
          isUserObservation: false,
        },
      ],
      farmerMemoriesUsed: [],
      uncertainties: evaluation.unknowns,
      limitations: evaluation.limitations,
    };

    setEvidenceReport(report);
    setIsEvidenceDrawerOpen(true);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.cropName ||
      !formData.quantity ||
      !formData.pricePerUnit ||
      !formData.location ||
      !formData.farmerName
    ) {
      return;
    }
    setPosting(true);
    setError(null);
    try {
      const newListing = await postListing({
        cropName: formData.cropName,
        quantity: formData.quantity,
        pricePerUnit: formData.pricePerUnit,
        location: formData.location,
        farmerName: formData.farmerName,
        contactPhone: formData.contactPhone || '+92 300 0000000',
        description: formData.description,
        imageUrl: formData.imageUrl || undefined,
        imageAttribution: formData.imageAttribution || (formData.imageUrl ? 'Farmer Upload' : undefined),
      });

      setListings([newListing as EnhancedMarketplaceListing, ...listings]);
      setPostSuccess(true);
      setFormData({
        cropName: '',
        quantity: '',
        pricePerUnit: '',
        location: '',
        farmerName: profile?.displayName ?? '',
        contactPhone: '',
        description: '',
        imageUrl: '',
        imageAttribution: '',
      });
      setTimeout(() => {
        setPostSuccess(false);
        setView('browse');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post listing. Please try again.');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteListing(id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleContactFarmer = (listing: EnhancedMarketplaceListing) => {
    setContactModalListing(listing);
  };

  return (
    <div>
      <PageHeader
        title="Marketplace"
        subtitle="Buy and sell produce directly — no middlemen, transparent AMIS official market benchmarks, and verified farmer listings."
        icon={<Store className="w-6 h-6" />}
      />

      {/* Toggle + Origin Filter + Ask AI */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex bg-saathi-100/70 p-1 rounded-xl">
            <button
              onClick={() => setView('browse')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                view === 'browse'
                  ? 'bg-white text-saathi-800 shadow-sm'
                  : 'text-saathi-600 hover:text-saathi-900'
              }`}
            >
              <Search className="w-4 h-4" />
              Browse Listings
            </button>
            <button
              onClick={() => setView('post')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                view === 'post'
                  ? 'bg-white text-saathi-800 shadow-sm'
                  : 'text-saathi-600 hover:text-saathi-900'
              }`}
            >
              <Plus className="w-4 h-4" />
              Post a Listing
            </button>
          </div>

          {view === 'browse' && (
            <div className="inline-flex bg-saathi-50 p-1 rounded-xl border border-saathi-100 text-xs">
              <button
                onClick={() => setFilterOrigin('all')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterOrigin === 'all'
                    ? 'bg-white text-saathi-800 shadow-xs'
                    : 'text-saathi-500 hover:text-saathi-800'
                }`}
              >
                All ({listings.length})
              </button>
              <button
                onClick={() => setFilterOrigin('farmer')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1 ${
                  filterOrigin === 'farmer'
                    ? 'bg-white text-emerald-700 font-semibold shadow-xs'
                    : 'text-saathi-500 hover:text-saathi-800'
                }`}
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                Farmer Listings
              </button>
              <button
                onClick={() => setFilterOrigin('demo')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  filterOrigin === 'demo'
                    ? 'bg-white text-amber-800 font-semibold shadow-xs'
                    : 'text-saathi-500 hover:text-saathi-800'
                }`}
              >
                Demo Examples
              </button>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/assistant?tab=marketplace')}
          className="btn-accent flex items-center gap-2"
        >
          <Bot className="w-4 h-4" />
          Ask Saathi AI
        </button>
      </div>

      {/* Browse view */}
      {view === 'browse' && (
        <div className="animate-fade-in space-y-6">
          {/* Search & filter toolbar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-saathi-400" />
              <input
                type="text"
                placeholder="Search by crop, location, or farmer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={filterCrop}
              onChange={(e) => setFilterCrop(e.target.value)}
              className="input-field sm:w-48 text-sm"
            >
              {cropTypes.map((c) => (
                <option key={c} value={c}>
                  {c === 'all' ? 'All Commodities' : c}
                </option>
              ))}
            </select>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl border border-saathi-100 p-8 shadow-xs">
              <Loader2 className="w-10 h-10 text-saathi-600 animate-spin mb-4" />
              <p className="text-saathi-700 font-medium">Loading marketplace listings and live AMIS rates...</p>
            </div>
          )}

          {error && (
            <div className="hero-card text-center py-12 border-red-200 bg-red-50/50">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {!loading && !error && filteredListings.length === 0 && (
            <div className="hero-card text-center py-16">
              <Package className="w-12 h-12 text-saathi-300 mx-auto mb-3" />
              <h4 className="text-base font-bold text-saathi-800 mb-1">No listings found</h4>
              <p className="text-sm text-saathi-500 max-w-md mx-auto">
                No produce matched your search query or filter. Try clearing filters or posting a new listing.
              </p>
            </div>
          )}

          {!loading && !error && filteredListings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredListings.map((listing) => {
                const evaluation = evaluateMarketplaceDeal({
                  listing,
                  marketPrices,
                });
                const isFarmerListing =
                  listing.listingOrigin === 'farmer' || listing.isPersistent === true;

                return (
                  <div
                    key={listing.id}
                    className="hero-card flex flex-col justify-between hover:shadow-md transition-shadow group relative overflow-hidden"
                  >
                    {/* Produce Image Header */}
                    <div className="h-44 -mx-6 -mt-6 mb-4 relative overflow-hidden bg-gradient-to-br from-saathi-100 to-saathi-50">
                      {listing.imageUrl ? (
                        <img
                          src={listing.imageUrl}
                          alt={listing.cropName}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-12 h-12 text-saathi-300" />
                        </div>
                      )}

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                        {isFarmerListing ? (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-white/95 text-emerald-800 shadow-sm border border-emerald-200/80 backdrop-blur-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Farmer Listing
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-amber-500/90 text-white shadow-sm backdrop-blur-xs">
                            Demo Example
                          </span>
                        )}

                        {user && listing.userId === user.id && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-saathi-900 text-white shadow-xs">
                            Your Listing
                          </span>
                        )}
                      </div>

                      {/* Image attribution */}
                      {listing.imageAttribution && (
                        <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded bg-black/50 text-[9px] text-white/90 backdrop-blur-xs">
                          {listing.imageAttribution}
                        </div>
                      )}
                    </div>

                    {/* Listing Body */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-saathi-900 text-lg leading-snug">
                            {listing.cropName}
                          </h3>
                          <span className="text-xs text-saathi-400">
                            {listing.datePosted}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-extrabold text-saathi-900 block">
                            {listing.pricePerUnit}
                          </span>
                          <span className="text-xs text-saathi-500 font-medium">
                            {listing.quantity}
                          </span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="space-y-1.5 my-3 text-xs text-saathi-600">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-saathi-400 shrink-0" />
                          <span className="truncate">{listing.location}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-saathi-400 shrink-0" />
                          <span className="truncate">{listing.farmerName}</span>
                        </div>
                      </div>

                      {/* Deal Intelligence Mini Badge & AMIS Benchmark */}
                      <div className="my-2.5 p-2.5 rounded-xl border border-saathi-100 bg-saathi-50/60 space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2.5 h-2.5 rounded-full ${evaluation.ratingConfig.dotColor}`} />
                            <span className="text-[11px] font-bold text-saathi-800">
                              {evaluation.ratingConfig.label}
                            </span>
                          </div>
                          <button
                            onClick={() => handleOpenDealEvaluation(listing)}
                            className="text-[11px] font-bold text-saathi-700 hover:text-saathi-900 hover:underline flex items-center gap-0.5"
                          >
                            <Scale className="w-3 h-3" />
                            Evaluate Deal
                          </button>
                        </div>

                        {evaluation.observed && (
                          <div className="text-[10px] text-saathi-500 flex items-center justify-between pt-1 border-t border-saathi-100">
                            <span>Official AMIS Reference:</span>
                            <span className="font-semibold text-saathi-700">
                              Rs {evaluation.observed.modalPricePer40Kg.toLocaleString()} / 40kg
                            </span>
                          </div>
                        )}
                      </div>

                      {listing.description && (
                        <p className="text-saathi-500 text-xs line-clamp-2 my-2 italic">
                          &ldquo;{listing.description}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-saathi-100">
                      <button
                        onClick={() => handleContactFarmer(listing)}
                        className="btn-primary flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-1.5"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Contact Farmer
                      </button>

                      <button
                        onClick={() => handleOpenDealEvaluation(listing)}
                        title="View detailed market context & economic reference"
                        className="p-2.5 rounded-xl border border-saathi-200 text-saathi-700 hover:bg-saathi-50 transition-colors"
                        aria-label="Evaluate Deal"
                      >
                        <Scale className="w-4 h-4" />
                      </button>

                      {user && listing.userId === user.id && (
                        <button
                          onClick={() => handleDelete(listing.id)}
                          disabled={deletingId === listing.id}
                          aria-label="Delete listing"
                          title="Delete Listing"
                          className="p-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deletingId === listing.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Post view */}
      {view === 'post' && (
        <div className="animate-fade-in max-w-2xl mx-auto">
          <div className="hero-card">
            {postSuccess ? (
              <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5 border border-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="font-bold text-saathi-900 text-xl mb-2">
                  Produce Listing Posted Successfully!
                </h3>
                <p className="text-saathi-600 text-sm max-w-md">
                  Your listing is permanently saved to your farm account and visible with live AMIS market context to buyers across Pakistan.
                </p>
              </div>
            ) : (
              <form onSubmit={handlePostSubmit} className="space-y-5">
                <div className="border-b border-saathi-100 pb-4">
                  <h3 className="font-bold text-saathi-900 text-lg">
                    Post Your Farm Produce
                  </h3>
                  <p className="text-xs text-saathi-500 mt-0.5">
                    Connect directly with buyers. Saathi provides buyers with live AMIS benchmark rates so deals remain fair and transparent.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-saathi-700 uppercase tracking-wider mb-1.5">
                      Crop / Produce Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wheat (Akbar-19) or Basmati Rice"
                      value={formData.cropName}
                      onChange={(e) =>
                        setFormData({ ...formData, cropName: e.target.value })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-saathi-700 uppercase tracking-wider mb-1.5">
                      Quantity *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 150 maunds (or 50 bags)"
                      value={formData.quantity}
                      onChange={(e) =>
                        setFormData({ ...formData, quantity: e.target.value })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-saathi-700 uppercase tracking-wider mb-1.5">
                      Price per Unit *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rs 4,600 / 40kg"
                      value={formData.pricePerUnit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pricePerUnit: e.target.value,
                        })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-saathi-700 uppercase tracking-wider mb-1.5">
                      Farm Location / Mandi *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Faisalabad, Punjab"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-saathi-700 uppercase tracking-wider mb-1.5">
                      Farmer Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Muhammad Aslam"
                      value={formData.farmerName}
                      onChange={(e) =>
                        setFormData({ ...formData, farmerName: e.target.value })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-saathi-700 uppercase tracking-wider mb-1.5">
                      Contact Phone / WhatsApp
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. +92 300 1234567"
                      value={formData.contactPhone}
                      onChange={(e) =>
                        setFormData({ ...formData, contactPhone: e.target.value })
                      }
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-saathi-700 uppercase tracking-wider mb-1.5">
                    Description & Quality Notes
                  </label>
                  <textarea
                    placeholder="Describe seed variety, moisture level, harvest date, packaging (bags/bulk), or delivery options..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="input-field resize-none text-sm"
                  />
                </div>

                {/* Photo URL or Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-saathi-700 uppercase tracking-wider">
                    Produce Photo URL (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/..."
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    className="input-field text-sm"
                  />
                  <div className="flex flex-wrap gap-2 text-[11px] text-saathi-500">
                    <span className="font-semibold text-saathi-700">Quick crop samples:</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          imageUrl:
                            'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=800&q=80',
                          imageAttribution: 'Wheat Harvest Photography',
                        })
                      }
                      className="underline hover:text-saathi-900"
                    >
                      Wheat
                    </button>
                    •
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          imageUrl:
                            'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=800&q=80',
                          imageAttribution: 'Rice Paddy Photography',
                        })
                      }
                      className="underline hover:text-saathi-900"
                    >
                      Rice
                    </button>
                    •
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          imageUrl:
                            'https://images.unsplash.com/photo-1606041008023-472dfb5e530f?auto=format&fit=crop&w=800&q=80',
                          imageAttribution: 'Cotton Field Photography',
                        })
                      }
                      className="underline hover:text-saathi-900"
                    >
                      Cotton
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={posting}
                  className="btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2"
                >
                  {posting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Saving Listing to Farm Memory...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5" />
                      Publish Farmer Listing
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Contact Farmer Modal */}
      {contactModalListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setContactModalListing(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-saathi-100 pb-3">
              <h3 className="text-base font-bold text-saathi-900">
                Contact {contactModalListing.farmerName}
              </h3>
              <button
                onClick={() => setContactModalListing(null)}
                className="text-saathi-400 hover:text-saathi-700"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-saathi-50 rounded-xl space-y-1 text-xs text-saathi-700">
              <p className="font-bold text-sm text-saathi-900">
                {contactModalListing.cropName}
              </p>
              <p>Quantity: {contactModalListing.quantity}</p>
              <p>Asking Price: {contactModalListing.pricePerUnit}</p>
              <p>Location: {contactModalListing.location}</p>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={`https://wa.me/${(contactModalListing.contactPhone || '+923000000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Assalam-o-Alaikum! I saw your produce listing for ${contactModalListing.cropName} (${contactModalListing.quantity} at ${contactModalListing.pricePerUnit}) on Saathi. Is this available?`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Contact via WhatsApp
              </a>

              <a
                href={`tel:${contactModalListing.contactPhone || '+923000000000'}`}
                className="w-full py-3 px-4 rounded-xl border border-saathi-300 hover:bg-saathi-50 text-saathi-800 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4 text-saathi-600" />
                Direct Phone Call ({contactModalListing.contactPhone || 'Available on request'})
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Deal Intelligence Drawer */}
      <DealIntelligenceDrawer
        listing={selectedListingForDeal}
        marketPrices={marketPrices}
        isOpen={isDealDrawerOpen}
        onClose={() => setIsDealDrawerOpen(false)}
        onOpenEvidence={handleOpenEvidenceFromDeal}
      />

      {/* Decision Evidence Drawer */}
      <DecisionEvidenceDrawer
        report={evidenceReport}
        isOpen={isEvidenceDrawerOpen}
        onClose={() => setIsEvidenceDrawerOpen(false)}
      />
    </div>
  );
}
