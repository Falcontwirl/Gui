import { BrowserRouter } from 'react-router';
import { PostHogProvider } from '@posthog/react';
import posthog from './lib/posthog';
import AppRoutes from './components/AppRoutes';

export default function App() {
  return (
    <PostHogProvider client={posthog}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </PostHogProvider>
  );
}
