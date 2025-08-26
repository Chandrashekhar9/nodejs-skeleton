# 🗄️ **Database Management Guide**

## 🎯 **Overview**

This guide explains how to manage your PostgreSQL database using our professional file-based migration system. Each migration is a separate TypeScript file with `up()` and `down()` methods, providing maximum flexibility and version control benefits.

---

## 🏗️ **Architecture: File-Based Migrations**

### **Professional Approach:**

| **Component** | **Responsibility** | **Location** |
|---------------|-------------------|--------------|
| **🗄️ Migration Files** | Individual schema changes | `src/migrations/*.ts` |
| **🔧 Migration Runner** | Discovers and executes migration files | `src/config/migrations.ts` |
| **🔧 Repositories** | Data operations only | `src/repositories/*.ts` |

### **Migration File Structure:**
```typescript
// src/migrations/20250814T120000_create_users_table.ts
export class CreateUsersTableMigration {
    async up(): Promise<void> {
        // Schema changes go here
    }
    
    async down(): Promise<void> {
        // Rollback logic goes here
    }
}
```

---

## 🚀 **Quick Start**

### **Initial Setup:**
```bash
# 1. Configure database connection in .env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_app_name
DB_USER=postgres
DB_PASS=your_password

# 2. Run initial migrations
npm run migrate

# 3. Check status
npm run migrate:status
```

---

## 🎮 **Migration Commands**

### **📋 Available Commands:**
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

### **🔄 Workflow Examples:**

#### **Adding New Feature:**
```bash
# 1. Create migration file (automatically generates proper structure)
npm run migrate:create add_user_avatar users
npm run migrate:create create_posts posts

# 2. Edit the generated file if needed: src/migrations/[timestamp]_migration_name.ts
# 3. Execute migration
npm run migrate

# 4. Verify changes
npm run migrate:status
```

#### **Rolling Back Changes:**
```bash
# Rollback last batch of migrations
npm run migrate:rollback

# Rollback specific migration by name
npm run migrate:rollback --name=create_posts

# Rollback last 2 batches
npm run migrate:rollback --step=2

# Rollback all migrations
npm run migrate:rollback:all

# Fresh start (rollback all + re-run)
npm run migrate:refresh

# Check status
npm run migrate:status
```

---

## 📝 **Creating Migrations**

### **Migration File Structure:**
```typescript
import { pool } from '../config/database';

export class AddUserAvatarMigration {
    async up(): Promise<void> {
        console.log('🔧 Executing migration: add_user_avatar');
        
        const queries = [
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(500)`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_thumbnail VARCHAR(255)`,
            `CREATE INDEX IF NOT EXISTS idx_users_avatar ON users(avatar_url)`
        ];

        for (const query of queries) {
            await pool.query(query);
        }

        console.log('✅ Migration add_user_avatar completed');
    }

    async down(): Promise<void> {
        console.log('🔄 Rolling back migration: add_user_avatar');
        
        const queries = [
            `DROP INDEX IF EXISTS idx_users_avatar`,
            `ALTER TABLE users DROP COLUMN IF EXISTS avatar_thumbnail`,
            `ALTER TABLE users DROP COLUMN IF EXISTS avatar_url`
        ];

        for (const query of queries) {
            await pool.query(query);
        }

        console.log('✅ Rollback add_user_avatar completed');
    }
}
```

### **Key Features:**
- **File-based**: Each migration is a separate TypeScript file
- **Timestamp ordering**: Migrations execute in chronological order
- **Bidirectional**: Both `up()` and `down()` methods for rollbacks
- **Type safety**: Full TypeScript support and IntelliSense
- **Version control friendly**: Easy to track changes in Git

    async down(): Promise<void> {
        console.log('🔄 Rolling back migration: add_user_avatar');
        
        const queries = [
            `DROP INDEX IF EXISTS idx_users_avatar`,
            `ALTER TABLE users DROP COLUMN IF EXISTS avatar_thumbnail`,
            `ALTER TABLE users DROP COLUMN IF EXISTS avatar_url`
        ];

        for (const query of queries) {
            await pool.query(query);
        }

        console.log('✅ Rollback add_user_avatar completed');
    }
}
```

### **Migration Best Practices:**

#### **✅ Safe Operations:**
```sql
-- Use IF NOT EXISTS for safety
CREATE TABLE IF NOT EXISTS new_table (...);
ALTER TABLE users ADD COLUMN IF NOT EXISTS new_field VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_name ON table(column);

