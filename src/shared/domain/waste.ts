import type { WasteCategory } from '../api/contracts';

export const WASTE_CATEGORIES: WasteCategory[] = ['plastic', 'organic', 'metal', 'paper', 'ewaste'];

export const WASTE_LABELS: Record<WasteCategory, string> = {
  plastic: 'Plastic',
  organic: 'Organic',
  metal: 'Metal',
  paper: 'Paper',
  ewaste: 'E-Waste',
};

export const WASTE_CHART_COLORS: Record<WasteCategory, string> = {
  plastic: '#3b82f6',
  organic: '#22c55e',
  metal: '#a855f7',
  paper: '#f59e0b',
  ewaste: '#ef4444',
};
