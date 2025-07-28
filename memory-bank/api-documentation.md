# API Documentation

## Overview
The RESQ frontend application communicates with a backend API running on `localhost:6000`. The API integration is built using Axios with React Query for state management.

## API Configuration

### Base Configuration
**File**: `src/config/api.ts`

```typescript
// Dynamic base URL - uses proxy in development
export const API_BASE_URL = import.meta.env.DEV ? '' : 'http://localhost:6000';

// Axios instance with default config
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds
});
```

### Proxy Configuration
**File**: `vite.config.ts`

```typescript
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

## Authentication Endpoints

### 1. User Registration
**Endpoint**: `POST /api/v1/auth/register`

**Request Type**:
```typescript
interface RegisterRequest {
    full_name: string;
    email: string;
    password: string;
    phone_number: string;
    user_type: 'Patient' | 'Provider';
}
```

**Response Type**:
```typescript
interface RegisterResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        full_name: string;
        email: string;
        phone_number: string;
        user_type: string;
        is_admin: boolean;
        email_verified: boolean;
        created_at: string;
        token: string;
    };
}
```

**Usage**:
```typescript
const { mutate: register, isLoading, error } = useRegister();

register({
    full_name: "John Doe",
    email: "john@example.com",
    password: "password123",
    phone_number: "+1234567890",
    user_type: "Patient"
});
```

### 2. User Login
**Endpoint**: `POST /api/v1/auth/login`

**Request Type**:
```typescript
interface LoginRequest {
    email: string;
    password: string;
}
```

**Response Type**:
```typescript
interface LoginResponse {
    success: boolean;
    message: string;
    data: {
        id: string;
        full_name: string;
        email: string;
        phone_number: string;
        user_type: string;
        is_admin: boolean;
        email_verified: boolean;
        token: string;
    };
}
```

### 3. Email Verification
**Endpoint**: `POST /api/v1/auth/verify`

**Request Type**:
```typescript
interface VerifyRequest {
    email: string;
    verification_code: string;
}
```

### 4. Logout
**Endpoint**: `POST /api/v1/auth/logout`

## Service Layer Implementation

### Authentication Service
**File**: `src/services/authService.ts`

```typescript
// API function
export const registerUser = async (data: RegisterRequest): Promise<RegisterResponse> => {
    try {
        console.log('Attempting to register user with data:', {
            ...data,
            password: '[HIDDEN]'
        });
        
        const response = await apiClient.post(API_ENDPOINTS.AUTH.REGISTER, data);
        console.log('Registration response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Registration error details:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            response: error.response?.data,
            isNetworkError: !error.response,
        });
        
        throw error;
    }
};

// React Query hook
export const useRegister = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: registerUser,
        onSuccess: (data) => {
            if (data.data?.token) {
                localStorage.setItem('authToken', data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data));
            }
            queryClient.invalidateQueries({ queryKey: ['user'] });
            toast.success('Registration successful! Please check your email for verification.');
        },
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
        },
    });
};
```

## Interceptors

### Request Interceptor
**Purpose**: Add authentication token to all requests

```typescript
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Debug logging in development
        if (import.meta.env.DEV) {
            console.log('API Request:', {
                method: config.method,
                url: config.url,
                baseURL: config.baseURL,
                fullURL: `${config.baseURL}${config.url}`,
                headers: config.headers,
            });
        }
        
        return config;
    },
    (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
    }
);
```

### Response Interceptor
**Purpose**: Handle global error responses

```typescript
apiClient.interceptors.response.use(
    (response) => {
        // Debug logging in development
        if (import.meta.env.DEV) {
            console.log('API Response:', {
                status: response.status,
                statusText: response.statusText,
                url: response.config.url,
                data: response.data,
            });
        }
        return response;
    },
    (error) => {
        // Enhanced error logging
        console.error('API Error:', {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            statusText: error.response?.statusText,
            url: error.config?.url,
            method: error.config?.method,
            response: error.response?.data,
        });

        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);
```

## Error Handling

### Error Types
1. **Network Errors** (`ERR_NETWORK`): Connection issues
2. **Timeout Errors** (`ECONNABORTED`): Request timeout
3. **HTTP Errors**: 4xx and 5xx status codes
4. **Validation Errors**: Server-side validation failures

### Error Handling Strategy
```typescript
onError: (error: any) => {
    let errorMessage = 'Operation failed. Please try again.';
    
    if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Network error: Unable to connect to the server.';
    } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout: The server is taking too long to respond.';
    } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
    } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
    } else if (error.message) {
        errorMessage = error.message;
    }
    
    toast.error(errorMessage);
}
```

## Development Workflow

### Debugging API Calls
1. **Check Console Logs**: Detailed request/response logs in development
2. **Network Tab**: Verify requests in browser DevTools
3. **Backend Logs**: Check server logs for corresponding requests
4. **Error Messages**: Use enhanced error messages for troubleshooting

### Testing API Integration
```typescript
// Test registration
const { mutate: register, isLoading, error } = useRegister();

// Test with valid data
register({
    full_name: "Test User",
    email: "test@example.com",
    password: "password123",
    phone_number: "+1234567890",
    user_type: "Patient"
});

// Check for errors
if (error) {
    console.error('Registration error:', error);
}
```

## Best Practices

### 1. Type Safety
- Always define TypeScript interfaces for requests and responses
- Use strict typing to catch errors at compile time

### 2. Error Handling
- Categorize errors by type (network, validation, server)
- Provide user-friendly error messages
- Log detailed error information for debugging

### 3. State Management
- Use React Query for server state management
- Implement proper loading and error states
- Cache responses appropriately

### 4. Security
- Store tokens securely in localStorage
- Implement automatic token refresh
- Handle unauthorized access gracefully

### 5. Performance
- Implement request debouncing where appropriate
- Use React Query's caching capabilities
- Monitor request timing and performance

## Future Enhancements

### 1. Retry Logic
```typescript
// Add retry configuration to Axios
export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
    retry: 3,
    retryDelay: 1000,
});
```

### 2. Request Caching
```typescript
// Implement smart caching with React Query
const { data, isLoading } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

### 3. Offline Support
```typescript
// Handle offline scenarios
if (!navigator.onLine) {
    // Show offline message
    toast.error('You are offline. Please check your connection.');
    return;
}
```

### 4. Request Queue
```typescript
// Queue requests when offline
const queue = [];
if (!navigator.onLine) {
    queue.push(request);
    // Process when back online
}
``` 