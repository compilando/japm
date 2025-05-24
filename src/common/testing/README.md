# 🧪 Guía de Tests Unitarios - JAPM

Esta documentación proporciona las mejores prácticas para implementar tests unitarios en el proyecto JAPM.

## 📋 Índice

- [Estructura de Tests](#estructura-de-tests)
- [Servicios Priorizados](#servicios-priorizados)
- [Patrones de Testing](#patrones-de-testing)
- [Configuración de Mocks](#configuración-de-mocks)
- [Comandos de Testing](#comandos-de-testing)
- [Convenciones de Naming](#convenciones-de-naming)

## 📁 Estructura de Tests

### Organización de Archivos
```
src/
├── [module]/
│   ├── tests/
│   │   ├── [module].service.spec.ts
│   │   ├── [module].controller.spec.ts
│   │   └── integration/
│   │       └── [module].integration.spec.ts
│   ├── [module].service.ts
│   └── [module].controller.ts
```

### Estándar de Naming
- **Tests unitarios**: `*.service.spec.ts`, `*.controller.spec.ts`
- **Tests de integración**: `*.integration.spec.ts`
- **Tests E2E**: `*.e2e-spec.ts` (en carpeta `test/`)

## 🎯 Servicios Priorizados

### 🔴 Prioridad Alta (Críticos)
1. **PromptService** - Lógica de negocio principal
2. **TenantService** - Seguridad y multi-tenancy
3. **ProjectService** - Gestión de proyectos
4. **LlmExecutionService** - Integración con APIs de IA

### 🟡 Prioridad Media
5. **ServePromptService** - Resolución de prompts
6. **UserService** - Gestión de usuarios
7. **TagService** - Gestión de tags
8. **EnvironmentService** - Gestión de ambientes

### 🟢 Prioridad Baja
9. **RegionService**, **CulturalDataService**, etc.

## 🧩 Patrones de Testing

### 1. Estructura AAA (Arrange-Act-Assert)
```typescript
it('should create a prompt successfully', async () => {
  // Arrange
  const mockData = { id: 'test', name: 'Test' };
  (service.dependency.method as jest.Mock).mockResolvedValue(mockData);

  // Act
  const result = await service.create(inputDto);

  // Assert
  expect(result).toEqual(expectedOutput);
  expect(service.dependency.method).toHaveBeenCalledWith(expectedArgs);
});
```

### 2. Mocking de Servicios Externos
```typescript
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ServiceUnderTest,
      {
        provide: ExternalService,
        useValue: {
          method1: jest.fn(),
          method2: jest.fn(),
        },
      },
    ],
  }).compile();
});
```

### 3. Manejo de Errores
```typescript
it('should throw NotFoundException when resource not found', async () => {
  // Arrange
  (dependency.find as jest.Mock).mockResolvedValue(null);

  // Act & Assert
  await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
});
```

## 🎭 Configuración de Mocks

### PrismaService Mock
```typescript
{
  provide: PrismaService,
  useValue: {
    $transaction: jest.fn(),
    [model]: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}
```

### ConfigService Mock
```typescript
{
  provide: ConfigService,
  useValue: {
    get: jest.fn().mockImplementation((key) => {
      const config = {
        'DATABASE_URL': 'test-db-url',
        'JWT_SECRET': 'test-secret',
        'OPENAI_API_KEY': 'test-openai-key',
      };
      return config[key];
    }),
  },
}
```

### APIs Externas (LangChain)
```typescript
jest.mock('@langchain/openai', () => ({
  ChatOpenAI: jest.fn().mockImplementation(() => ({
    invoke: jest.fn().mockResolvedValue({ content: 'Mock response' }),
  })),
}));
```

## ⚗️ Casos de Test Esenciales

### Para cada servicio, cubrir:

#### ✅ Happy Path
- Creación exitosa
- Búsqueda exitosa
- Actualización exitosa
- Eliminación exitosa

#### ❌ Error Handling
- Recursos no encontrados (NotFoundException)
- Conflictos de unicidad (ConflictException)
- Validación de datos (BadRequestException)
- Errores de base de datos
- Errores de APIs externas

#### 🔒 Edge Cases
- Valores límite
- Datos malformados
- Dependencias faltantes
- Estados inconsistentes

## 🚀 Comandos de Testing

```bash
# Ejecutar todos los tests unitarios
npm run test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con coverage
npm run test:cov

# Ejecutar tests específicos
npm run test -- --testNamePattern="PromptService"

# Ejecutar tests de un archivo
npm run test -- src/prompt/tests/prompt.service.spec.ts

# Tests con verbose output
npm run test -- --verbose
```

## 📊 Cobertura de Tests

### Objetivos de Cobertura
- **Servicios críticos**: ≥ 90%
- **Servicios regulares**: ≥ 80%
- **Utilities/Helpers**: ≥ 70%

### Generar Reporte
```bash
npm run test:cov
open coverage/lcov-report/index.html
```

## 🎨 Convenciones de Naming

### Describe Blocks
```typescript
describe('ServiceName', () => {
  describe('methodName', () => {
    it('should perform action when condition', async () => {
      // test implementation
    });
    
    it('should throw ErrorType when invalid condition', async () => {
      // error test
    });
  });
});
```

### Test Names
- ✅ `should create user when valid data provided`
- ✅ `should throw NotFoundException when user not found`
- ✅ `should return empty array when no resources exist`
- ❌ `test user creation`
- ❌ `error case`

## 🔧 Utilidades de Testing

### Factories para Mock Data
```typescript
// src/common/testing/factories/prompt.factory.ts
export const createMockPrompt = (overrides = {}) => ({
  id: 'prompt-1',
  name: 'Test Prompt',
  type: 'SYSTEM',
  projectId: 'project-1',
  tenantId: 'tenant-1',
  ...overrides,
});
```

### Custom Matchers
```typescript
// src/common/testing/matchers/custom.matchers.ts
expect.extend({
  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return {
      pass: uuidRegex.test(received),
      message: () => `Expected ${received} to be a valid UUID`,
    };
  },
});
```

## 🎯 Ejemplos Implementados

- ✅ **PromptService** - `src/prompt/tests/prompt.service.spec.ts`
- ✅ **TenantService** - `src/tenant/tests/tenant.service.spec.ts`
- ✅ **LlmExecutionService** - `src/llm-execution/tests/llm-execution.service.spec.ts`

## 📚 Recursos Adicionales

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [NestJS Testing](https://docs.nestjs.com/fundamentals/testing)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Nota**: Esta guía está diseñada para evolucionar. Actualiza las mejores prácticas según las necesidades del proyecto. 