import { BrowserRouter } from 'react-router-dom';
import { AppShell } from './layouts/AppShell';

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <h1 className="text-2xl font-semibold">Operations Console</h1>
      </AppShell>
    </BrowserRouter>
  );
}

