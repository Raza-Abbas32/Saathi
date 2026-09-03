import { useState, useEffect } from 'react';
import {
  LineChart,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  ShieldCheck,
  RefreshCw,
  MapPin,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Search,
} from 'lucide-react';
import {
  LineChart as ReLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import PageHeader from '@/components/PageHeader';
import { getCropPrices } from '@/services/api';
import type { NormalizedMarketCropPrice, GovernmentSourceStatus } from '@/types';

const trendConfig = {
  up: { icon: TrendingUp, arrow: ArrowUpRight, color: 'text-saathi-600', bg: 'bg-saathi-50' },
  down: { icon: TrendingDown, arrow: ArrowDownRight, color: 'text-red-500', bg: 'bg-red-50' },
  stable: { icon: Minus, arrow: Minus, color: 'text-saathi-400', bg: 'bg-saathi-50' },
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string } }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="bg-white rounded-xl shadow-hero-lg px-4 py-3 border border-saathi-50">
      <p className="text-xs text-saathi-500 mb-1">{payload[0].payload.date}</p>
      <p className="font-bold text-saathi-900">
        Rs {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export default function MarketPricesPage() {
  const [prices, setPrices] = useState<NormalizedMarketCropPrice[]>([]);
  const [sources, setSources] = useState<GovernmentSourceStatus[]>([]);
  const [isDemoData, setIsDemoData] = useState(false);
  const [isLiveGovernmentData, setIsLiveGovernmentData] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [mandiSearch, setMandiSearch] = useState('');
  const [showSourcesPanel, setShowSourcesPanel] = useState(false);

  const loadData = (force = false) => {
    if (force) setRefreshing(true);
    else setLoading(true);

    getCropPrices(force)
      .then((res) => {
        setPrices(res.prices);
        setIsDemoData(res.isDemoData);
        setIsLiveGovernmentData(res.isLiveGovernmentData);
        if (res.sources) setSources(res.sources);
        if (res.lastSync) setLastSync(res.lastSync);
        setSelectedCrop((prev) => prev ?? res.prices[0]?.crop ?? null);
        setLoading(false);
        setRefreshing(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load market prices. Please try again.');
        setLoading(false);
        setRefreshing(false);
      });
  };

  useEffect(() => {
    loadData(false);
  }, []);

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Market Price Insight"
          subtitle="Track official government mandi rates and trends for major crops across Pakistan."
          icon={<LineChart className="w-6 h-6" />}
        />
        <div className="flex flex-col items-center justify-center h-64">
          <Loader2 className="w-10 h-10 text-saathi-500 animate-spin mb-4" />
          <p className="text-saathi-600">Connecting to Government Market Price Intelligence...</p>
        </div>
      </div>
    );
  }

  if (error || prices.length === 0) {
    return (
      <div>
        <PageHeader
          title="Market Price Insight"
          subtitle="Track official government mandi rates and trends for major crops across Pakistan."
          icon={<LineChart className="w-6 h-6" />}
        />
        <div className="hero-card text-center py-12">
          <p className="text-saathi-600">{error ?? 'No data available.'}</p>
          <button
            onClick={() => loadData(true)}
            className="mt-4 px-4 py-2 bg-saathi-600 text-white rounded-lg hover:bg-saathi-700 text-sm font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const activeCrop = prices.find((p) => p.crop === selectedCrop) ?? prices[0];
  const TrendArrow = trendConfig[activeCrop.trend].arrow;

  // Filter mandis for the active crop
  const filteredMandis = (activeCrop.mandis || []).filter((m) =>
    m.mandi.toLowerCase().includes(mandiSearch.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <PageHeader
          title="Market Price Insight"
          subtitle="Track official government mandi rates and trends for major crops across Pakistan. Make informed selling decisions."
          icon={<LineChart className="w-6 h-6" />}
        />
      </div>

      {/* Official Government Data Banner */}
      {isLiveGovernmentData ? (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-saathi-200 bg-saathi-50/70 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-saathi-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-saathi-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-saathi-900 text-sm">
                  Official Government Mandi Rates
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-saathi-100 text-saathi-800">
                  <CheckCircle2 className="w-3 h-3 text-saathi-600" />
                  Live AMIS Punjab
                </span>
              </div>
              <p className="text-xs text-saathi-600 mt-0.5">
                Wholesale prices sourced from Agriculture Marketing Information Service (AMIS), Directorate of Agriculture, Govt. of Punjab. Standardized to 40 kg Maund (&quot;من&quot;).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-saathi-700 bg-white rounded-lg border border-saathi-200 hover:bg-saathi-50 shadow-sm transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Syncing...' : 'Sync Mandis'}
            </button>
          </div>
        </div>
      ) : isDemoData ? (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-harvest-200 bg-harvest-50 px-4 py-3">
          <DollarSign className="w-5 h-5 text-harvest-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-harvest-900 font-semibold">
              Sample Baseline Data (Government Connection Fallback)
            </p>
            <p className="text-xs text-harvest-800 mt-0.5">
              Live government mandi service is currently unreachable. Displaying illustrative baseline figures. Click &quot;Sync Mandis&quot; to recheck AMIS Punjab connectivity.
            </p>
          </div>
        </div>
      ) : null}

      {/* Price cards grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-8">
        {prices.map((price) => {
          const config = trendConfig[price.trend];
          const Icon = config.icon;
          const isSelected = selectedCrop === price.crop;

          return (
            <button
              key={price.crop}
              onClick={() => {
                setSelectedCrop(price.crop);
                setMandiSearch('');
              }}
              className={`hero-card text-left p-3.5 transition-all ${
                isSelected
                  ? 'ring-2 ring-saathi-500 shadow-hero-hover bg-saathi-50/40'
                  : 'hover:border-saathi-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-saathi-900 text-xs truncate">
                  {price.crop}
                </span>
                <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${config.color}`} />
              </div>
              <p className="text-base sm:text-lg font-bold text-saathi-900">
                Rs {price.currentPrice.toLocaleString()}
              </p>
              <p className="text-[11px] text-saathi-500 mb-1.5">{price.unit}</p>

              <div className="flex items-center justify-between pt-1 border-t border-saathi-100/60">
                <span className={`text-[11px] font-medium ${config.color}`}>
                  {price.trend === 'stable'
                    ? 'Stable'
                    : `${price.trend === 'up' ? '+' : '-'}${price.trendPercent}%`}
                </span>
                {price.mandisCount > 0 ? (
                  <span className="text-[10px] text-saathi-600 bg-saathi-100/80 px-1.5 py-0.5 rounded">
                    {price.mandisCount} mandis
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-500">Benchmark</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail chart card */}
      <div className="hero-card mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-saathi-900 text-xl">
                {activeCrop.crop} — Price Trend & Intelligence
              </h3>
              {activeCrop.isOfficial && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-saathi-100 text-saathi-800">
                  <ShieldCheck className="w-3.5 h-3.5 text-saathi-600" />
                  Official Mandi Rate
                </span>
              )}
            </div>
            <p className="text-saathi-500 text-sm mt-0.5">
              Source: {activeCrop.sourceLabel} · Quoted: {activeCrop.rawUnit || activeCrop.unit} (Converted to 40 kg maund)
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-saathi-400">Modal FQP Rate</p>
              <p className="font-bold text-saathi-900 text-lg">
                Rs {activeCrop.currentPrice.toLocaleString()}
              </p>
              <p className="text-[11px] text-saathi-500">per 40kg (Maund)</p>
            </div>
            <div
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl ${trendConfig[activeCrop.trend].bg} ${trendConfig[activeCrop.trend].color}`}
            >
              <TrendArrow className="w-5 h-5" />
              <span className="font-semibold text-sm">
                {activeCrop.trend === 'stable'
                  ? 'Stable'
                  : `${activeCrop.trend === 'up' ? '+' : '-'}${activeCrop.trendPercent}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Pricing Statistics Pill Strip */}
        {activeCrop.pricePer100Kg && (
          <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-saathi-50/50 p-3 rounded-xl border border-saathi-100">
            <div>
              <p className="text-xs text-saathi-500">Official AMIS Wholesale</p>
              <p className="font-semibold text-saathi-900 text-sm">
                Rs {activeCrop.pricePer100Kg.toLocaleString()} / 100kg
              </p>
            </div>
            <div>
              <p className="text-xs text-saathi-500">Maund Conversion (40kg)</p>
              <p className="font-semibold text-saathi-900 text-sm">
                Rs {activeCrop.currentPrice.toLocaleString()} / maund
              </p>
            </div>
            <div>
              <p className="text-xs text-saathi-500">Reporting Mandis Range</p>
              <p className="font-semibold text-saathi-900 text-sm">
                {activeCrop.minPricePer40Kg && activeCrop.maxPricePer40Kg
                  ? `Rs ${activeCrop.minPricePer40Kg.toLocaleString()} – ${activeCrop.maxPricePer40Kg.toLocaleString()}`
                  : 'Uniform Rate'}
              </p>
            </div>
            <div>
              <p className="text-xs text-saathi-500">Reported Date</p>
              <p className="font-semibold text-saathi-900 text-sm">
                {activeCrop.reportedDate || 'Latest Bulletin'}
              </p>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-72 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ReLineChart data={activeCrop.history} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3F2E3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: '#6B8E6B', fontSize: 12 }}
                axisLine={{ stroke: '#C8E6C8' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#6B8E6B', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `Rs ${v.toLocaleString()}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="price"
                stroke="#16A34A"
                strokeWidth={3}
                dot={{ fill: '#16A34A', r: 4 }}
                activeDot={{ r: 6, fill: '#15803D' }}
              />
            </ReLineChart>
          </ResponsiveContainer>
        </div>

        {/* Sample projected price */}
        <div className="mt-6 p-4 rounded-xl bg-harvest-50/80 border border-harvest-200/60">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center flex-shrink-0 text-harvest-700 shadow-sm">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-saathi-900 text-sm mb-0.5">
                Indicative Projected Benchmark — Next Week
              </h4>
              <p className="text-saathi-700 text-sm">
                Indicative figure:{' '}
                <span className="font-bold text-harvest-800">
                  Rs {activeCrop.predictedPrice.toLocaleString()}
                </span>{' '}
                per 40kg maund
              </p>
              <p className="text-saathi-500 text-xs mt-1">
                Notice: Projections are illustrative benchmarks. Always verify physically with your local market committee or commission agent (&quot;آڑھتی&quot;) before executing trades.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mandi Breakdown Section (if live mandis exist) */}
      {activeCrop.mandis && activeCrop.mandis.length > 0 && (
        <div className="hero-card mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="font-bold text-saathi-900 text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-saathi-600" />
                Punjab Mandi Rates Breakdown ({activeCrop.mandis.length} Mandis Reporting)
              </h3>
              <p className="text-xs text-saathi-500 mt-0.5">
                Direct wholesale mandi auction rates reported to AMIS Punjab for {activeCrop.crop}.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-saathi-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={mandiSearch}
                onChange={(e) => setMandiSearch(e.target.value)}
                placeholder="Search city or mandi..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-saathi-50/50 border border-saathi-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-saathi-500 text-saathi-900 placeholder:text-saathi-400"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-saathi-200 bg-saathi-50/60 text-saathi-700 font-semibold">
                  <th className="py-2.5 px-3">Mandi / Market Committee</th>
                  <th className="py-2.5 px-3">FQP (Modal) / Maund (40kg)</th>
                  <th className="py-2.5 px-3">Min – Max Range / Maund</th>
                  <th className="py-2.5 px-3">Official AMIS (per 100kg)</th>
                  <th className="py-2.5 px-3 text-right">Arrival Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-saathi-100">
                {filteredMandis.length > 0 ? (
                  filteredMandis.map((m, idx) => (
                    <tr key={`${m.mandi}-${idx}`} className="hover:bg-saathi-50/40 transition-colors">
                      <td className="py-2 px-3 font-medium text-saathi-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-saathi-500" />
                        {m.mandi}
                      </td>
                      <td className="py-2 px-3 font-bold text-saathi-900">
                        Rs {m.pricePerMaund.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-saathi-600">
                        Rs {Math.round(m.minPrice * 0.4).toLocaleString()} – Rs {Math.round(m.maxPrice * 0.4).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-saathi-500">
                        Rs {m.fqp.toLocaleString()} / 100kg
                      </td>
                      <td className="py-2 px-3 text-right text-saathi-600">
                        {m.quantity ? `${m.quantity} Bags/Qtl` : 'Reported'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-saathi-500">
                      No mandis matching &quot;{mandiSearch}&quot; found for {activeCrop.crop}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Government Sources & Coverage Transparency Card */}
      <div className="hero-card border border-saathi-100">
        <button
          onClick={() => setShowSourcesPanel(!showSourcesPanel)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2.5">
            <Building2 className="w-5 h-5 text-saathi-600" />
            <div>
              <h4 className="font-semibold text-saathi-900 text-sm">
                Government Sources & Provincial Coverage Status
              </h4>
              <p className="text-xs text-saathi-500 mt-0.5">
                Saathi connects directly to publicly available official agricultural intelligence across Pakistan.
              </p>
            </div>
          </div>
          <div className="text-saathi-500 p-1">
            {showSourcesPanel ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </button>

        {showSourcesPanel && (
          <div className="mt-4 pt-4 border-t border-saathi-100 grid grid-cols-1 md:grid-cols-3 gap-4">
            {sources.map((src) => (
              <div
                key={src.id}
                className="p-3.5 rounded-xl border border-saathi-100 bg-saathi-50/30 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-semibold text-saathi-900 text-xs">{src.name}</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        src.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : src.status === 'BENCHMARK'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {src.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-saathi-600 font-medium mb-1">{src.department}</p>
                  <p className="text-[11px] text-saathi-500">
                    <span className="font-semibold">Coverage:</span> {src.coverage}
                  </p>
                  {src.reason && (
                    <p className="text-[11px] text-saathi-500 mt-1 italic">
                      Note: {src.reason}
                    </p>
                  )}
                </div>
                <div className="mt-3 pt-2 border-t border-saathi-100/60 text-[10px] text-saathi-400">
                  Last Sync: {lastSync ? new Date(lastSync).toLocaleTimeString() : src.lastUpdated}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
