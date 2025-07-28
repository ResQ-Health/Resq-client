# Technical Context

## Development Environment
- **OS**: macOS (darwin 24.3.0)
- **Shell**: zsh
- **Node.js**: Latest LTS version
- **Package Manager**: npm

## Technology Stack

### Core Technologies
- **React**: 19.0.0 (Latest)
- **TypeScript**: ~5.7.2
- **Vite**: ^6.3.1 (Build tool and dev server)
- **Tailwind CSS**: ^3.4.17 (Styling)
- **Material-UI**: ^7.0.2 (Component library)

### State Management & Data Fetching
- **React Query (TanStack Query)**: ^5.83.0
  - Used for server state management
  - Handles caching, background updates, and error states
  - Provides hooks like `useMutation` and `useQuery`

### HTTP Client
- **Axios**: ^1.11.0
  - Configured with interceptors for auth tokens
  - Automatic error handling and response processing
  - Request/response logging in development

### Routing & Navigation
- **React Router DOM**: ^6.30.0
  - Client-side routing
  - Protected routes implementation
  - Nested routing for different user types

### UI/UX Libraries
- **React Hot Toast**: ^2.5.2 (Notifications)
- **React Icons**: ^5.5.0 (Icon library)
- **Heroicons**: ^2.2.0 (Additional icons)
- **React Big Calendar**: ^1.18.0 (Calendar component)
- **Chart.js**: ^4.4.9 + React Chart.js 2 (Data visualization)

## Development Setup

### Proxy Configuration
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:6000',
      changeOrigin: true,
      secure: false,
      ws: true,
    },
  },
}
```

### API Configuration
- **Base URL**: Development uses proxy, production uses direct URL
- **Timeout**: 10 seconds
- **Headers**: Automatic Content-Type and Authorization
- **Error Handling**: Comprehensive error logging and user feedback

## Build Configuration
- **TypeScript**: Strict mode enabled
- **ESLint**: Code quality and consistency
- **PostCSS**: Autoprefixer for CSS compatibility
- **Vite**: Fast HMR and optimized builds

## Dependencies Management
- **Core Dependencies**: 19 packages
- **Dev Dependencies**: 15 packages
- **Type Definitions**: Comprehensive TypeScript support 