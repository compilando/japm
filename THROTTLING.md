# Rate Limiting / Throttling Configuration

## 🚨 Current Status: DISABLED

El rate limiting está **temporalmente deshabilitado** para permitir el desarrollo fluido de la UX.

## 📍 Estado Actual

- ✅ Rate limiting **DESHABILITADO** para desarrollo
- ✅ UX funciona sin restricciones 429
- ✅ Navegación fluida sin errores de throttling

## 🔧 Cómo Habilitar Rate Limiting

Para rehabilitar el rate limiting (recomendado para producción):

### 1. Descomentar imports en `src/app.module.ts`

```typescript
// Cambiar esto:
// TEMPORALMENTE COMENTADO - THROTTLING DESHABILITADO
// import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// Por esto:
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
```

### 2. Descomentar configuración del módulo

En `src/app.module.ts`, descomentar toda la sección:

```typescript
// Descomentar todo el bloque de ThrottlerModule.forRootAsync({...})
```

### 3. Descomentar el guard global

```typescript
// Descomentar en providers:
{
  provide: APP_GUARD,
  useClass: ThrottlerGuard,
}
```

## ⚙️ Configuración de Límites

Los límites están configurados para ser muy permisivos:

| Operación | Límite | Ventana | Descripción |
|-----------|--------|---------|-------------|
| General | 500 req/min | 60s | Muy permisivo para UX |
| Lectura | 500 req/min | 60s | Navegación fluida |
| Creación | 100 req/min | 60s | Operaciones CRUD |
| LLM/AI | 50 req/min | 60s | Control de costos |
| Auth | 20 attempts | 15min | Seguridad moderada |

## 🧪 Testing

Una vez habilitado, usar:

```bash
node test-rate-limiting.js
```

## 🚀 Para Producción

1. Habilitar throttling siguiendo pasos arriba
2. Configurar variables de entorno:
   ```bash
   THROTTLE_ENABLED=true
   THROTTLE_FORCE_IN_DEV=true  # Para testing
   ```
3. Ajustar límites según necesidades

## 🐛 Troubleshooting

Si al habilitar aparecen errores 429:

1. Verificar que los límites son suficientemente altos
2. Revisar logs del servidor para identificar endpoints problemáticos
3. Aumentar límites específicos usando decoradores:
   - `@ThrottleRead()` para endpoints de lectura
   - `@ThrottleCreation()` para operaciones CRUD
   - `@ThrottleLLM()` para operaciones AI

## 📝 Notas

- El throttling se deshabilita automáticamente en desarrollo si `NODE_ENV=development`
- Los decoradores en controladores siguen aplicándose si están presentes
- Para desarrollo sin restricciones, mantener la configuración actual 