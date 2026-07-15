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

  it('assigns distinct ids when two selects share the same label', () => {
    render(
      <>
        <Select
          label="Material"
          value="plastic"
          onChange={vi.fn()}
          options={[
            { label: 'Plastic', value: 'plastic' },
            { label: 'Metal', value: 'metal' },
          ]}
        />
        <Select
          label="Material"
          value="metal"
          onChange={vi.fn()}
          options={[
            { label: 'Plastic', value: 'plastic' },
            { label: 'Metal', value: 'metal' },
          ]}
        />
      </>
    );

    const selects = screen.getAllByRole('combobox', { name: 'Material' });
    expect(selects).toHaveLength(2);
    expect(selects[0]).toHaveAttribute('id');
    expect(selects[1]).toHaveAttribute('id');
    expect(selects[0].id).not.toBe(selects[1].id);

    const labels = screen.getAllByText('Material', { selector: 'label' });
    expect(labels).toHaveLength(2);
    expect(labels[0]).toHaveAttribute('for', selects[0].id);
    expect(labels[1]).toHaveAttribute('for', selects[1].id);
  });
});
