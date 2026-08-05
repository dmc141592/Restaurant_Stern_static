import type { ReactElement, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type RouterInitialEntry = string | { pathname: string; state?: unknown };

export function renderWithProviders(
  ui: ReactElement,
  options: {
    route?: string;
    initialEntries?: RouterInitialEntry[];
    wrapper?: (children: ReactNode) => ReactElement;
  } = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const content = options.wrapper ? options.wrapper(ui) : ui;
  const initialEntries = options.initialEntries ?? [options.route ?? '/'];

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>{content}</MemoryRouter>
    </QueryClientProvider>,
  );
}
