import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from '../App';

// A fresh QueryClient for each test — avoids shared state between tests
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

describe('App', () => {
  it('renders without crashing', () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/money']}>
          <App />
        </MemoryRouter>
      </QueryClientProvider>
    );
    // The Money OS Navbar brand title should appear
    expect(screen.getAllByText(/Money/i).length).toBeGreaterThan(0);
  });
});
