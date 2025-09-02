# Environment Configuration & Secret Management Guide

## 📋 Overview

This guide documents the environment configuration and secret management system for the Political Productivity Hub (정치생산성허브) project. This system provides secure, scalable, and maintainable configuration management across all environments.

## 🏗️ Architecture

### Configuration Hierarchy

1. **Environment Variables** (Highest Priority)
2. **`.env` Files** (Medium Priority)
3. **`appsettings.json`** (Lowest Priority)

### Environment Types

| Environment | Purpose | Security Level | Configuration Files |
|-------------|---------|----------------|-------------------|
| **Local** | Individual developer machines | Low | `.env.local`, `.env.local.example` |
| **Development** | Shared development/staging | Medium | `.env.development`, `.env.development.example` |
| **Production** | Live production environment | High | Environment variables only |

## 🔒 Security Guidelines

### ⚠️ CRITICAL SECURITY RULES

1. **NEVER commit actual secrets to version control**
2. **Use `.example` files as templates only**
3. **Production secrets MUST use environment variables or secret managers**
4. **Frontend: Only `NEXT_PUBLIC_` variables are exposed to browsers**
5. **Backend: All sensitive data should come from environment variables**

### Secret Classification

| Type | Security Level | Storage Method |
|------|---------------|----------------|
| **Database Passwords** | 🔴 Critical | Environment variables / Secret manager |
| **JWT Secrets** | 🔴 Critical | Environment variables / Secret manager |
| **API Keys (Private)** | 🟠 High | Environment variables / Secret manager |
| **API Keys (Public)** | 🟡 Medium | Can be in frontend env (NEXT_PUBLIC_) |
| **Feature Flags** | 🟢 Low | Configuration files / Environment variables |

## 📁 File Structure

```
├── .env.example                    # General template
├── .env.local.example             # Local development template
├── .env.development.example       # Development environment template
├── .env.production.example        # Production template (no actual secrets)
├── .env                          # Global environment variables
├── .env.local                    # Local overrides (gitignored)
├── .env.development              # Development environment (gitignored)
├── backend/
│   └── ProductivityHub.Api/
│       ├── appsettings.json      # Base configuration
│       ├── appsettings.Development.json
│       └── Configuration/        # Strongly-typed config classes
└── frontend/
    ├── .env.example
    ├── .env.local.example
    ├── .env.development.example
    └── .env.production.example
```

## 🔧 Backend Configuration

### Configuration Classes

The backend uses strongly-typed configuration classes:

- `DatabaseConfiguration` - Database connection and settings
- `RedisConfiguration` - Redis connection and settings
- `JwtConfiguration` - JWT authentication settings
- `ExternalApiConfiguration` - SMS/Kakao API settings
- `SecurityConfiguration` - Security headers and rate limiting
- `ApplicationConfiguration` - General application settings

### Usage Example

```csharp
public class MyService
{
    private readonly IConfigurationService _config;
    
    public MyService(IConfigurationService config)
    {
        _config = config;
    }
    
    public void DoSomething()
    {
        var dbConnection = _config.GetConnectionString();
        var jwtSecret = _config.Jwt.Secret;
        var isProduction = _config.IsProduction();
    }
}
```

### Configuration Loading Order

1. Environment variables (`DATABASE_CONNECTION_STRING`)
2. `.env` files (`.env`, `.env.development`, `.env.local`)
3. `appsettings.json` files
4. Default values in configuration classes

## 🌐 Frontend Configuration

### Environment Variable Types

#### Public Variables (Exposed to Browser)
```bash
NEXT_PUBLIC_API_URL=https://api.productivity-hub.com
NEXT_PUBLIC_APP_NAME="정치생산성허브"
NEXT_PUBLIC_ENABLE_DEBUG=false
```

#### Private Variables (Server-side Only)
```bash
# These are NOT exposed to the browser
SMTP_PASSWORD=secret-password
INTERNAL_API_KEY=secret-key
```

### Usage Example

```typescript
// ✅ Safe - Public variable
const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// ❌ Unsafe - Private variable exposed to browser
const secretKey = process.env.SECRET_KEY; // undefined in browser

// ✅ Safe - Server-side only
export async function getServerSideProps() {
  const secretKey = process.env.SECRET_KEY; // Available on server
  return { props: {} };
}
```

## 🚀 Environment Setup

### 1. Local Development Setup

```bash
# Copy templates
cp .env.local.example .env.local
cp backend/ProductivityHub.Api/appsettings.Development.json.example backend/ProductivityHub.Api/appsettings.Development.json
cp frontend/.env.local.example frontend/.env.local

# Edit with your local values
nano .env.local
nano frontend/.env.local
```

### 2. Development Environment Setup

```bash
# Copy development templates
cp .env.development.example .env.development
cp frontend/.env.development.example frontend/.env.development

# Configure with development server values
# Use development database, Redis, and API keys
```

### 3. Production Environment Setup

```bash
# Set environment variables directly
export DATABASE_CONNECTION_STRING="production-connection-string"
export JWT_SECRET="super-strong-production-jwt-secret"
export REDIS_CONNECTION_STRING="production-redis-connection"
export SMS_API_KEY="production-sms-key"
export KAKAO_API_KEY="production-kakao-key"

# Or use your cloud provider's secret management
# AWS Secrets Manager, Azure Key Vault, etc.
```

## 🔐 Secret Management Best Practices

### For Development Teams

1. **Use `.example` files as templates**
   - Copy `.example` files to actual `.env` files
   - Never commit actual `.env` files with secrets

2. **Share non-sensitive configuration**
   - Update `.example` files when adding new configuration
   - Document configuration changes in pull requests

