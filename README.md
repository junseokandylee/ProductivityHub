# ProductivityHub - Political Campaign Management Platform

A comprehensive web-based platform for political campaigns to manage 100K+ voter outreach through SMS and messaging services with real-time analytics and performance tracking.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![.NET](https://img.shields.io/badge/.NET-9.0-purple.svg)
![Next.js](https://img.shields.io/badge/Next.js-15.0-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

## ✨ Features

### 🏛️ Campaign Management
- **Multi-tenant Architecture** - Secure tenant isolation with role-based access control
- **Contact Management** - Manage 100K+ contacts with encrypted PII data protection
- **Campaign Creation** - Create and manage messaging campaigns with analytics
- **Tag-based Organization** - Flexible contact categorization and filtering

### 🔒 Security & Privacy
- **AES-256 Encryption** - PII data protection with searchable hashing (SHA-256)
- **JWT Authentication** - Secure authentication with BCrypt password hashing
- **OWASP Compliance** - Built following security best practices
- **Data Protection** - GDPR-ready data handling and encryption

### 📊 Analytics & Performance  
- **Real-time Analytics** - Campaign performance tracking and metrics
- **Performance Monitoring** - <150ms P95 response time targets
- **Comprehensive Logging** - Structured logging with performance insights
- **Export Capabilities** - CSV/Excel export with background processing

### 🚀 Enterprise Scale
- **100K+ Contact Support** - Optimized for large-scale political campaigns
- **Background Processing** - Redis Streams for async job processing
- **Database Performance** - Optimized queries and indexing strategies
- **Scalable Architecture** - Clean architecture with CQRS pattern

## 🏗️ Architecture

```
ProductivityHub/
├── frontend/                 # Next.js 15 Frontend
│   ├── src/
│   │   ├── app/             # Next.js App Router
│   │   ├── components/      # Reusable UI components  
│   │   └── lib/             # Utilities and API clients
│   ├── public/              # Static assets
│   └── package.json
├── backend/                 # .NET 9 Backend API
│   ├── ProductivityHub.Api/ # Main API project
│   │   ├── Controllers/     # API controllers
│   │   ├── Services/        # Business logic services
│   │   ├── Models/          # Data models
│   │   └── Data/            # Database context
│   ├── Tests/               # Unit and integration tests
│   └── ProductivityHub.sln  # Solution file
├── docs/                    # Project documentation
├── api-validation.sh        # API endpoint testing script
└── README.md
```

## 🛠️ Technology Stack

### Frontend
- **[Next.js 15](https://nextjs.org)** - React framework with App Router
- **[TypeScript](https://www.typescriptlang.org)** - Type safety and development experience
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[Shadcn UI](https://ui.shadcn.com)** - Modern component library
- **[React Hook Form](https://react-hook-form.com)** - Form validation and handling

### Backend  
- **[.NET 9](https://dotnet.microsoft.com)** - High-performance web API
- **[Entity Framework Core](https://docs.microsoft.com/ef/)** - ORM with PostgreSQL support
- **[MediatR](https://github.com/jbogard/MediatR)** - CQRS implementation
- **[JWT Bearer](https://jwt.io)** - Authentication and authorization
- **[Redis](https://redis.io)** - Caching and background job processing
- **[Swagger/OpenAPI](https://swagger.io)** - API documentation

### Database & Infrastructure
- **[PostgreSQL](https://www.postgresql.org)** - Primary database (production)
- **In-Memory Database** - Development environment (no Docker required)
- **[Redis](https://redis.io)** - Background processing and caching
- **Performance Monitoring** - Built-in metrics and health checks

## 🚀 Quick Start

### Prerequisites
- **[.NET 9 SDK](https://dotnet.microsoft.com/download/dotnet/9.0)** 
- **[Node.js 18+](https://nodejs.org)** and npm/yarn
- **[Git](https://git-scm.com)**

### 1. Clone Repository
```bash
git clone https://github.com/junseokandylee/ProductivityHub.git
cd ProductivityHub
```

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend/ProductivityHub.Api

# Restore dependencies
dotnet restore

# Start development server (uses in-memory database)
dotnet run
```

The backend will start at `http://localhost:5284` with:
- ✅ **Swagger UI**: http://localhost:5284/swagger
- ✅ **Health Check**: http://localhost:5284/health  
- ✅ **Database**: Automatically seeded with test data
- ✅ **Authentication**: admin@test.com / Password123!

### 3. Frontend Setup
```bash
# Navigate to frontend directory (in new terminal)
cd frontend

# Install dependencies  
npm install

# Start development server
npm run dev
```

The frontend will start at `http://localhost:13000`

### 4. Verify Setup
```bash
# Run API validation tests
chmod +x api-validation.sh
./api-validation.sh
```

Expected output:
```
🧪 ProductivityHub API Validation
1. Swagger UI... ✅ PASS
2. Swagger JSON... ✅ PASS  
3. Health Check... ✅ PASS
4. Login API... ✅ PASS
5. Protected API... ✅ PASS

🚀 ProductivityHub is fully operational!
```

## 📋 Development Workflow

### Test Credentials
- **Email**: admin@test.com
- **Password**: Password123!
- **Role**: Owner (full access)

### API Documentation
- **Swagger UI**: http://localhost:5284/swagger
- **OpenAPI JSON**: http://localhost:5284/swagger/v1/swagger.json

### Database
Development mode uses an in-memory database that automatically seeds with:
- **3 tenants** with different configurations
- **15 users** across all roles (Owner, Admin, Manager, User)
- **90 tags** for contact organization
- **3,166+ contacts** with realistic Korean political data
- **26+ campaigns** with various statuses and analytics

### Key Endpoints
```bash
# Authentication
POST /auth/login         # User login
POST /auth/register      # User registration

# Contacts
GET  /api/contacts       # List contacts (paginated)
POST /api/contacts       # Create contact
GET  /api/contacts/{id}  # Get contact details

# Campaigns  
GET  /api/campaigns      # List campaigns
POST /api/campaigns      # Create campaign

# Tags
GET  /api/tags           # List all tags
POST /api/tags           # Create new tag
```

## 🔧 Configuration

### Environment Variables

#### Backend (.NET)
```bash
# Database (Development uses in-memory, Production uses PostgreSQL)
ConnectionStrings__DefaultConnection=Host=localhost;Database=ProductivityHub;Username=postgres;Password=yourpassword

# JWT Configuration
JwtConfiguration__SecretKey=your-super-secret-jwt-key-here
JwtConfiguration__Issuer=political-productivity-hub
JwtConfiguration__ExpiryHours=24

# Redis (Optional for development)
Redis__ConnectionString=localhost:6379
```

#### Frontend (Next.js)
```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:5284

# Optional: Environment-specific settings
NEXT_PUBLIC_APP_ENV=development
```

### Production Deployment

#### Backend
```bash
# Build production version
dotnet publish -c Release -o ./publish

# Set production environment
export ASPNETCORE_ENVIRONMENT=Production

# Configure production database
export ConnectionStrings__DefaultConnection="Host=your-db-host;Database=ProductivityHub;Username=user;Password=pass"
```

#### Frontend
```bash
# Build static export
npm run build
npm run export

# Deploy static files to CDN/hosting service
```

## 🧪 Testing

### API Testing
```bash
# Run comprehensive API tests
./api-validation.sh

# Test specific endpoints
curl -X POST http://localhost:5284/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"Password123!"}'
```

### Unit Tests
```bash
# Run backend unit tests
cd backend
dotnet test

# Run frontend tests
cd frontend  
npm test
```

### Performance Testing
The application includes built-in performance monitoring with:
- **P95 Response Time Target**: <150ms
- **Memory Usage Tracking**: GC and allocation monitoring
- **Request Tracing**: Detailed performance metrics
- **Health Checks**: Automated system health validation

## 📊 Performance Metrics

### Development Environment
- **Database**: In-memory for instant startup
- **Response Times**: <50ms average API response
- **Memory Usage**: ~100MB backend + ~200MB frontend dev server
- **Startup Time**: <5 seconds for both services

### Production Targets
- **Response Time**: P95 <150ms, P99 <500ms
- **Throughput**: 1000+ requests/second
- **Uptime**: 99.9% availability target
- **Scale**: 100K+ contacts, 10K+ concurrent users

## 🔒 Security Features

### Data Protection
- **PII Encryption**: AES-256 encryption for sensitive contact data
- **Searchable Hashing**: SHA-256 hashing for encrypted field search
- **Password Security**: BCrypt hashing with salt rounds
- **JWT Security**: RSA-256 signed tokens with expiration

### Access Control
- **Multi-tenant Isolation**: Complete tenant data separation
- **Role-based Access**: Owner > Admin > Manager > User hierarchy  
- **API Authorization**: JWT-based endpoint protection
- **CORS Configuration**: Production-ready CORS policies

## 🤝 Contributing

1. **Fork** the repository
2. **Create** feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** changes (`git commit -m 'Add amazing feature'`)
4. **Push** to branch (`git push origin feature/amazing-feature`)
5. **Open** Pull Request

### Development Guidelines
- Follow existing code style and patterns
- Add comprehensive tests for new features
- Update documentation for API changes
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/junseokandylee/ProductivityHub/issues)
- **Documentation**: Check `/docs` directory for detailed guides
- **API Reference**: http://localhost:5284/swagger (when running locally)

## 🚀 What's Next

- [ ] Production PostgreSQL deployment guide
- [ ] Docker containerization support
- [ ] CI/CD pipeline configuration
- [ ] Monitoring and alerting setup
- [ ] Load testing and performance optimization
- [ ] Mobile-responsive UI enhancements
- [ ] Advanced analytics and reporting features
- [ ] Multi-language support (Korean/English)

---

**Built with ❤️ for political campaign management and voter engagement**

🏛️ **Optimized for Korean political campaigns** - Supports Hangul, Korean political structures, and local compliance requirements.

⚡ **Performance-First** - Designed to handle the scale and speed requirements of modern political campaigns.

🔐 **Security-Focused** - Built with political data protection and privacy regulations in mind.