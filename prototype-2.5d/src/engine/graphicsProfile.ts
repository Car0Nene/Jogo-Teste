import { GraphicsQuality } from '../data/settings';

/**
 * === PHASE 4: HD Visual Recovery ===
 * Defines graphics profiles for different quality levels
 * Adjusts rendering parameters to balance quality and performance
 */

export interface GraphicsProfile {
  quality: GraphicsQuality;
  // Texture atlas tier selection (0=HD 5.6M, 1=4M, 2=HD2 713K, 3=mid, 4=low, 5=min)
  atlasStartTier: number;
  
  // Shadow configuration
  shadowsEnabled: boolean;
  shadowMapSize: 512 | 1024;
  
  // Particle effects
  particlesEnabled: boolean;
  sparkPoolSize: number;
  
  // Resolution scaling (multiplier to effective pixel ratio)
  resolutionScale: number;
  
  // Post-processing
  postProcessingEnabled: boolean;
  
  // Burst effect intensity (0-1)
  burstIntensity: number;
  
  // Description for UI
  label: string;
  description: string;
}

export const GRAPHICS_PROFILES: Record<GraphicsQuality, GraphicsProfile> = {
  high: {
    quality: 'high',
    atlasStartTier: 0, // Use tier 0 (5.6M HD atlas) on initialization
    shadowsEnabled: true,
    shadowMapSize: 1024,
    particlesEnabled: true,
    sparkPoolSize: 300,
    resolutionScale: 1.0,
    postProcessingEnabled: true,
    burstIntensity: 1.0,
    label: 'Alto',
    description: 'Máxima qualidade visual (1024px shadows, atlas HD tier 0)',
  },
  medium: {
    quality: 'medium',
    atlasStartTier: 2, // Use tier 2 (713K HD2 atlas) on initialization
    shadowsEnabled: true,
    shadowMapSize: 512,
    particlesEnabled: true,
    sparkPoolSize: 250,
    resolutionScale: 0.95,
    postProcessingEnabled: true,
    burstIntensity: 0.9,
    label: 'Médio',
    description: 'Qualidade equilibrada (512px shadows, atlas HD tier 2)',
  },
  low: {
    quality: 'low',
    atlasStartTier: 4, // Use tier 4 (low resolution atlas) on initialization
    shadowsEnabled: false,
    shadowMapSize: 512,
    particlesEnabled: true,
    sparkPoolSize: 150,
    resolutionScale: 0.85,
    postProcessingEnabled: false,
    burstIntensity: 0.7,
    label: 'Baixo',
    description: 'Performance otimizada (sem shadows, atlas comprimido)',
  },
};

/**
 * Get the appropriate graphics profile for current quality setting
 */
export function getGraphicsProfile(quality: GraphicsQuality): GraphicsProfile {
  return GRAPHICS_PROFILES[quality];
}

/**
 * Calculate effective atlas tier based on quality and device capabilities
 * Returns tier 0-5 for atlas selector
 */
export function getInitialAtlasTier(quality: GraphicsQuality, isSoftwareGl: boolean): number {
  if (isSoftwareGl) {
    // Software rendering: always use low tier
    return 4;
  }
  
  const profile = getGraphicsProfile(quality);
  return profile.atlasStartTier;
}
