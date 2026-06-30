# NOVA - Setup & Configuration Guide

## 🔧 Environment Variables

Create `.env` file:

```env
# Lovable AI Gateway
LOVABLE_API_KEY=your_api_key_here

# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key

# Optional: Performance & Limits
NOVA_RATE_LIMIT_MAX_REQUESTS=30
NOVA_RATE_LIMIT_WINDOW_MS=60000
NOVA_CACHE_TTL_SEARCH_MS=86400000
NOVA_SLOW_OPERATION_THRESHOLD_MS=1000

# Node environment
NODE_ENV=development
VERSION=1.0.0
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Lint
npm run lint

# Format
npm run format
```

## 📦 New Server Libraries

| Librería                  | Propósito                                 |
| ------------------------- | ----------------------------------------- |
| `types.server.ts`         | Tipos compartidos (Message, Thread, etc.) |
| `errors.server.ts`        | Error handling centralizado               |
| `rate-limit.server.ts`    | Rate limiting (in-memory)                 |
| `cache.server.ts`         | Caching con TTL                           |
| `plugin-system.server.ts` | Arquitectura de plugins                   |
| `validation.server.ts`    | Validación con Zod                        |
| `performance.server.ts`   | Medición de performance                   |
| `constants.server.ts`     | Constantes globales                       |
| `middleware.server.ts`    | Composición de middleware                 |
| `async-utils.server.ts`   | Utilidades async (retry, batch, dedupe)   |

## 📋 Database Schema

### Threads Table

```sql
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(120) NOT NULL DEFAULT 'New chat',
  agent_mode BOOLEAN DEFAULT FALSE,
  message_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT user_thread_unique UNIQUE(user_id, id)
);

CREATE INDEX idx_threads_user_updated ON threads(user_id, updated_at DESC);
```

### Messages Table (Append-Only)

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  parts JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_parts CHECK (parts IS NOT NULL)
);

CREATE INDEX idx_messages_thread_created ON messages(thread_id, created_at DESC);
CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);
```

## 🔐 Row Level Security

```sql
-- Enable RLS
ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Threads: Users see only their threads
CREATE POLICY "Users can view own threads" ON threads
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create threads" ON threads
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own threads" ON threads
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own threads" ON threads
  FOR DELETE USING (user_id = auth.uid());

-- Messages: Users see only messages in their threads
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM threads WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

## 🧪 Testing

```bash
# Run all tests
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## 🔍 Common Operations

### Get Configuration Value

```typescript
import { getConfigValue } from "@/lib/constants.server";

const maxRequests = getConfigValue("RATE_LIMIT_MAX_REQUESTS");
const cacheTtl = getConfigValue("CACHE_TTL_SEARCH_MS");
```

### Add Custom Plugin

```typescript
import { registerPlugin } from "@/lib/plugin-system.server";

registerPlugin({
  name: "custom_tool",
  description: "Does something custom",
  enabled: (agentMode) => agentMode,
  create: () => tool({ ... }),
});
```

### Use Validation

```typescript
import { validateInput, ChatRequestSchema } from "@/lib/validation.server";

const validated = validateInput(ChatRequestSchema, req.body);
```

### Measure Performance

```typescript
import { measureAsyncTime } from "@/lib/performance.server";

const duration = await measureAsyncTime("my_operation", async () => {
  await someAsyncTask();
});
```

### Error Handling

```typescript
import { Errors, createErrorResponse } from "@/lib/errors.server";

try {
  if (!valid) throw Errors.validation("Invalid input", { field: "email" });
} catch (error) {
  return createErrorResponse(error);
}
```

### Retry & Batch Operations

```typescript
import { retry, batch } from "@/lib/async-utils.server";

// Retry with exponential backoff
const data = await retry(() => fetchData(), 3, 100);

// Batch concurrent operations
const results = await batch([() => task1(), () => task2(), () => task3()], 2); // Max 2 concurrent
```

## 📊 Health Monitoring

```bash
# Check server health
curl http://localhost:5173/api/health

# Response:
{
  "status": "healthy",
  "timestamp": "2026-06-30T...",
  "version": "1.0.0",
  "uptime": 3600,
  "memory": {
    "heapUsed": 150,
    "heapTotal": 512,
    "external": 8
  },
  "metrics": [...],
  "environment": "development"
}
```

## 🛡️ Security Checklist

- [x] Valida todos los inputs
- [x] RLS en base de datos
- [x] Rate limiting por usuario
- [x] CORS configurado
- [x] Error handling sin leaks
- [ ] HTTPS en producción
- [ ] Encripción de datos sensibles
- [ ] Audit logging
- [ ] Backup automático

## 🚨 Troubleshooting

### Rate Limiting

Si obtienes 429 (Too Many Requests):

- Espera el tiempo en `X-RateLimit-Reset-In` header
- Aumenta `NOVA_RATE_LIMIT_MAX_REQUESTS` si es necesario

### Cache Issues

Para limpiar todo el cache:

```typescript
import { invalidate } from "@/lib/cache.server";
invalidate(); // Clear all
```

### Performance Problems

Ver metrics:

```typescript
import { getMetrics } from "@/lib/performance.server";
console.log(getMetrics());
```

## 📞 Support

Consulta `/IMPROVEMENTS.md` para una lista completa de cambios y features.
