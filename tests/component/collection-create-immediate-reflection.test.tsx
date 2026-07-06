import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Providers } from '../../src/app/providers';
import { CollectionPage } from '../../src/features/collection/CollectionPage';
import { clearSession, setSession } from '../../src/features/auth/sessionStore';

function renderPage() {
  return render(
    <Providers>
      <MemoryRouter>
        <CollectionPage />
      </MemoryRouter>
    </Providers>
  );
}

describe('collection create immediate reflection', () => {
  beforeEach(() => {
    clearSession();
    setSession({
      token: 'admin-token',
      user: {
        id: 'U-001',
        name: 'Admin User',
        role: 'admin',
        email: 'admin@ecotrack.local',
      },
    });
    vi.restoreAllMocks();
  });

  it('shows newly created pickup row before post-create refetch resolves', async () => {
    let pickupGetCount = 0;
    let pickupPostCount = 0;
    let releaseSecondGet: (() => void) | null = null;

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const requestUrl =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      const pathname = new URL(requestUrl).pathname;
      const method = init?.method ?? 'GET';

      if (pathname === '/api/collection/dispatches') {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      if (pathname === '/api/collection/pickups' && method === 'GET') {
        pickupGetCount += 1;

        if (pickupGetCount === 1) {
          return new Response(
            JSON.stringify({
              items: [],
              page: 1,
              pageSize: 20,
              totalCount: 0,
              totalPages: 0,
            }),
            { status: 200 }
          );
        }

        await new Promise<void>((resolve) => {
          releaseSecondGet = resolve;
        });

        return new Response(
          JSON.stringify({
            items: [
              {
                id: 'pickup-900',
                pickupCode: 'PK-900',
                siteName: 'Immediate Site',
                siteAddressText: 'Immediate Site',
                scheduledAtUtc: '2026-07-03T00:00:00Z',
                estimatedWeightKg: 20,
                collectedWeightKg: 0,
                status: 'scheduled',
                assignedCollectorUserId: null,
                assignedCollectorDisplayName: null,
                notes: '',
              },
            ],
            page: 1,
            pageSize: 20,
            totalCount: 1,
            totalPages: 1,
          }),
          { status: 200 }
        );
      }

      if (pathname === '/api/collection/pickups' && method === 'POST') {
        pickupPostCount += 1;
        return new Response(
          JSON.stringify({
            id: 'pickup-900',
            pickupCode: 'PK-900',
            siteName: 'Immediate Site',
            siteAddressText: 'Immediate Site',
            scheduledAtUtc: '2026-07-03T00:00:00Z',
            estimatedWeightKg: 20,
            collectedWeightKg: 0,
            status: 'scheduled',
            assignedCollectorUserId: null,
            assignedCollectorDisplayName: null,
            notes: '',
          }),
          { status: 200 }
        );
      }

      return new Response('Not Found', { status: 404 });
    });

    try {
      renderPage();
      await waitForElementToBeRemoved(() => screen.queryByText(/loading schedule/i));

      fireEvent.click(await screen.findByRole('button', { name: /schedule new pickup/i }));
      const modalHeading = screen.getByRole('heading', { name: /schedule new pickup/i });
      const modal = modalHeading.closest('.w-full.max-w-lg.rounded-xl.border.border-slate-700.bg-slate-900.p-6.shadow-2xl');
      expect(modal).toBeTruthy();
      const siteField = within(modal as HTMLElement)
        .getAllByRole('textbox')
        .find((input) => (input.previousElementSibling?.textContent ?? '').trim() === 'Site');
      expect(siteField).toBeTruthy();
      const estimatedWeightInput = within(modal as HTMLElement).getByRole('spinbutton');
      fireEvent.change(siteField as HTMLInputElement, { target: { value: 'Immediate Site' } });
      expect((siteField as HTMLInputElement).value).toBe('Immediate Site');
      fireEvent.change(estimatedWeightInput, { target: { value: 20 } });
      fireEvent.click(within(modal as HTMLElement).getByRole('button', { name: /^save$/i }));

      await waitFor(() => {
        expect(pickupPostCount).toBe(1);
      });

      await waitFor(() => {
        expect(screen.getByText('Immediate Site')).toBeInTheDocument();
      });
    } finally {
      releaseSecondGet?.();
    }
  });
});
