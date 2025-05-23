/**
 * Genera un slug URL-friendly a partir de un texto
 * @param text - El texto a convertir en slug
 * @returns El slug generado
 */
export function slugify(text: string): string {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-') // Reemplazar espacios con -
        .replace(/[^\w\-]+/g, '') // Eliminar caracteres no alfanuméricos excepto -
        .replace(/\-\-+/g, '-'); // Reemplazar múltiples - con uno solo
}

/**
 * Sustituye variables en un texto usando el formato ${variable}
 * @param text - El texto que contiene las variables
 * @param variables - Objeto con las variables a sustituir
 * @returns El texto con las variables sustituidas
 */
export function substituteVariables(
    text: string,
    variables?: Record<string, any>,
): string {
    if (!variables) return text;

    return text.replace(/\${([^}]+)}/g, (match, key) => {
        const value = variables[key.trim()];
        return value !== undefined ? String(value) : match;
    });
}

/**
 * Sustituye variables en un texto usando el formato {{variable}}
 * @param text - El texto que contiene las variables
 * @param variables - Objeto con las variables a sustituir
 * @returns El texto con las variables sustituidas
 */
export function substituteVariablesBraces(
    text: string,
    variables?: Record<string, any>,
): string {
    if (!variables) return text;

    return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
        const value = variables[key.trim()];
        return value !== undefined ? String(value) : match;
    });
} 