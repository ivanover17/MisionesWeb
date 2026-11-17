import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // durante 30 s los datos se consideran frescos
      retry: 1, // un reintento; si el servidor está caído, el error sale pronto
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <h1>Cenas del Pasaporte</h1>
    </QueryClientProvider>
  </StrictMode>,
);