-- Use IF EXISTS for cleanup
DROP INDEX IF EXISTS idx_name;
ALTER TABLE users DROP COLUMN IF EXISTS old_field;
```

#### **✅ Performance Considerations:**
```sql
-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_login_logs_user ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip ON login_logs(ip_address);

-- For large tables, consider:
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_name ON large_table(column);
```

---

## 🗄️ **Current Database Schema**

### **📊 Tables Overview:**

#### **🔐 users**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(10) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    bio TEXT,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### ** login_logs**
```sql
CREATE TABLE login_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    email VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT,
    status VARCHAR(50) NOT NULL,
    session_id VARCHAR(255),
    device_info JSONB,
    login_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    logout_at TIMESTAMP WITH TIME ZONE,
    token_jti VARCHAR(255)
);
```

#### **🛡️ token_blacklist**
```sql
CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,
    token_jti VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    blacklisted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    reason VARCHAR(100) DEFAULT 'logout'
);
```

#### **📋 migrations**
```sql
CREATE TABLE migrations (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) UNIQUE NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🚨 **Current Migration Files**

Your skeleton includes these essential migrations:

```
src/migrations/
├── 20250814T120000_create_users_table.ts        # Core user authentication
├── 20250814T120100_create_login_logs_table.ts   # Security audit logging  
└── 20250814T120200_create_token_blacklist_table.ts # JWT token security
```

All migrations are executed in timestamp order and tracked in the `migrations` table.

---

## 🔧 **Repository Pattern**

### **What Repositories Do:**

#### **✅ Data Operations Only:**
```typescript
class UserRepository {
    // CRUD Operations
    async create(userData: UserCreateDTO): Promise<User>
    async findById(id: number): Promise<User | null>
    async findByEmail(email: string): Promise<User | null>
    async update(id: number, data: Partial<User>): Promise<User>
    async delete(id: number): Promise<boolean>
    
    // Business Logic Queries
    async findActiveUsers(): Promise<User[]>
    async searchUsers(term: string): Promise<User[]>
    async findUsersByRole(role: UserRole): Promise<User[]>
    async getUserStats(): Promise<UserStats>
}
```

#### **❌ What Repositories DON'T Do:**
```typescript
// NO SCHEMA MANAGEMENT
// ❌ async createTable(): Promise<void>
// ❌ async alterTable(): Promise<void>
// ❌ async dropTable(): Promise<void>
```

---

## 📊 **Migration Status Tracking**

### **Check Current Status:**
```bash
npm run migrate:status
```

**Example Output:**
```json
[
  {
    "migration_name": "create_users_table",
    "executed_at": "2025-08-14T12:00:00.000Z"
  },
  {
    "migration_name": "create_login_logs_table", 
    "executed_at": "2025-08-14T12:00:01.000Z"
  },
  {
    "migration_name": "create_token_blacklist_table",
    "executed_at": "2025-08-14T12:00:02.000Z"
  }
]
```

---

## 🚨 **Common Migration Scenarios**

### **1. Adding New Table:**
```bash
npm run migrate:create create_notifications_table
```

