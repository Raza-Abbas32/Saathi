import { useState, useEffect } from 'react';
import {
  Tractor,
  Sprout,
  Layers,
  MapPin,
  Check,
  Save,
  ShieldCheck,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { FarmContext, SoilType, WaterSource, CropStage } from '@/types/farm';
import { useFarmContext } from '@/hooks/useFarmContext';
import { loadPersistedLocation, DEFAULT_LOCATION } from '@/services/weather';

const PROVINCES = [
  'Punjab',
  'Sindh',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Gilgit-Baltistan',
  'Azad Jammu & Kashmir',
  'Islamabad Capital Territory',
];

const SOIL_TYPES: SoilType[] = ['Sandy', 'Loamy', 'Clay', 'Silt', 'Unknown'];

const WATER_SOURCES: WaterSource[] = ['Canal', 'Tube well', 'Rainfed', 'Mixed', 'Other'];

const CROP_STAGES: CropStage[] = [
  'Land preparation',
  'Sowing',
  'Germination',
  'Vegetative growth',
  'Flowering',
  'Fruiting / grain filling',
  'Maturity',
  'Harvest',
];

const COMMON_CROPS = [
  'Wheat (گندم)',
  'Cotton (کپاس)',
  'Rice (چاول)',
  'Sugarcane (کماد)',
  'Maize / Corn (مکئی)',
  'Potato (آلو)',
  'Tomato (ٹماٹر)',
  'Citrus / Kinnow (کنو)',
  'Mango (آم)',
  'Mustard / Sarson (سرسوں)',
];

const IRRIGATION_METHODS = [
  'Flood / Border',
  'Furrow',
  'Drip irrigation',
  'Sprinkler',
  'Basin / Bed',
  'Other',
];

interface FarmProfileFormProps {
  onSaved?: () => void;
  showCardWrapper?: boolean;
}

export default function FarmProfileForm({ onSaved, showCardWrapper = true }: FarmProfileFormProps) {
  const { farmContext, saveFarm, clearFarm } = useFarmContext();

  // Local form state initialized from persistent farmContext
  const [farmName, setFarmName] = useState(farmContext?.farmName ?? '');
  const [farmSizeAcres, setFarmSizeAcres] = useState<string>(
    farmContext?.farmSizeAcres != null ? farmContext.farmSizeAcres.toString() : ''
  );
  const [province, setProvince] = useState(farmContext?.province ?? 'Punjab');
  const [district, setDistrict] = useState(farmContext?.district ?? '');
  const [tehsil, setTehsil] = useState(farmContext?.tehsil ?? '');
  const [latitude, setLatitude] = useState<number>(farmContext?.latitude ?? DEFAULT_LOCATION.latitude);
  const [longitude, setLongitude] = useState<number>(farmContext?.longitude ?? DEFAULT_LOCATION.longitude);
  const [locationName, setLocationName] = useState<string>('');

  const [soilType, setSoilType] = useState<SoilType>(farmContext?.soilType ?? 'Unknown');
  const [waterSource, setWaterSource] = useState<WaterSource>(farmContext?.waterSource ?? 'Canal');
  const [irrigationMethod, setIrrigationMethod] = useState(farmContext?.irrigationMethod ?? '');

  const [currentCrop, setCurrentCrop] = useState(farmContext?.currentCrop ?? '');
  const [cropVariety, setCropVariety] = useState(farmContext?.cropVariety ?? '');
  const [sowingDate, setSowingDate] = useState(farmContext?.sowingDate ?? '');
  const [cropStage, setCropStage] = useState<CropStage | ''>(farmContext?.cropStage ?? '');

  const [message, setMessage] = useState<{ type: 'success' | 'info'; text: string } | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sync state if farmContext changes externally
  useEffect(() => {
    if (farmContext) {
      setFarmName(farmContext.farmName ?? '');
      setFarmSizeAcres(farmContext.farmSizeAcres != null ? farmContext.farmSizeAcres.toString() : '');
      setProvince(farmContext.province ?? 'Punjab');
      setDistrict(farmContext.district ?? '');
      setTehsil(farmContext.tehsil ?? '');
      if (farmContext.latitude != null) setLatitude(farmContext.latitude);
      if (farmContext.longitude != null) setLongitude(farmContext.longitude);
      if (farmContext.soilType) setSoilType(farmContext.soilType);
      if (farmContext.waterSource) setWaterSource(farmContext.waterSource);
      setIrrigationMethod(farmContext.irrigationMethod ?? '');
      setCurrentCrop(farmContext.currentCrop ?? '');
      setCropVariety(farmContext.cropVariety ?? '');
      setSowingDate(farmContext.sowingDate ?? '');
      setCropStage(farmContext.cropStage ?? '');
    }
  }, [farmContext]);

  // Read current active weather location for display and sync
  useEffect(() => {
    const loc = loadPersistedLocation() ?? DEFAULT_LOCATION;
    setLocationName(loc.name);
    // If farm doesn't have custom coordinates yet, default to weather location
    if (!farmContext?.latitude || !farmContext?.longitude) {
      setLatitude(loc.latitude);
      setLongitude(loc.longitude);
      if (!district) {
        setDistrict(loc.name);
      }
    }
  }, [farmContext, district]);

  const handleSyncWeatherLocation = () => {
    const loc = loadPersistedLocation() ?? DEFAULT_LOCATION;
    setLatitude(loc.latitude);
    setLongitude(loc.longitude);
    setLocationName(loc.name);
    if (!district || district === DEFAULT_LOCATION.name) {
      setDistrict(loc.name);
    }
    setMessage({
      type: 'info',
      text: `Updated coordinates to Weather location: ${loc.name} (${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)})`,
    });
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const parsedSize = farmSizeAcres ? parseFloat(farmSizeAcres) : undefined;

    const payload: FarmContext = {
      farmName: farmName.trim() || undefined,
      farmSizeAcres: parsedSize && !isNaN(parsedSize) ? parsedSize : undefined,
      province: province.trim() || undefined,
      district: district.trim() || undefined,
      tehsil: tehsil.trim() || undefined,
      latitude,
      longitude,
      soilType: soilType || undefined,
      waterSource: waterSource || undefined,
      irrigationMethod: irrigationMethod.trim() || undefined,
      currentCrop: currentCrop.trim() || undefined,
      cropVariety: cropVariety.trim() || undefined,
      sowingDate: sowingDate || undefined,
      cropStage: cropStage ? (cropStage as CropStage) : undefined,
    };

    saveFarm(payload);

    setMessage({
      type: 'success',
      text: 'Farm profile saved successfully to your device!',
    });
    setTimeout(() => setMessage(null), 4000);

    if (onSaved) {
      onSaved();
    }
  };

  const handleClear = () => {
    clearFarm();
    setFarmName('');
    setFarmSizeAcres('');
    setTehsil('');
    setCurrentCrop('');
    setCropVariety('');
    setSowingDate('');
    setCropStage('');
    setIrrigationMethod('');
    setSoilType('Unknown');
    setWaterSource('Canal');
    setShowClearConfirm(false);
    setMessage({
      type: 'info',
      text: 'Farm profile removed safely from device storage.',
    });
    setTimeout(() => setMessage(null), 4000);
  };

  const content = (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Header and status banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-saathi-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-saathi-50 flex items-center justify-center text-saathi-600">
            <Tractor className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-saathi-900 flex items-center gap-2">
              Farm Context / Farm Memory
            </h3>
            <p className="text-xs text-saathi-500">
              Personalized field information for future agricultural recommendations
            </p>
          </div>
        </div>

        {/* Local Privacy Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-saathi-50/90 border border-saathi-100 text-xs font-medium text-saathi-700 self-start sm:self-auto">
          <ShieldCheck className="w-3.5 h-3.5 text-saathi-600" />
          <span>Local Only • Device Memory</span>
        </div>
      </div>

      {/* Notification banner */}
      {message && (
        <div
          className={`p-3 rounded-xl text-sm flex items-center gap-2 animate-fade-in animate-text-success ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-saathi-50 text-saathi-800 border border-saathi-200'
          }`}
        >
          <Check className="w-4 h-4 flex-shrink-0" />
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Section 1: Basic Farm Details ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-saathi-500" />
          <h4 className="text-sm font-bold text-saathi-900 uppercase tracking-wider">
            1. Basic Farm Information
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Farm Name (Optional)
            </label>
            <input
              type="text"
              value={farmName}
              onChange={(e) => setFarmName(e.target.value)}
              placeholder="e.g. Green Acres Farm, ڈیرہ فارم"
              className="input-field text-sm"
              maxLength={60}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Total Farm Size (Acres)
            </label>
            <input
              type="number"
              step="0.5"
              min="0"
              value={farmSizeAcres}
              onChange={(e) => setFarmSizeAcres(e.target.value)}
              placeholder="e.g. 5, 12.5"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Province
            </label>
            <select
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              className="input-field text-sm"
            >
              {PROVINCES.map((prov) => (
                <option key={prov} value={prov}>
                  {prov}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              District
            </label>
            <input
              type="text"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              placeholder="e.g. Faisalabad, Multan, Sukkur"
              className="input-field text-sm"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Tehsil / Sub-district (Optional)
            </label>
            <input
              type="text"
              value={tehsil}
              onChange={(e) => setTehsil(e.target.value)}
              placeholder="e.g. Sammundri, Jaranwala, Shujabad"
              className="input-field text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── Section 2: Shared Weather Location ── */}
      <div className="p-4 rounded-xl bg-saathi-50/70 border border-saathi-100 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-saathi-800">Coordinates (Shared with Weather)</span>
              <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-saathi-200 text-saathi-600">
                Lat: {latitude.toFixed(4)}, Lon: {longitude.toFixed(4)}
              </span>
            </div>
            <p className="text-[11px] text-saathi-500 mt-0.5">
              Reuses GPS or manually selected city from Saathi Weather ({locationName || 'Faisalabad'}).
            </p>
          </div>

          <button
            type="button"
            onClick={handleSyncWeatherLocation}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-saathi-700 bg-white hover:bg-saathi-100 border border-saathi-200 px-3 py-1.5 rounded-lg transition-colors self-start sm:self-auto"
            title="Update coordinates from the currently active weather location"
          >
            <RefreshCw className="w-3.5 h-3.5 text-saathi-600" />
            Sync from Weather
          </button>
        </div>
      </div>

      {/* ── Section 3: Soil & Water ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-saathi-500" />
          <h4 className="text-sm font-bold text-saathi-900 uppercase tracking-wider">
            2. Soil & Water Resources
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Soil Type
            </label>
            <select
              value={soilType}
              onChange={(e) => setSoilType(e.target.value as SoilType)}
              className="input-field text-sm"
            >
              {SOIL_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Primary Water Source
            </label>
            <select
              value={waterSource}
              onChange={(e) => setWaterSource(e.target.value as WaterSource)}
              className="input-field text-sm"
            >
              {WATER_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Irrigation Method (Optional)
            </label>
            <select
              value={irrigationMethod}
              onChange={(e) => setIrrigationMethod(e.target.value)}
              className="input-field text-sm"
            >
              <option value="">Select or leave blank</option>
              {IRRIGATION_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Section 4: Current Crop & Stage ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sprout className="w-4 h-4 text-saathi-500" />
          <h4 className="text-sm font-bold text-saathi-900 uppercase tracking-wider">
            3. Current Crop & Crop Stage
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Current Crop
            </label>
            <input
              type="text"
              list="common-crops"
              value={currentCrop}
              onChange={(e) => setCurrentCrop(e.target.value)}
              placeholder="e.g. Wheat, Cotton, Rice, Corn"
              className="input-field text-sm"
            />
            <datalist id="common-crops">
              {COMMON_CROPS.map((crop) => (
                <option key={crop} value={crop} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Variety / Hybrid (Optional)
            </label>
            <input
              type="text"
              value={cropVariety}
              onChange={(e) => setCropVariety(e.target.value)}
              placeholder="e.g. Dilkash-20, Akbar-19, Super Basmati"
              className="input-field text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Sowing Date (Optional)
            </label>
            <div className="relative">
              <input
                type="date"
                value={sowingDate}
                onChange={(e) => setSowingDate(e.target.value)}
                className="input-field text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-saathi-700 mb-1.5">
              Crop Stage
            </label>
            <select
              value={cropStage}
              onChange={(e) => setCropStage(e.target.value as CropStage)}
              className="input-field text-sm"
            >
              <option value="">Select current stage</option>
              {CROP_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="pt-4 border-t border-saathi-100 flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          className="btn-primary flex-1 sm:flex-initial text-sm"
        >
          <Save className="w-4 h-4" />
          Save Farm Profile
        </button>

        <div className="flex items-center gap-2">
          {farmContext && (
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Farm Data
            </button>
          )}
        </div>
      </div>

      {/* Clear confirmation prompt */}
      {showClearConfirm && (
        <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 animate-fade-in space-y-3">
          <p className="text-xs font-medium text-red-800">
            Are you sure you want to clear your local Farm Context? This will remove your farm size,
            soil, crop, and location preferences from this browser.
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold"
            >
              Yes, Clear
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(false)}
              className="px-3 py-1.5 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </form>
  );

  if (!showCardWrapper) {
    return content;
  }

  return <div className="hero-card">{content}</div>;
}
