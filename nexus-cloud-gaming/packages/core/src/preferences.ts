import { DEFAULT_MAPPING, parseMapping, type ButtonMapping } from './gamepad';
import type { StreamQuality } from './types';

export const QUALITIES: StreamQuality[] = ['720p30', '720p60', '1080p60', '1440p60', '4k60'];

export interface StreamPreferences {
  quality: 'auto' | StreamQuality;
  touchOverlay: boolean;
  vibration: boolean;
  reduceEffects: boolean;
  mapping: ButtonMapping;
}

export const DEFAULT_PREFERENCES: StreamPreferences = {
  quality: 'auto',
  touchOverlay: true,
  vibration: true,
  reduceEffects: false,
  mapping: { ...DEFAULT_MAPPING },
};

/**
 * Valida preferências lidas do armazenamento local, campo a campo.
 * Dados corrompidos ou de versões antigas nunca quebram a interface.
 */
export function parsePreferences(value: unknown): StreamPreferences {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
  const bool = (k: keyof StreamPreferences) =>
    typeof raw[k] === 'boolean' ? (raw[k] as boolean) : (DEFAULT_PREFERENCES[k] as boolean);
  const quality = raw.quality === 'auto' || QUALITIES.includes(raw.quality as StreamQuality)
    ? (raw.quality as StreamPreferences['quality'])
    : DEFAULT_PREFERENCES.quality;
  return {
    quality,
    touchOverlay: bool('touchOverlay'),
    vibration: bool('vibration'),
    reduceEffects: bool('reduceEffects'),
    mapping: parseMapping(raw.mapping),
  };
}
