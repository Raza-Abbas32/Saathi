import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sprout,
  Loader2,
  MapPin,
  Droplets,
  Calendar,
  Layers,
  Bot,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { getCropRecommendations, formatCropMarkdown } from '@/services/api';

const soilTypes = ['Loamy', 'Clay', 'Sandy', 'Silty', 'Saline', 'Peaty'];
const provinces = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Kashmir',
];
const seasons = ['Kharif (Summer)', 'Rabi (Winter)', 'Spring', 'Autumn'];
const waterLevels = [
  'Abundant (Canal + Tube well)',
  'Moderate (Tube well only)',
  'Limited (Rainfed)',
  'Scarce (Drought-prone)',
];

export default function CropRecommendationPage() {
  const navigate = useNavigate();
  const [soil, setSoil] = useState('');
  const [region, setRegion] = useState('');
  const [season, setSeason] = useState('');
  const [water, setWater] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!soil || !region || !season || !water) {
      setError('Please fill in all fields to get recommendations.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const recs = await getCropRecommendations(soil, region, season, water);
      const { userText, aiText } = formatCropMarkdown(recs, soil, region, season, water);
      sessionStorage.setItem('saathi-crop-handoff', JSON.stringify({ userText, aiText }));
      navigate('/assistant?tab=crop');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not fetch recommendations. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Crop Advisor"
        subtitle="Tell us about your land and conditions, and our AI will recommend the best crops to plant for maximum yield and profit."
        icon={<Sprout className="w-6 h-6" />}
      />

      <div className="max-w-lg mx-auto">
        <div className="hero-card">
          <h3 className="font-semibold text-saathi-900 text-lg mb-5">
            Your Farm Details
          </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-saathi-700 mb-1.5 flex items-center gap-1.5">
                  <Layers className="w-4 h-4" />
                  Soil Type
                </label>
                <select
                  value={soil}
                  onChange={(e) => setSoil(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select soil type</option>
                  {soilTypes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-saathi-700 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Province / Region
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select province</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-saathi-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  Season
                </label>
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select season</option>
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-saathi-700 mb-1.5 flex items-center gap-1.5">
                  <Droplets className="w-4 h-4" />
                  Water Availability
                </label>
                <select
                  value={water}
                  onChange={(e) => setWater(e.target.value)}
                  className="input-field"
                >
                  <option value="">Select water availability</option>
                  {waterLevels.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <p className="text-red-600 text-sm flex items-center gap-1.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-accent w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing… Redirecting to Saathi AI
                  </>
                ) : (
                  <>
                    <Sprout className="w-5 h-5" />
                    Get Recommendations
                  </>
                )}
              </button>
            </form>

            {/* Info hint */}
            {!loading && (
              <div className="mt-4 flex items-start gap-2 p-4 rounded-xl bg-saathi-50 text-saathi-600 text-sm">
                <Bot className="w-5 h-5 flex-shrink-0 mt-0.5 text-saathi-400" />
                Results will open in <strong className="text-saathi-700 mx-1">Saathi AI</strong> where you can ask follow-up questions.
              </div>
            )}
        </div>
      </div>
    </div>
  );
}
