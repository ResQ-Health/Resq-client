# System Patterns

## Architecture Overview

### Directory Structure
```
src/
├── components/          # Reusable UI components
├── config/             # Configuration files (API, etc.)
├── contexts/           # React contexts (Auth, etc.)
├── pages/              # Page components
│   ├── onboarding patients/
│   ├── onboarding provider/
│   └── patientSetup/
├── services/           # API service layers
└── assets/            # Static assets
```

## Design Patterns

### 1. Service Layer Pattern
**Location**: `src/services/`
**Purpose**: Encapsulate API communication logic

```typescript
// Example: authService.ts
export const registerUser = async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
    return response.data;
};
```

**Benefits**:
- Centralized API logic
- Reusable across components
- Easy to test and maintain
- Type-safe interfaces

### 2. React Query Pattern
**Purpose**: Server state management with caching

```typescript
export const useRegister = () => {
    return useMutation({
        mutationFn: registerUser,
        onSuccess: (data) => {
            // Handle success
        },
        onError: (error) => {
            // Handle error
        },
    });
};
```

**Benefits**:
- Automatic caching
- Background updates
- Error handling
- Loading states

### 3. Interceptor Pattern
**Location**: `src/config/api.ts`
**Purpose**: Cross-cutting concerns for HTTP requests

```typescript
// Request interceptor
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Handle unauthorized
        }
        return Promise.reject(error);
    }
);
```

### 4. Protected Route Pattern
**Location**: `src/components/ProtectedRoute.tsx`
**Purpose**: Role-based access control

```typescript
const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();
    
    if (loading) return <LoadingSpinner />;
    if (!user || !allowedRoles.includes(user.user_type)) {
        return <Navigate to="/" replace />;
    }
    
    return <>{children}</>;
};
```

### 5. Layout Pattern
**Location**: `src/components/Layout.tsx`, `src/components/PatientLayout.tsx`
**Purpose**: Consistent page structure

```typescript
const Layout = ({ children }: LayoutProps) => {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="container mx-auto px-4 py-8">
                {children}
            </main>
            <Footer />
        </div>
    );
};
```

## State Management Patterns

### 1. Context + Hooks Pattern
**Location**: `src/contexts/AuthContext.tsx`
**Purpose**: Global state management

```typescript
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: AuthProviderProps) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    
    // Auth logic here
    
    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
```

### 2. Custom Hooks Pattern
**Purpose**: Reusable logic encapsulation

```typescript
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
```

## Error Handling Patterns

### 1. Centralized Error Handling
**Location**: `src/config/api.ts`
**Purpose**: Consistent error processing

```typescript
onError: (error: any) => {
    let errorMessage = 'Registration failed. Please try again.';
    
    if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Unable to connect to the server.';
    } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout: The server is taking too long to respond.';
    } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
    }
    
    toast.error(errorMessage);
}
```

### 2. Debug Logging Pattern
**Purpose**: Development-time debugging

```typescript
if (import.meta.env.DEV) {
    console.log('API Request:', {
        method: config.method,
        url: config.url,
        headers: config.headers,
    });
}
```

## Component Patterns

### 1. Compound Component Pattern
**Purpose**: Flexible component composition

### 2. Render Props Pattern
**Purpose**: Component logic sharing

### 3. Higher-Order Component Pattern
**Purpose**: Cross-cutting component concerns

## API Integration Patterns

### 1. Endpoint Configuration
**Location**: `src/config/api.ts`
**Purpose**: Centralized API endpoint management

```typescript
export const API_ENDPOINTS = {
    AUTH: {
        REGISTER: '/api/v1/auth/register',
        LOGIN: '/api/v1/auth/login',
        VERIFY: '/api/v1/auth/verify',
        LOGOUT: '/api/v1/auth/logout',
    },
} as const;
```

### 2. Type-Safe API Responses
**Purpose**: Compile-time type checking

```typescript
export interface RegisterResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        full_name: string;
        email: string;
        // ... other fields
    };
}
``` 