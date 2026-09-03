import {
  mockCropPrices,
} from '@/data/mockData';
import { supabase } from '@/lib/supabase';
import { getGovernmentMarketPrices } from './marketPriceService';
import type {
  DiseaseResult,
  Severity,
  CropRecommendation,
  NormalizedMarketCropPrice,
  GovernmentSourceStatus,
  MarketplaceListing,
  ChatMessage,
} from '@/types';

const VALID_SEVERITIES: Severity[] = ['none', 'low', 'moderate', 'high', 'severe'];

export async function detectDisease(
  imageBase64: string,
  mimeType: string
): Promise<DiseaseResult> {
  const response = await fetch('/api/disease-detection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageBase64, mimeType }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Could not reach the disease detection service.');
  }

  const data = await response.json();
  const r = data?.result;
  if (!r) {
    throw new Error('The analysis service did not return a result.');
  }

  const confidence =
    typeof r.confidence === 'number' ? r.confidence : Number(r.confidence) || 0;
  const rawSev = typeof r.severity === 'string' ? r.severity.toLowerCase() : 'none';
  const severity: Severity = VALID_SEVERITIES.includes(rawSev as Severity) ? (rawSev as Severity) : 'none';

  return {
    diseaseName: r.disease_name ?? r.diseaseName ?? 'Unknown Condition',
    confidence,
    severity,
    cropType: r.crop_identified ?? r.cropType ?? 'Unknown crop',
    description: r.description || '',
    symptoms: Array.isArray(r.symptoms) ? r.symptoms : [],
    treatment: Array.isArray(r.treatment) ? r.treatment : [],
    prevention: Array.isArray(r.prevention) ? r.prevention : [],
  };
}

interface ApiCropRecommendation {
  crop_name?: string;
  name?: string;
  expected_yield?: string;
  expectedYield?: string;
  growth_duration?: string;
  growthDuration?: string;
  water_requirement?: string;
  waterRequirement?: string;
  reason?: string;
  profitability?: string;
}

import {
  getStoredFarmerListings,
  saveStoredFarmerListing,
  removeStoredFarmerListing,
  filterExpiredDemoListings,
  INITIAL_DEMO_SEED_LISTINGS,
} from './dealIntelligence';

const DELETED_DEMO_KEY = 'saathi_deleted_demo_ids';

function getDeletedDemoIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_DEMO_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDeletedDemoId(id: string): void {
  try {
    const set = getDeletedDemoIds();
    set.add(id);
    localStorage.setItem(DELETED_DEMO_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn('[Marketplace] Could not save deleted demo id:', err);
  }
}

interface ApiListing {
  id: string;
  user_id: string;
  crop_name: string;
  quantity: string;
  price_per_unit: string;
  location: string;
  farmer_name: string;
  description?: string;
  created_at: string;
  listing_origin?: 'farmer' | 'demo';
  is_persistent?: boolean;
  expires_at?: string;
  image_url?: string;
  image_attribution?: string;
  source_type?: string;
  source_url?: string;
  contact_phone?: string;
}

interface ApiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  image_url?: string;
  created_at: string;
}

/** Format a DiseaseResult into an elegant, highly readable Markdown report. */
export function formatDiseaseMarkdown(r: DiseaseResult): string {
  const severityTag =
    r.severity === 'severe'
      ? '🔴 **Severe Danger** (Immediate action needed)'
      : r.severity === 'high'
      ? '🟠 **High Severity**'
      : r.severity === 'moderate'
      ? '🟡 **Moderate Condition**'
      : r.severity === 'low'
      ? '🟢 **Low Risk**'
      : '✅ **Healthy Leaf**';

  const lines: string[] = [
    `### 🔬 Diagnosis: ${r.diseaseName}`,
    '',
    `> **Identified Crop:** ${r.cropType} · **Confidence:** ${r.confidence}% · ${severityTag}`,
    '',
  ];

  if (r.description) {
    lines.push('#### 📋 Visual Symptoms & Observation', '', r.description, '');
  }

  if (r.treatment && r.treatment.length > 0) {
    lines.push('#### 💊 Recommended Practical Treatment', '');
    r.treatment.forEach((step, idx) => {
      lines.push(`${idx + 1}. ${step}`);
    });
    lines.push('');
  }

  if (r.prevention && r.prevention.length > 0) {
    lines.push('#### 🛡️ Long-term Farm Prevention', '');
    r.prevention.forEach((tip) => {
      lines.push(`- ${tip}`);
    });
    lines.push('');
  }

  lines.push('---', '');
  lines.push('> 💡 **Follow-up Tip:** You can ask Saathi AI follow-up questions about spray timing, water management, or local pesticide brands below.');

  return lines.join('\n');
}

