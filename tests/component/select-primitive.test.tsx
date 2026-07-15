import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from '../../src/shared/ui/primitives/Select';

describe('Select primitive', () => {
  it('renders label, options, and disabled state consistently', () => {
    render(
      <Select
        label="Waste Type"
        value="plastic"
        onChange={vi.fn()}
        options={[
          { label: 'Plastic', value: 'plastic' },
          { label: 'Organic', value: 'organic' },
        ]}
        disabled
      />
    );

    expect(screen.getByLabelText('Waste Type')).toBeDisabled();
    expect(screen.getByRole('option', { name: 'Plastic' })).toBeInTheDocument();
  });

  it('renders error message when error is provided', () => {
    render(
      <Select
        label="Category"
        value=""
        onChange={vi.fn()}
        options={[{ label: 'Select one', value: '' }]}
        error="Category is required"
      />
    );

    expect(screen.getByText('Category is required')).toBeInTheDocument();
  });
});
