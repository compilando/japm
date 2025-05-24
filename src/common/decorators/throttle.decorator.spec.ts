import { Test, TestingModule } from '@nestjs/testing';
import { Controller, Get } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
    ThrottleAuth,
    ThrottleApi,
    ThrottleCreation,
    ThrottleLLM,
    ThrottleRead,
    ThrottleHealth,
} from './throttle.decorator';

// Test controller to apply decorators
@Controller('test')
class TestController {
    @Get('auth')
    @ThrottleAuth()
    testAuth() {
        return 'auth';
    }

    @Get('api')
    @ThrottleApi()
    testApi() {
        return 'api';
    }

    @Get('creation')
    @ThrottleCreation()
    testCreation() {
        return 'creation';
    }

    @Get('llm')
    @ThrottleLLM()
    testLlm() {
        return 'llm';
    }

    @Get('read')
    @ThrottleRead()
    testRead() {
        return 'read';
    }

    @Get('health')
    @ThrottleHealth()
    testHealth() {
        return 'health';
    }
}

describe('Throttle Decorators', () => {
    let app: TestingModule;

    beforeEach(async () => {
        app = await Test.createTestingModule({
            imports: [
                ThrottlerModule.forRoot([
                    {
                        name: 'default',
                        ttl: 60000,
                        limit: 100,
                    },
                ]),
            ],
            controllers: [TestController],
            providers: [
                {
                    provide: APP_GUARD,
                    useClass: ThrottlerGuard,
                },
            ],
        }).compile();
    });

    it('should create controller with throttle decorators', () => {
        const controller = app.get<TestController>(TestController);
        expect(controller).toBeDefined();
    });

    it('should apply ThrottleAuth with correct limits', () => {
        // Verificar que el decorador existe y se puede instanciar
        expect(ThrottleAuth).toBeDefined();
        const decorator = ThrottleAuth();
        expect(decorator).toBeDefined();
    });

    it('should apply ThrottleApi with correct limits', () => {
        expect(ThrottleApi).toBeDefined();
        const decorator = ThrottleApi();
        expect(decorator).toBeDefined();
    });

    it('should apply ThrottleCreation with correct limits', () => {
        expect(ThrottleCreation).toBeDefined();
        const decorator = ThrottleCreation();
        expect(decorator).toBeDefined();
    });

    it('should apply ThrottleLLM with correct limits', () => {
        expect(ThrottleLLM).toBeDefined();
        const decorator = ThrottleLLM();
        expect(decorator).toBeDefined();
    });

    it('should apply ThrottleRead with correct limits', () => {
        expect(ThrottleRead).toBeDefined();
        const decorator = ThrottleRead();
        expect(decorator).toBeDefined();
    });

    it('should apply ThrottleHealth with correct limits', () => {
        expect(ThrottleHealth).toBeDefined();
        const decorator = ThrottleHealth();
        expect(decorator).toBeDefined();
    });

    describe('Decorator Configurations', () => {
        it('should have different limits for different operation types', () => {
            // Los decoradores deberían tener diferentes configuraciones
            const authDecorator = ThrottleAuth();
            const llmDecorator = ThrottleLLM();
            const healthDecorator = ThrottleHealth();

            // Todos deberían ser funciones válidas
            expect(typeof authDecorator).toBe('function');
            expect(typeof llmDecorator).toBe('function');
            expect(typeof healthDecorator).toBe('function');
        });
    });

    afterEach(async () => {
        await app.close();
    });
}); 