/** Format a CropRecommendation[] into a structured Markdown summary. */
export function formatCropMarkdown(
  recs: CropRecommendation[],
  soil: string,
  region: string,
  season: string,
  water: string
): { userText: string; aiText: string } {
  const userText = `🌾 **Farm Details Submitted:**\n\n• **Soil Type:** ${soil}\n• **Region:** ${region}\n• **Season:** ${season}\n• **Water Availability:** ${water}`;

  const lines: string[] = [
    `### 🌾 Optimal Crop Recommendations for ${region}`,
    '',
    `> **Field Profile:** ${soil} soil · ${season} · ${water}`,
    '',
  ];

  recs.forEach((crop, idx) => {
    const profitTag =
      crop.profitability === 'high'
        ? '🌟 **High Profit**'
        : crop.profitability === 'medium'
        ? '✨ **Medium Profit**'
        : '🔹 **Moderate Yield**';

    lines.push(`#### ${idx + 1}. ${crop.name} — ${profitTag}`, '');
    lines.push(crop.reason, '');
    lines.push('| Key Metric | Specification |');
    lines.push('| :--- | :--- |');
    lines.push(`| 📈 **Expected Yield** | ${crop.expectedYield} |`);
    lines.push(`| ⏱️ **Duration** | ${crop.growthDuration} |`);
    lines.push(`| 💧 **Water Need** | ${crop.waterRequirement} |`);
    lines.push('');
  });

  lines.push('---', '');
  lines.push('> 💡 **Tip:** Ask Saathi AI for sowing calendar dates, recommended seed varieties, or fertilizer schedules for these crops.');

  return { userText, aiText: lines.join('\n') };
}

const VALID_PROFITABILITY = ['high', 'medium', 'low'];

export async function getCropRecommendations(
  soil: string,
  region: string,
  season: string,
  water: string
): Promise<CropRecommendation[]> {
  const response = await fetch('/api/crop-recommendation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ soil, region, season, water }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Could not reach the crop recommendation service.');
  }

  const data = await response.json();
  const list = data?.result;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error('The recommendation service did not return any results.');
  }

  return (list as ApiCropRecommendation[]).map((r) => ({
    name: r.crop_name ?? r.name ?? 'Unknown crop',
    expectedYield: r.expected_yield ?? r.expectedYield ?? 'Not available',
    growthDuration: r.growth_duration ?? r.growthDuration ?? 'Not available',
    waterRequirement: r.water_requirement ?? r.waterRequirement ?? 'Not available',
    reason: r.reason ?? '',
    profitability: VALID_PROFITABILITY.includes(r.profitability || '') ? (r.profitability as 'high' | 'medium' | 'low') : 'medium',
  }));
}

/**
 * Market prices — Official Government Market Price Data Layer.
 *
 * Primary source: AMIS Punjab (Agriculture Marketing Information Service).
 * When government data is active, isDemoData is false and isOfficial is true.
 * If government services are unreachable or offline, falls back gracefully
 * to illustrative sample data with isDemoData set to true.
 */
