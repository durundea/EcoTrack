# Global Loader

A global, automatic loading overlay for API calls in EcoTrack.

## How It Works

The loader automatically shows when API calls (mutations) are in progress and hides when they complete. It uses React Query's mutation lifecycle hooks to manage the loading state.

## Setup

✅ **Already configured!** The loader is automatically set up in:
- `src/shared/services/LoaderContext.tsx` - Context and provider
- `src/shared/ui/Loader.tsx` - UI component
- `src/app/providers.tsx` - Integration with React Query
- `src/app/layouts/AppShell.tsx` - Renders the loader

## Usage

### For Components
No setup needed! The loader automatically shows whenever any React Query mutation is in-flight.

### For Tests
When testing components that use AppShell, wrap with `LoaderProvider`:

```tsx
import { LoaderProvider } from '../../src/shared/services/LoaderContext';

render(
  <LoaderProvider>
    <YourComponent />
  </LoaderProvider>
);
```

### Accessing Loader State
To manually control or check loader state in a component:

```tsx
import { useLoader } from '../../src/shared/services';

function MyComponent() {
  const { isLoading, incrementLoading, decrementLoading } = useLoader();
  
  // Use as needed
}
```

## Customization

To customize the loader appearance, edit [src/shared/ui/Loader.tsx](src/shared/ui/Loader.tsx):
- Change spinner size/color by modifying the Tailwind classes
- Update "Loading..." text
- Modify the backdrop opacity/blur

## Behavior

- **Automatic**: Triggered on every mutation (API call)
- **Non-blocking**: Prevents interaction while loading
- **Stacking**: Shows only once even with multiple concurrent requests
- **Auto-hiding**: Hides when all requests complete
