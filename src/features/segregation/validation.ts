import type { WasteCategory } from '../../shared/api/contracts';

export type SegregationInput = Record<WasteCategory, number>;

export type ValidationResult = {
  valid: boolean;
  message: string;
};

export function validateSegregationEntry(input: SegregationInput): ValidationResult {
  const values = Object.values(input) as number[];

  if (values.some((v) => v < 0)) {
    return { valid: false, message: 'Weights cannot be negative.' };
  }

  if (values.every((v) => v === 0)) {
    return { valid: false, message: 'At least one category must have a non-zero weight.' };
  }

  const totalKg = values.reduce((sum, v) => sum + v, 0);
  if (totalKg > 10000) {
    return { valid: false, message: 'Total weight exceeds maximum single-batch limit of 10,000 kg.' };
  }

  return { valid: true, message: '' };
}
