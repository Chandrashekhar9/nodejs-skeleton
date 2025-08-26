# 🚀 Node.js Skeleton - TypeScript + PostgreSQL

A professional Node.js skeleton/starter pack with enterprise-grade database management, authentication, and clean architecture. Ready to build any application on top of this solid foundation.

## ✨ Features

- 🔐 **JWT Authentication** with role-based access control
- 👥 **User Management** with profile management
- ️ **Professional Database Migrations** with CLI tools
- 📊 **Audit Logging** with login tracking
- 🛡️ **Token Blacklisting** for enhanced security
- 🏗️ **Clean Architecture** with separation of concerns
- 📱 **RESTful API** structure ready for any domain
- 🔧 **TypeScript** for type safety and better development experience

## 📋 Prerequisites

- **Node.js** (v18+ recommended) - [Download](https://nodejs.org/)
- **PostgreSQL** (v12+ recommended) - [Download](https://www.postgresql.org/download/)
- **Git** - [Download](https://git-scm.com/)

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone <repository-url>
cd node-js-skeleton
npm install
```

### 2. Setup Database
```sql
-- Connect to PostgreSQL
psql -U postgres

-- Create database
CREATE DATABASE your_app_name;
```

### 3. Configure Environment
```bash
# Copy environment template
cp .env.example .env
```

**Edit `.env` file:**
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_app_name
DB_USER=postgres
DB_PASS=your_password

# JWT Configuration (Generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
JWT_SECRET=your-64-character-secret-key
JWT_EXPIRATION=24h
```

### 4. Initialize Database
```bash
# Run migrations to create all tables
npm run migrate

# Check migration status
npm run migrate:status
```

### 5. Start Development
```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build && npm start
```

## 🗄️ Database Management

### Migration Commands
```bash
npm run migrate                          # Execute all pending migrations
npm run migrate:status                   # Show migration history in table format
npm run migrate:rollback                 # Rollback last batch of migrations
npm run migrate:rollback --name=<name>   # Rollback specific migration
npm run migrate:rollback --step=<number> # Rollback last N batches
npm run migrate:rollback:all             # Rollback all migrations
npm run migrate:refresh                  # Rollback all and re-run migrations
npm run migrate:create <name> [table]    # Create new migration file
npm run migrate:help                     # Show all available commands
```

### Migration Examples
```bash
# Run all pending migrations
npm run migrate

# Create different types of migrations
npm run migrate:create add_user_avatar users
npm run migrate:create create_posts posts

# Rollback operations
npm run migrate:rollback                 # Rollback last batch
npm run migrate:rollback --name=create_posts  # Rollback specific migration
npm run migrate:rollback --step=2        # Rollback last 2 batches

# Fresh start - rollback all and re-run
npm run migrate:refresh

# Check what's been executed
npm run migrate:status
```

### Example: Adding New Feature
```bash
# 1. Create migration
npm run migrate:create add_user_avatar

# 2. Edit the generated file in src/migrations/
# 3. Run migration
npm run migrate
```

## 📁 Project Structure

```
src/
├── config/          # Database and migration runner
│   ├── database.ts  # Database connection
│   ├── env.ts       # Environment configuration
│   └── migrations.ts# Migration file runner
├── controllers/     # Request handlers
│   └── auth.controller.ts
├── middlewares/     # Authentication and validation
│   ├── auth.middleware.ts
│   └── error.middleware.ts
├── models/          # Data models and DTOs
│   └── user.model.ts
├── repositories/    # Data access layer (CRUD only)
│   ├── login-log.repository.ts
│   ├── token-blacklist.repository.ts
│   └── user.repository.ts
├── routes/          # API route definitions
│   ├── auth.routes.ts
│   └── index.routes.ts
├── services/        # Business logic
│   └── auth.service.ts
├── types/           # TypeScript definitions
│   ├── login-log.types.ts
│   └── user.types.ts
├── utils/           # Utility Functions
├── migrations/      # Individual migration files
│   ├── 20250814T120000_create_users_table.ts
│   ├── 20250814T120100_create_login_logs_table.ts
│   └── 20250814T120200_create_token_blacklist_table.ts
├── app.ts           # Express application setup
└── server.ts        # Application entry point
scripts/
├── check-setup.cjs  # Environment verification
├── create-migration.cjs # Migration file generator
└── migrate.cjs      # Migration CLI tool
```

## 🗄️ Database Architecture

**Professional File-Based Migration System:**

| Component | Responsibility |
|-----------|----------------|
| **Individual Migration Files** | Each migration is a separate `.ts` file with `up()` and `down()` methods |
| **Migration Runner** | Scans and executes migration files in timestamp order |
| **Repositories** | Data operations (SELECT/INSERT/UPDATE/DELETE) |

### Current Database Tables

✅ **users** - User accounts and authentication  
✅ **login_logs** - Authentication audit trail  
✅ **token_blacklist** - JWT token security  
✅ **migrations** - Schema version tracking  

*All tables are created and managed through individual migration files in `src/migrations/`.*

## 🔌 API Endpoints

### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout (requires token)
- `GET /api/v1/auth/me` - Get current user (requires token)

### Health Check
- `GET /health` - Application health status

*Ready for you to add your own domain-specific endpoints!*

## 🔐 Security Features

- **JWT Authentication** with token blacklisting
- **Password Hashing** using bcrypt
- **Role-based Access Control** (user/admin)
- **Token Security** with JTI tracking
- **Login Audit Trail** with IP and user agent tracking
- **Input Validation** for all endpoints
- **SQL Injection Protection** with parameterized queries

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm start            # Start production server
npm run migrate:run  # Run database migrations
npm run migrate:status # Check migration status
```

### Adding New Features
1. **Create Migration**: `npm run migrate:create feature_name`
2. **Edit Migration File**: Add your SQL changes to the generated file
3. **Update Repository**: Add new data methods if needed
4. **Create Service**: Add business logic
5. **Add Controller**: Handle API requests
6. **Define Routes**: Expose endpoints
7. **Run Migration**: `npm run migrate:run`

## 🏗️ Building Your Application

This skeleton provides a solid foundation. Here's how to extend it for your specific needs:

### 1. Define Your Domain Models
```bash
# Example: Building an e-commerce app
npm run migrate:create create_products_table
npm run migrate:create create_orders_table
npm run migrate:create add_product_categories
```

### 2. Edit Migration Files
Open the generated files and add your SQL:
```typescript
// In: src/migrations/20250814TXXXXXX_create_products_table.ts
const queries = [
    `CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)`
];
```

### 2. Create Repositories
Add new repository classes in `src/repositories/` following the existing patterns.

### 3. Implement Business Logic
Create service classes in `src/services/` to handle your application logic.

### 4. Build API Endpoints
Add controllers in `src/controllers/` and routes in `src/routes/`.

### 5. Add Type Definitions
Define your types in `src/types/` for better TypeScript support.

### 6. Run Migrations
Execute your new migrations:
```bash
npm run migrate:run
npm run migrate:status  # Verify execution
```

## 📚 Documentation

- **DATABASE_GUIDE.md** - Comprehensive database management guide

## 🎯 What's Included

✅ **Complete Migration System** with CLI tools  
✅ **Professional Architecture** with clean separation  
✅ **JWT Authentication** with security features  
✅ **Audit Logging** with login tracking  
✅ **Role Management** with access control  
✅ **Error Handling** middleware  
✅ **Environment Configuration** management  
✅ **TypeScript Configuration** for development  

## 🚀 Ready to Use

This skeleton is production-ready and provides everything you need to start building your application:

- **Authentication system** - Users can register, login, and manage their sessions
- **Database foundation** - Professional migration system for schema management
- **Security features** - JWT tokens, password hashing, token blacklisting
- **Audit trails** - Login logging for security monitoring
- **Clean architecture** - Separation of concerns for maintainable code

Simply add your domain-specific features on top of this solid foundation! 🎉
