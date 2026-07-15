import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Input } from '../../src/shared/ui/primitives/Input';

describe('Input primitive', () => {
  it('assigns distinct ids when two inputs share the same label', () => {
    render(
      <>
        <Input label="Batch Name" value="Batch A" onChange={() => {}} />
        <Input label="Batch Name" value="Batch B" onChange={() => {}} />
      </>
    );

    const inputs = screen.getAllByRole('textbox', { name: 'Batch Name' });
    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveAttribute('id');
    expect(inputs[1]).toHaveAttribute('id');
    expect(inputs[0].id).not.toBe(inputs[1].id);

    const labels = screen.getAllByText('Batch Name', { selector: 'label' });
    expect(labels).toHaveLength(2);
    expect(labels[0]).toHaveAttribute('for', inputs[0].id);
    expect(labels[1]).toHaveAttribute('for', inputs[1].id);
  });
});
