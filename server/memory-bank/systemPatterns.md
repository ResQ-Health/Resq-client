# System Patterns

## Architecture
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ORM)
- **Caching**: Redis
- **Security**: Helmet, CORS, JWT, Bcrypt

## Key Components
- `src/index.js`: Entry point.
- `src/scripts/`: Utility scripts (scheduler, email test, slot generation).
- `src/config/`: Configuration (email, likely DB/Redis connections).

## Design Patterns
- **MVC** (likely, given standard Express structure).
- **Middleware** chain for request processing.
- **Service Layer** (inferred for business logic).

