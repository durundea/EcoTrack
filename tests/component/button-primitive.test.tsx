import { fireEvent, render, screen } from '@testing-library/react';
import type { FormEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../../src/shared/ui/primitives/Button';

describe('Button primitive', () => {
  it('defaults type to button to avoid implicit form submission', () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
    });

    render(
      <form onSubmit={onSubmit}>
        <Button>Save</Button>
      </form>
    );

    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('type', 'button');

    fireEvent.click(button);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('applies variant classes for primary by default and secondary when specified', () => {
    const { rerender } = render(<Button>Primary</Button>);

    const primaryButton = screen.getByRole('button', { name: 'Primary' });
    expect(primaryButton.className).toContain('bg-[var(--action-brand)]');

    rerender(<Button variant="secondary">Secondary</Button>);

    const secondaryButton = screen.getByRole('button', { name: 'Secondary' });
    expect(secondaryButton.className).toContain('border-[var(--border-subtle)]');
    expect(secondaryButton.className).toContain('bg-[var(--surface-panel)]');
  });
});