export async function getCropPrices(forceRefresh = false): Promise<{
  prices: NormalizedMarketCropPrice[];
  isDemoData: boolean;
  isLiveGovernmentData: boolean;
  sources?: GovernmentSourceStatus[];
  lastSync?: string;
}> {
  try {
    const data = await getGovernmentMarketPrices(forceRefresh);
    return {
      prices: data.prices,
      isDemoData: !data.isLiveGovernmentData,
      isLiveGovernmentData: data.isLiveGovernmentData,
      sources: data.sources,
      lastSync: data.lastSync,
    };
  } catch (err) {
    console.warn('[getCropPrices] Failed to fetch government prices, using fallback:', err);
    return {
      prices: mockCropPrices.map((p) => ({
        ...p,
        source: 'DEMO_MOCK',
        sourceLabel: 'Illustrative Baseline (Sample Data)',
        isOfficial: false,
        reportedDate: new Date().toLocaleDateString('en-GB'),
        rawUnit: p.unit,
        pricePer100Kg: Math.round(p.currentPrice / 0.40),
        minPricePer40Kg: p.currentPrice,
        maxPricePer40Kg: p.currentPrice,
        mandisCount: 0,
        mandis: [],
        status: 'UNAVAILABLE',
      })),
      isDemoData: true,
      isLiveGovernmentData: false,
    };
  }
}

function formatRelativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(isoDate).toLocaleDateString();
}

export async function getMarketplaceListings(): Promise<MarketplaceListing[]> {
  const localFarmerListings = getStoredFarmerListings();
  let serverListings: MarketplaceListing[] = [];

  // First attempt backend API
  try {
    const res = await fetch('/api/marketplace/listings', {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          serverListings = (data as ApiListing[]).map((row) => ({
            id: row.id,
            userId: row.user_id,
            cropName: row.crop_name,
            quantity: row.quantity,
            pricePerUnit: row.price_per_unit,
            location: row.location,
            farmerName: row.farmer_name,
            description: row.description ?? '',
            datePosted: formatRelativeTime(row.created_at),
            listingOrigin: row.listing_origin || (row.is_persistent ? 'farmer' : 'demo'),
            isPersistent: row.is_persistent ?? (row.listing_origin === 'farmer'),
            expiresAt: row.expires_at,
            imageUrl: row.image_url,
            imageAttribution: row.image_attribution,
            sourceType: row.source_type,
            sourceUrl: row.source_url,
            contactPhone: row.contact_phone,
          }));
        }
      }
    }
  } catch (err) {
    console.warn('Marketplace listings API fetch failed, trying Supabase:', err);
  }

  // Fallback to Supabase if configured and no server listings
  if (serverListings.length === 0) {
    try {
      const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        serverListings = (data ?? []).map((row) => ({
          id: row.id,
          userId: row.user_id,
          cropName: row.crop_name,
          quantity: row.quantity,
          pricePerUnit: row.price_per_unit,
          location: row.location,
          farmerName: row.farmer_name,
          description: row.description ?? '',
          datePosted: formatRelativeTime(row.created_at),
          listingOrigin: (row.listing_origin as 'farmer' | 'demo') || 'farmer',
          isPersistent: true,
          imageUrl: row.image_url,
          imageAttribution: row.image_attribution,
          contactPhone: row.contact_phone,
        }));
      }
    } catch (sbErr) {
      console.warn('Supabase query error:', sbErr);
    }
  }

  // Merge: Local farmer listings (highest priority) + Server listings
  const combined: MarketplaceListing[] = [];
  const seenIds = new Set<string>();

  // Add local persistent farmer listings first
  for (const f of localFarmerListings) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      combined.push({
        ...f,
        listingOrigin: 'farmer',
        isPersistent: true,
        expiresAt: null,
      });
    }
  }

  // Add server listings
  for (const s of serverListings) {
    if (!seenIds.has(s.id)) {
      seenIds.add(s.id);
      combined.push(s);
    }
  }

  // Ensure default demo seed listings are always available (e.g. on static hosts like Vercel or when offline)
  const hasDemoListing = combined.some((item) => item.listingOrigin === 'demo');
  if (!hasDemoListing) {
    const deletedDemoIds = getDeletedDemoIds();
    for (const demoItem of INITIAL_DEMO_SEED_LISTINGS) {
      if (!seenIds.has(demoItem.id) && !deletedDemoIds.has(demoItem.id)) {
        seenIds.add(demoItem.id);
        combined.push(demoItem);
      }
    }
  }

  // Filter out any expired demo listings (farmer listings NEVER expire)
  return filterExpiredDemoListings(combined);
}

