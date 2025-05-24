import { Throttle } from '@nestjs/throttler';

/**
 * Decorador para operaciones de autenticación (moderadamente restrictivo)
 * 20 intentos por 15 minutos por IP
 */
export const ThrottleAuth = () => Throttle({ default: { limit: 20, ttl: 900000 } });

/**
 * Decorador para operaciones de API general
 * 300 requests por minuto por IP - muy permisivo para UX  
 */
export const ThrottleApi = () => Throttle({ default: { limit: 300, ttl: 60000 } });

/**
 * Decorador para operaciones de creación (permisivo)
 * 100 creaciones por minuto por IP - suficiente para uso intensivo
 */
export const ThrottleCreation = () => Throttle({ default: { limit: 100, ttl: 60000 } });

/**
 * Decorador para operaciones de LLM/AI (moderadamente restrictivo por costo)
 * 50 requests por minuto por IP - permisivo pero controlado
 */
export const ThrottleLLM = () => Throttle({ default: { limit: 50, ttl: 60000 } });

/**
 * Decorador para operaciones de lectura (muy permisivo)
 * 500 requests por minuto por IP - para navegación fluida sin restricciones
 */
export const ThrottleRead = () => Throttle({ default: { limit: 500, ttl: 60000 } });

/**
 * Decorador para health checks (extremadamente permisivo)
 * 1000 requests por minuto por IP
 */
export const ThrottleHealth = () => Throttle({ default: { limit: 1000, ttl: 60000 } });

/**
 * Decorador para deshabilitar throttling en endpoints específicos
 */
export const SkipThrottle = () => Throttle({ default: { limit: 0, ttl: 0 } }); 