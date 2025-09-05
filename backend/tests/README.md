# 🧪 Music Dashboard Backend Tests

Simple, effective testing framework for the Music Dashboard API using Node.js built-in test runner.

## 🚀 Quick Start

```bash
# Start your server first
npm start

# Run all tests
npm test

# Run specific test suites
npm run test:api      # API endpoint tests
npm run test:services # Service layer tests  
npm run test:db       # Database tests

# Run in watch mode (re-run on file changes)
npm run test:watch
```

## 📁 Test Structure

```
tests/
├── api/              # HTTP API endpoint tests
│   ├── health.test.js    # Server health & status
│   ├── music.test.js     # Music data endpoints
│   └── sync.test.js      # Music sync functionality
├── services/         # Service layer tests
│   └── musicSync.test.js # Music sync service logic
├── db/              # Database layer tests
│   └── connection.test.js # Database connections
└── utils/           # Test utilities
    ├── testHelpers.js    # Common test functions
    ├── test.config.js    # Test configuration
    └── run-tests.js      # Custom test runner
```

## 🔧 Configuration

### Environment Variables

```bash
# Server configuration
TEST_BASE_URL=http://localhost:3001  # API server URL
TEST_TIMEOUT=5000                    # Request timeout in ms

# Database configuration (optional)
TEST_DATABASE_URL=postgresql://...   # Separate test database
```

### Test Behavior

- **Database Tests**: Will skip gracefully if database is unavailable
- **API Tests**: Will wait for server to be ready before running
- **Service Tests**: Test business logic without external dependencies
- **Sync Tests**: May fail if API credentials aren't configured (expected)

## 📊 What Gets Tested

### 🏥 Health & Status
- ✅ Server startup and basic endpoints
- ✅ Database connectivity and health
- ✅ Configuration status (timezone, counts)

### 🎵 Music Data APIs
- ✅ Top artists/albums/tracks endpoints
- ✅ Recent tracks with proper sorting
- ✅ Period filtering (7d, 1m, 3m, 6m, 1y, overall)
- ✅ Search functionality
- ✅ Analytics data (daily plays)
- ✅ Response structure validation

### 🔄 Music Sync System
- ✅ Sync method switching (Spotify ↔ Last.fm)
- ✅ Manual sync triggers
- ✅ Fallback mechanism testing
- ✅ Service initialization and status

### 💾 Database Layer
- ✅ Connection pool management
- ✅ Query execution and error handling
- ✅ Concurrent connection handling
- ✅ Connection health monitoring

## 🎯 Test Philosophy

### **Keep It Simple**
- Uses Node.js built-in test runner (no external frameworks)
- Focuses on high-level behavior, not implementation details
- Clear pass/fail criteria with meaningful error messages

### **Real Environment Testing**
- Tests against actual running server
- Uses real database connections (when available)
- Validates actual HTTP responses and JSON structures

### **Graceful Degradation**
- Tests skip gracefully when dependencies unavailable
- Clear warnings for expected failures (missing credentials, etc.)
- Distinguishes between real failures and configuration issues

## 🏃‍♂️ Running Tests

### Basic Usage
```bash
# Run all tests
npm test

# Run with verbose output
node tests/run-tests.js --verbose

# Run specific test category
npm run test:api
npm run test:services
npm run test:db
```

### Watch Mode
```bash
# Auto-rerun tests when files change
npm run test:watch

# Watch specific category
node tests/run-tests.js --api --watch
```

### Advanced Usage
```bash
# Test against different server
TEST_BASE_URL=http://localhost:4001 npm test

# Increase timeout for slow environments
TEST_TIMEOUT=10000 npm test

# Run with custom test database
TEST_DATABASE_URL=postgresql://localhost/test_db npm test
```

## 🔍 Understanding Test Output

### ✅ **Success Indicators**
- `✅ Server is ready` - API server responding
- `✅ Database health check passed` - Database connected
- `✅ Retrieved X items` - Data endpoints working
- `✅ Sync completed` - Music sync functioning

### ⚠️ **Expected Warnings**
- `⚠️ No data found - database may be empty` - Normal for fresh installs
- `⚠️ Spotify not configured` - Normal without API tokens
- `⚠️ Sync failed - may need configuration` - Normal without credentials

### ❌ **Real Failures**
- Network connection errors
- Invalid response structures  
- Server crashes or timeouts
- Database connection failures

## 🛠️ Extending Tests

### Adding New API Tests
```javascript
// tests/api/myFeature.test.js
import { describe, test, before } from 'node:test';
import { TestClient, assertValidResponse } from '../utils/testHelpers.js';

describe('My Feature API', () => {
  let client;

  before(async () => {
    client = new TestClient();
  });

  test('should handle my endpoint', async () => {
    const response = await client.get('/api/my-endpoint');
    assertValidResponse(response, 200);
    
    const data = await response.json();
    // Add your assertions here
  });
});
```

### Adding Service Tests
```javascript
// tests/services/myService.test.js
import { test } from 'node:test';
import { assert } from '../utils/testHelpers.js';
import MyService from '../../src/services/myService.js';

test('should create service instance', () => {
  const service = new MyService();
  assert.ok(service, 'Service should be created');
});
```

## 📈 Test Coverage

Focus areas for testing:
- **✅ Critical user flows** (data retrieval, search, sync)
- **✅ Error handling** (invalid inputs, network failures)  
- **✅ API contracts** (response structures, status codes)
- **✅ Integration points** (database, external APIs)

Not covered (intentionally):
- Unit testing of individual functions
- Mocking of external services
- Complex test fixtures or database seeding
- Performance/load testing

This keeps the test suite simple, maintainable, and focused on preventing regressions in core functionality.