export async function postListing(
  listing: Omit<MarketplaceListing, 'id' | 'userId' | 'datePosted'>
): Promise<MarketplaceListing> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Try backend API first
  try {
    const res = await fetch('/api/marketplace/listings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cropName: listing.cropName,
        quantity: listing.quantity,
        pricePerUnit: listing.pricePerUnit,
        location: listing.location,
        farmerName: listing.farmerName,
        description: listing.description || '',
        userId: user?.id || 'demo-user',
        imageUrl: listing.imageUrl,
        imageAttribution: listing.imageAttribution || 'Farmer Upload',
        contactPhone: listing.contactPhone || '+92 300 0000000',
        sourceType: 'Direct Farmer Listing',
        sourceUrl: listing.sourceUrl,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const createdListing: MarketplaceListing = {
        id: data.id,
        userId: data.user_id,
        cropName: data.crop_name,
        quantity: data.quantity,
        pricePerUnit: data.price_per_unit,
        location: data.location,
        farmerName: data.farmer_name,
        description: data.description ?? '',
        datePosted: formatRelativeTime(data.created_at),
        listingOrigin: 'farmer',
        isPersistent: true,
        expiresAt: null,
        imageUrl: data.image_url || listing.imageUrl,
        imageAttribution: data.image_attribution || 'Farmer Upload',
        contactPhone: data.contact_phone || listing.contactPhone,
        sourceType: 'Direct Farmer Listing',
      };

      // 🔒 Persist to localStorage so farmer data survives indefinitely
      saveStoredFarmerListing(createdListing);
      return createdListing;
    }
  } catch (err) {
    console.warn('API postListing failed, attempting fallback storage:', err);
  }

  // Generate safe client-side fallback listing
  const fallbackListing: MarketplaceListing = {
    id: `lst-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    userId: user?.id || 'local-farmer',
    cropName: listing.cropName,
    quantity: listing.quantity,
    pricePerUnit: listing.pricePerUnit,
    location: listing.location,
    farmerName: listing.farmerName,
    description: listing.description ?? '',
    datePosted: 'Just now',
    listingOrigin: 'farmer',
    isPersistent: true,
    expiresAt: null,
    imageUrl: listing.imageUrl,
    imageAttribution: 'Farmer Upload',
    contactPhone: listing.contactPhone || '+92 300 0000000',
    sourceType: 'Direct Farmer Listing',
  };

  // Try Supabase if user is logged in
  if (user) {
    try {
      await supabase
        .from('marketplace_listings')
        .insert({
          user_id: user.id,
          crop_name: listing.cropName,
          quantity: listing.quantity,
          price_per_unit: listing.pricePerUnit,
          location: listing.location,
          farmer_name: listing.farmerName,
          description: listing.description || null,
        });
    } catch (e) {
      console.warn('Supabase postListing fallback error:', e);
    }
  }

  // 🔒 Persist to localStorage
  saveStoredFarmerListing(fallbackListing);
  return fallbackListing;
}

export async function deleteListing(id: string): Promise<void> {
  // Remove from local storage and record deleted demo ID
  removeStoredFarmerListing(id);
  saveDeletedDemoId(id);

  try {
    await fetch(`/api/marketplace/listings/${encodeURIComponent(id)}`, { method: 'DELETE' });
  } catch (e) {
    console.warn('API deleteListing error:', e);
  }

  try {
    await supabase.from('marketplace_listings').delete().eq('id', id);
  } catch (e) {
    console.warn('Supabase deleteListing error:', e);
  }
}

// ── Chat thread types ─────────────────────────────────────────────────────

export type ChatFeature = 'general' | 'disease' | 'crop' | 'marketplace';

// ── Chat history ──────────────────────────────────────────────────────────

/**
 * Load chat history for a specific thread feature, ordered oldest-first.
 * Maintains strictly isolated history per feature (general, disease, crop, marketplace).
 */
export async function getChatHistory(feature: ChatFeature = 'general'): Promise<ChatMessage[]> {
  // 1. Try server endpoint first
  try {
    const res = await fetch(`/api/chat-history?feature=${encodeURIComponent(feature)}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return (data as ApiChatMessage[]).map((row) => ({
            id: row.id,
            sender: row.sender,
            text: row.text,
            imageUrl: row.imageUrl ?? row.image_url,
            timestamp: new Date(row.created_at).getTime(),
            feature,
          }));
        }
      }
    }
  } catch (e) {
    console.warn('Chat history API fetch error:', e);
  }

  // 2. Try Supabase if user is logged in
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data, error } = await supabase
        .from('chat_history')
        .select('id, sender, text, created_at')
        .eq('user_id', user.id)
        .eq('feature', feature)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        return data.map((row) => ({
          id: row.id,
          sender: row.sender as 'user' | 'ai',
          text: row.text,
          timestamp: new Date(row.created_at).getTime(),
          feature,
        }));
      }
    }
  } catch (e) {
    console.warn('Supabase getChatHistory error:', e);
  }

  // 3. Fallback to LocalStorage thread-isolated backup
  try {
    const key = `saathi-history-${feature}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('LocalStorage load error:', e);
  }

  return [];
}

/**
 * Persist a single message to chat_history for the given thread, including optional imageUrl.
 */
export async function saveChatMessage(
  feature: ChatFeature,
  sender: 'user' | 'ai',
  text: string,
  imageUrl?: string
): Promise<void> {
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sender,
    text,
    imageUrl,
    timestamp: Date.now(),
    feature,
  };

  // 1. Thread-isolated local storage backup
  try {
    const key = `saathi-history-${feature}`;
    const raw = localStorage.getItem(key);
    const existing: ChatMessage[] = raw ? JSON.parse(raw) : [];
    existing.push(newMsg);
    // Keep last 100 messages per thread
    localStorage.setItem(key, JSON.stringify(existing.slice(-100)));
  } catch (e) {
    console.warn('LocalStorage save error:', e);
  }

  // 2. Server persistence
  try {
    await fetch('/api/chat-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, sender, text, imageUrl }),
    });
  } catch (e) {
    console.warn('Failed to save to /api/chat-history:', e);
  }

  // 3. Supabase persistence
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('chat_history').insert({
        user_id: user.id,
        feature,
        sender,
        text,
      });
    }
  } catch (err) {
    console.warn('Optional Supabase chat save skipped:', err);
  }
}

/**
 * Clear chat history for a specific thread.
 */
export async function clearChatHistory(feature: ChatFeature): Promise<void> {
  // Clear local storage
  try {
    localStorage.removeItem(`saathi-history-${feature}`);
  } catch (err) {
    console.warn('LocalStorage clear error:', err);
  }

  // Clear server
  try {
    await fetch(`/api/chat-history?feature=${encodeURIComponent(feature)}`, {
      method: 'DELETE',
    });
  } catch (e) {
    console.warn('Clear history API error:', e);
  }

  // Clear Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from('chat_history')
        .delete()
        .eq('user_id', user.id)
        .eq('feature', feature);
    }
  } catch (err) {
    console.warn('Optional Supabase clear skipped:', err);
  }
}

// ── Send message (routed per feature) ────────────────────────────────────

/**
 * Preambles injected as the first user turn for specialist threads.
 */
const THREAD_PREAMBLE: Partial<Record<ChatFeature, string>> = {
  disease: '[Context: You are assisting a Pakistani farmer with crop disease diagnosis and treatment. The conversation may include follow-up questions about a prior disease analysis result.]',
  crop: '[Context: You are assisting a Pakistani farmer with crop selection and planning recommendations based on their farm conditions.]',
};

export async function sendChatMessage(
  message: string,
  history: ChatMessage[] = [],
  feature: ChatFeature = 'general',
  imageUrl?: string
): Promise<string> {
  const preamble = THREAD_PREAMBLE[feature];

  const conversation = [
    ...(preamble
      ? [{ role: 'user' as const, content: preamble }, { role: 'assistant' as const, content: 'Understood. I am ready to help.' }]
      : []),
    ...history.map((m) => ({
      role: m.sender === 'user' ? ('user' as const) : ('assistant' as const),
      content: m.text,
      imageUrl: m.imageUrl,
    })),
    { role: 'user' as const, content: message, imageUrl },
  ];

  const endpoint = feature === 'marketplace' ? '/api/marketplace-assistant' : '/api/farming-assistant';

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: conversation }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'Could not reach the assistant.');
  }

  const data = await response.json();
  if (!data?.reply) {
    throw new Error('The assistant did not return a response.');
  }
  return data.reply as string;
}
