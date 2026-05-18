import type { RecyclingStage } from '../../shared/api/contracts';

export function nextStage(stage: RecyclingStage): RecyclingStage {
  if (stage === 'collected') return 'segregated';
  if (stage === 'segregated') return 'processing';
  if (stage === 'processing') return 'converted';
  return 'converted';
}

export function isTerminalStage(stage: RecyclingStage): boolean {
  return stage === 'converted';
}

export const STAGE_LABELS: Record<RecyclingStage, string> = {
  collected: 'Collected',
  segregated: 'Segregated',
  processing: 'Processing',
  converted: 'Converted',
};

export const STAGE_COLORS: Record<RecyclingStage, string> = {
  collected: 'bg-yellow-700 text-yellow-100',
  segregated: 'bg-blue-700 text-blue-100',
  processing: 'bg-orange-700 text-orange-100',
  converted: 'bg-green-700 text-green-100',
};