**Generated file structure:**
```typescript
import { pool } from '../config/database';

export class CreateNotificationsTableMigration {
    async up(): Promise<void> {
        console.log('🔧 Executing migration: create_notifications_table');
        
        const queries = [
            `CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                read_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
            `CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read_at)`
        ];

        for (const query of queries) {
            await pool.query(query);
        }

        console.log('✅ Migration create_notifications_table completed');
    }

    async down(): Promise<void> {
        console.log('🔄 Rolling back migration: create_notifications_table');
        
        const queries = [
            `DROP INDEX IF EXISTS idx_notifications_unread`,
            `DROP INDEX IF EXISTS idx_notifications_user`,
            `DROP TABLE IF EXISTS notifications CASCADE`
        ];

        for (const query of queries) {
            await pool.query(query);
        }

        console.log('✅ Rollback create_notifications_table completed');
    }
}
```

### **2. Adding New Column:**
```bash
npm run migrate:create add_user_phone_verification
```

```typescript
const queries = [
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verification_code VARCHAR(6)`,
    `CREATE INDEX IF NOT EXISTS idx_users_phone_verified ON users(phone_verified)`
];
```

### **3. Modifying Existing Column:**
```bash
npm run migrate:create extend_user_mobile_length
```

```typescript
const queries = [
    `ALTER TABLE users ALTER COLUMN mobile TYPE VARCHAR(15)`,
    `UPDATE users SET mobile = LPAD(mobile, 10, '0') WHERE LENGTH(mobile) < 10`
];
```

### **4. Adding Performance Indexes:**
```bash
npm run migrate:create add_search_indexes
```

```typescript
const queries = [
    `CREATE INDEX IF NOT EXISTS idx_users_name_search ON users USING gin(to_tsvector('english', name))`,
    `CREATE INDEX IF NOT EXISTS idx_users_email_search ON users(email)`,
    `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)`
];
```

---

## 🛡️ **Safety Guidelines**

### **✅ Safe Practices:**

1. **Always Use Transactions** for multiple operations
2. **Test Rollbacks** before applying to production
3. **Backup Database** before major changes
4. **Use IF NOT EXISTS** for new objects
5. **Use IF EXISTS** for cleanup operations

### **⚠️ Dangerous Operations:**

1. **Dropping Columns** - Can cause data loss
2. **Changing Data Types** - May cause conversion errors
3. **Removing Indexes** - Can impact performance
4. **Foreign Key Changes** - Can break relationships

### **🔒 Production Migration Checklist:**

- [ ] Migration tested in development
- [ ] Rollback tested and working
- [ ] Database backup created
- [ ] Performance impact assessed
- [ ] Team notified of deployment
- [ ] Monitoring in place

---

## 🎯 **Troubleshooting**

### **Common Issues:**

#### **Migration Hangs:**
```bash
# If migration seems stuck
# Check PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log

# Check active connections
SELECT * FROM pg_stat_activity WHERE datname = 'your_app_name';
```

#### **Rollback Failed:**
```bash
# Manual rollback if needed
psql -d your_app_name -c "DELETE FROM migrations WHERE migration_name = 'failed_migration'"
```

#### **Connection Issues:**
```bash
# Test database connection
psql -h localhost -p 5432 -U postgres -d your_app_name
```

---

## 🚀 **Advanced Usage**

### **Custom Migration Scripts:**

#### **Data Migration:**
```typescript
// For migrating existing data
const queries = [
    `UPDATE users SET role = 'admin' WHERE email IN ('admin@example.com')`,
    `INSERT INTO user_preferences (user_id, theme, notifications) 
     SELECT id, 'dark', true FROM users WHERE preferences IS NULL`
];
```

#### **Complex Schema Changes:**
```typescript
// For complex operations requiring multiple steps
await pool.query('BEGIN');
try {
    await pool.query(`CREATE TABLE users_backup AS SELECT * FROM users`);
    await pool.query(`ALTER TABLE users ADD COLUMN new_field VARCHAR(255)`);
    await pool.query(`UPDATE users SET new_field = 'default_value'`);
    await pool.query(`DROP TABLE users_backup`);
    await pool.query('COMMIT');
} catch (error) {
    await pool.query('ROLLBACK');
    throw error;
}
```

---

## 🎉 **Summary**

Your database management system now follows enterprise-grade practices:

- ✅ **Version-controlled schema** changes
- ✅ **Safe rollback** capability  
- ✅ **Professional separation** of concerns
- ✅ **Production-ready** workflow
- ✅ **Team collaboration** friendly

**This is the same approach used by companies like Netflix, Google, and Facebook!** 🏆
