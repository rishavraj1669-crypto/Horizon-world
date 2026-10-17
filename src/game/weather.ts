/**
 * Dynamic Realistic Weather System & Day-Night Engine
 * Seamlessly manages time-of-day solar movement, sky gradients, dynamic fog colors,
 * precipitation (rain, snow, storm, mist), and lightning strikes.
 */

export type WeatherType = 'clear' | 'overcast' | 'rain' | 'thunder' | 'snow' | 'mist';

export interface WeatherProfile {
  name: string;
  skyColorTop: string;
  skyColorHorizon: string;
  fogColor: string;
  fogDensity: number;
  sunIntensity: number;
  sunColor: string;
  ambientIntensity: number;
  ambientColor: string;
  precipitationType: 'none' | 'rain' | 'snow';
  precipitationDensity: number; // 0 to 1
  windSpeed: number;
  wetness: number; // 0 to 1 (surface puddles/specular)
}

export const WEATHER_PROFILES: Record<WeatherType, (timeOfDay: number) => WeatherProfile> = {
  clear: (t) => {
    const isDay = t >= 6 && t <= 18;
    const isDawnDusk = (t >= 5 && t < 7) || (t > 17 && t <= 19);

    if (isDawnDusk) {
      return {
        name: 'Clear Dawn / Dusk',
        skyColorTop: '#2d3748',
        skyColorHorizon: '#e07a5f',
        fogColor: '#f4a261',
        fogDensity: 0.0035,
        sunIntensity: 1.4,
        sunColor: '#ffaa66',
        ambientIntensity: 0.65,
        ambientColor: '#d4a373',
        precipitationType: 'none',
        precipitationDensity: 0,
        windSpeed: 4.0,
        wetness: 0.0,
      };
    } else if (isDay) {
      return {
        name: 'Sunny Skies',
        skyColorTop: '#3a86ff',
        skyColorHorizon: '#89c2d9',
        fogColor: '#a9d6e5',
        fogDensity: 0.002,
        sunIntensity: 2.0,
        sunColor: '#fff8ea',
        ambientIntensity: 0.85,
        ambientColor: '#cce3de',
        precipitationType: 'none',
        precipitationDensity: 0,
        windSpeed: 3.0,
        wetness: 0.0,
      };
    } else {
      return {
        name: 'Starry Night',
        skyColorTop: '#050814',
        skyColorHorizon: '#0f172a',
        fogColor: '#0a0f1d',
        fogDensity: 0.004,
        sunIntensity: 0.35, // Moonlight
        sunColor: '#9bb1ff',
        ambientIntensity: 0.3,
        ambientColor: '#1d2d44',
        precipitationType: 'none',
        precipitationDensity: 0,
        windSpeed: 2.0,
        wetness: 0.0,
      };
    }
  },

  overcast: (t) => {
    const isDay = t >= 6 && t <= 18;
    return {
      name: 'Overcast Cloudcover',
      skyColorTop: isDay ? '#64748b' : '#0f172a',
      skyColorHorizon: isDay ? '#94a3b8' : '#1e293b',
      fogColor: isDay ? '#94a3b8' : '#1e293b',
      fogDensity: 0.0045,
      sunIntensity: isDay ? 0.9 : 0.2,
      sunColor: '#d6d6d6',
      ambientIntensity: isDay ? 0.6 : 0.25,
      ambientColor: '#788596',
      precipitationType: 'none',
      precipitationDensity: 0,
      windSpeed: 6.5,
      wetness: 0.2,
    };
  },

  rain: (t) => {
    const isDay = t >= 6 && t <= 18;
    return {
      name: 'Autumn Downpour',
      skyColorTop: isDay ? '#475569' : '#090d16',
      skyColorHorizon: isDay ? '#64748b' : '#151c28',
      fogColor: isDay ? '#64748b' : '#151c28',
      fogDensity: 0.0075,
      sunIntensity: isDay ? 0.6 : 0.15,
      sunColor: '#a0aec0',
      ambientIntensity: isDay ? 0.5 : 0.2,
      ambientColor: '#4a5568',
      precipitationType: 'rain',
      precipitationDensity: 0.7,
      windSpeed: 9.0,
      wetness: 0.85,
    };
  },

  thunder: (t) => {
    const isDay = t >= 6 && t <= 18;
    return {
      name: 'Electric Thunderstorm',
      skyColorTop: isDay ? '#1e293b' : '#020617',
      skyColorHorizon: isDay ? '#334155' : '#0f172a',
      fogColor: isDay ? '#334155' : '#0f172a',
      fogDensity: 0.009,
      sunIntensity: isDay ? 0.4 : 0.1,
      sunColor: '#818cf8',
      ambientIntensity: isDay ? 0.4 : 0.15,
      ambientColor: '#334155',
      precipitationType: 'rain',
      precipitationDensity: 1.0,
      windSpeed: 14.0,
      wetness: 1.0,
    };
  },

  snow: (t) => {
    const isDay = t >= 6 && t <= 18;
    return {
      name: 'Highland Snowstorm',
      skyColorTop: isDay ? '#94a3b8' : '#111827',
      skyColorHorizon: isDay ? '#cbd5e1' : '#1f2937',
      fogColor: isDay ? '#cbd5e1' : '#1f2937',
      fogDensity: 0.008,
      sunIntensity: isDay ? 1.1 : 0.25,
      sunColor: '#e2e8f0',
      ambientIntensity: isDay ? 0.75 : 0.3,
      ambientColor: '#94a3b8',
      precipitationType: 'snow',
      precipitationDensity: 0.85,
      windSpeed: 7.0,
      wetness: 0.4,
    };
  },

  mist: (t) => {
    const isDay = t >= 6 && t <= 18;
    return {
      name: 'Valley Morning Mist',
      skyColorTop: isDay ? '#a5b4fc' : '#181e36',
      skyColorHorizon: isDay ? '#e0e7ff' : '#2e3856',
      fogColor: isDay ? '#e0e7ff' : '#242c44',
      fogDensity: 0.012,
      sunIntensity: isDay ? 0.75 : 0.2,
      sunColor: '#fed7aa',
      ambientIntensity: isDay ? 0.7 : 0.3,
      ambientColor: '#c7d2fe',
      precipitationType: 'none',
      precipitationDensity: 0,
      windSpeed: 1.5,
      wetness: 0.5,
    };
  },
};

/**
 * Calculates sun / moon direction in world space based on 24hr time of day
 */
export function getSunPosition(timeOfDay: number, worldRadius: number = 220): { x: number; y: number; z: number } {
  // 6:00 = East dawn, 12:00 = Overhead noon, 18:00 = West sunset, 24:00 = Nadir midnight
  const angle = ((timeOfDay - 6) / 24) * Math.PI * 2;
  const x = Math.cos(angle) * worldRadius;
  const y = Math.sin(angle) * worldRadius;
  const z = Math.cos(angle * 0.5) * (worldRadius * 0.45);
  return { x, y, z };
}

/**
 * Formats 24.0 float into "14:30" string
 */
export function formatTimeOfDay(t: number): string {
  const normalized = ((t % 24) + 24) % 24;
  const hours = Math.floor(normalized);
  const minutes = Math.floor((normalized - hours) * 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