3. **Keep secrets separate**
   - Store actual secrets in team password manager
   - Use development/staging secrets for non-production environments

### For Production Deployment

1. **Use Secret Management Services**
   ```bash
   # AWS Secrets Manager
   aws secretsmanager get-secret-value --secret-id prod/productivity-hub/database-password
   
   # Azure Key Vault
   az keyvault secret show --vault-name ProductivityHub --name DatabasePassword
   
   # Environment variables in Docker/Kubernetes
   kubectl create secret generic app-secrets --from-literal=JWT_SECRET=your-secret
   ```

2. **Environment Variable Injection**
   ```dockerfile
   # Dockerfile - secrets injected at runtime
   ENV JWT_SECRET=""
   ENV DATABASE_CONNECTION_STRING=""
   ```

3. **CI/CD Pipeline Integration**
   ```yaml
   # GitHub Actions example
   - name: Deploy to Production
     env:
       JWT_SECRET: ${{ secrets.JWT_SECRET }}
       DATABASE_CONNECTION_STRING: ${{ secrets.DATABASE_CONNECTION_STRING }}
   ```

## 🧪 Testing Configuration

### Validation

The backend automatically validates configuration on startup:

```csharp
public void ValidateConfiguration()
{
    // Validates required secrets
    // Checks production security settings
    // Warns about development settings in production
}
```

### Testing Different Environments

```bash
# Test local configuration
ASPNETCORE_ENVIRONMENT=Development dotnet run

# Test with specific .env file
cp .env.development.example .env.test
ASPNETCORE_ENVIRONMENT=Test dotnet run

# Test production configuration (without secrets)
ASPNETCORE_ENVIRONMENT=Production \
DATABASE_CONNECTION_STRING="test-connection" \
JWT_SECRET="test-secret-32-characters-long" \
dotnet run
```

## 🔍 Troubleshooting

### Common Issues

1. **"JWT Secret not configured"**
   ```bash
   # Solution: Set the JWT secret
   export JWT_SECRET="your-jwt-secret-at-least-32-characters"
   # Or add to .env.local file
   echo "JWT_SECRET=your-jwt-secret-at-least-32-characters" >> .env.local
   ```

2. **Database connection fails**
   ```bash
   # Check your database configuration
   echo $DATABASE_CONNECTION_STRING
   # Or verify .env file
   cat .env.local | grep DATABASE
   ```

3. **Frontend can't connect to API**
   ```bash
   # Check frontend API URL
   echo $NEXT_PUBLIC_API_URL
   # Should match your backend server URL
   ```

### Debug Configuration Loading

```csharp
// Add to Program.cs for debugging
var configService = serviceProvider.GetRequiredService<IConfigurationService>();
Console.WriteLine($"Environment: {configService.Application.Environment}");
Console.WriteLine($"Database configured: {!string.IsNullOrEmpty(configService.GetConnectionString())}");
Console.WriteLine($"Redis configured: {!string.IsNullOrEmpty(configService.GetRedisConnectionString())}");
```

## 📚 Configuration Reference

### Backend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_CONNECTION_STRING` | Yes | - | PostgreSQL connection string |
| `REDIS_CONNECTION_STRING` | No | - | Redis connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (32+ chars) |
| `JWT_ISSUER` | No | "political-productivity-hub" | JWT issuer |
| `JWT_AUDIENCE` | No | "political-productivity-hub" | JWT audience |
| `JWT_EXPIRES_IN_MINUTES` | No | 1440 | JWT expiration time |
| `SMS_API_KEY` | No | - | SMS provider API key |
| `KAKAO_API_KEY` | No | - | Kakao Talk API key |
| `LOG_LEVEL` | No | "Information" | Logging level |
| `ENABLE_SWAGGER` | No | true | Enable Swagger UI |

### Frontend Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | Backend API URL |
| `NEXT_PUBLIC_APP_NAME` | No | "정치생산성허브" | Application name |
| `NEXT_PUBLIC_ENVIRONMENT` | No | "development" | Environment name |
| `NEXT_PUBLIC_ENABLE_DEBUG` | No | true | Enable debug mode |
| `NEXT_PUBLIC_KAKAO_APP_KEY` | No | - | Kakao public app key |

## 🔄 Migration Guide

### From Old Configuration System

1. **Backup existing configuration**
   ```bash
   cp appsettings.json appsettings.json.backup
   ```

2. **Create .env files from templates**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your current values
   ```

3. **Update application code**
   ```csharp
   // Old way
   var connectionString = Configuration.GetConnectionString("DefaultConnection");
   
   // New way
   var connectionString = configService.GetConnectionString();
   ```

4. **Test configuration loading**
   ```bash
   dotnet run
   # Check logs for "Configuration validation completed successfully"
   ```

## 🎯 Best Practices Summary

### ✅ DO

- Use `.example` files as templates
- Set production secrets via environment variables
- Validate configuration on application startup
- Use strong, unique secrets for each environment
- Document configuration changes
- Use secret management services in production
- Rotate secrets regularly

### ❌ DON'T

- Commit actual secrets to version control
- Use development secrets in production
- Put sensitive data in frontend environment variables
- Use weak or default secrets
- Store secrets in plain text files
- Share production secrets via insecure channels
- Use the same secrets across environments

---

## 🚨 Security Incident Response

If secrets are accidentally committed:

1. **Immediately rotate all affected secrets**
2. **Remove secrets from git history** (use `git filter-branch` or BFG Repo-Cleaner)
3. **Update all environments** with new secrets
4. **Review access logs** for unauthorized usage
5. **Document the incident** and improve processes

---

*For questions or issues, please refer to the project documentation or contact the development team.*