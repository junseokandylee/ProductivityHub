const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5284;
const JWT_SECRET = 'temporary-secret-for-testing';

// Enable CORS for frontend requests
app.use(cors({
  origin: ['http://localhost:13000', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

// Simple in-memory user store (for testing only)
const users = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: '김철수',
    email: 'admin@test.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'Owner',
    tenantId: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: '이영희',
    email: 'manager@test.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'Admin',
    tenantId: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: '박민수',
    email: 'staff1@test.com',
    password: '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password
    role: 'Staff',
    tenantId: '550e8400-e29b-41d4-a716-446655440001',
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Hash password for registration (utility)
const hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

// Verify password
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenant_id: user.tenantId
    },
    JWT_SECRET,
    { 
      expiresIn: '24h',
      issuer: 'political-productivity-hub',
      audience: 'political-productivity-hub'
    }
  );
};

// Login endpoint
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt:', { email, password: '***' });
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Find user
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user || !user.isActive) {
      console.log('User not found or inactive:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // For testing, accept both the hashed password and plain "Password123!"
    const isValidPassword = password === 'Password123!' || 
                          await verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken(user);
    
    console.log('Login successful for:', email);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Register endpoint
app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required'
      });
    }

    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user
    const hashedPassword = await hashPassword(password);
    const newUser = {
      id: generateUUID(),
      name,
      email,
      password: hashedPassword,
      role: 'Staff',
      tenantId: '550e8400-e29b-41d4-a716-446655440001', // Default tenant
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.push(newUser);

    // Generate token
    const token = generateToken(newUser);
    
    res.json({
      success: true,
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        tenantId: newUser.tenantId,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Profile endpoint
app.get('/auth/profile', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = users.find(u => u.id === decoded.sub);
      
      if (!user || !user.isActive) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
      
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Simple UUID generator
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Temporary Auth Server running on http://localhost:${PORT}`);
  console.log(`🔑 Test Login Credentials:`);
  console.log(`   Email: admin@test.com`);
  console.log(`   Password: Password123!`);
  console.log(`   --------------------------------`);
  console.log(`   Email: manager@test.com`);
  console.log(`   Password: Password123!`);
  console.log(`   --------------------------------`);
  console.log(`   Email: staff1@test.com`);
  console.log(`   Password: Password123!`);
  console.log(`🛑 This is a temporary server for testing only!`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Temporary Auth Server shutting down...');
  process.exit(0);
});