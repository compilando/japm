import { slugify, substituteVariables, substituteVariablesBraces } from './index';

describe('Utility Functions', () => {
    describe('slugify', () => {
        it('should convert text to lowercase slug', () => {
            expect(slugify('Hello World')).toBe('hello-world');
        });

        it('should replace spaces with hyphens', () => {
            expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
        });

        it('should remove special characters', () => {
            expect(slugify('Hello @ World! #Test')).toBe('hello-world-test');
        });

        it('should remove multiple consecutive hyphens', () => {
            expect(slugify('Hello---World')).toBe('hello-world');
        });

        it('should trim whitespace', () => {
            expect(slugify('  Hello World  ')).toBe('hello-world');
        });

        it('should handle empty string', () => {
            expect(slugify('')).toBe('');
        });

        it('should handle string with only special characters', () => {
            expect(slugify('!@#$%^&*()')).toBe('');
        });

        it('should handle numbers', () => {
            expect(slugify('Project 123')).toBe('project-123');
        });

        it('should handle accented characters', () => {
            expect(slugify('Café Niño')).toBe('caf-nio');
        });
    });

    describe('substituteVariables', () => {
        it('should substitute variables with ${} format', () => {
            const text = 'Hello ${name}, you are ${age} years old';
            const variables = { name: 'John', age: 30 };
            expect(substituteVariables(text, variables)).toBe('Hello John, you are 30 years old');
        });

        it('should return original text when no variables provided', () => {
            const text = 'Hello ${name}';
            expect(substituteVariables(text)).toBe('Hello ${name}');
        });

        it('should leave unmatched variables unchanged', () => {
            const text = 'Hello ${name}, your ${unknown} variable';
            const variables = { name: 'John' };
            expect(substituteVariables(text, variables)).toBe('Hello John, your ${unknown} variable');
        });

        it('should handle empty variables object', () => {
            const text = 'Hello ${name}';
            const variables = {};
            expect(substituteVariables(text, variables)).toBe('Hello ${name}');
        });

        it('should handle multiple occurrences of same variable', () => {
            const text = '${greeting} ${name}, ${greeting} again!';
            const variables = { greeting: 'Hello', name: 'John' };
            expect(substituteVariables(text, variables)).toBe('Hello John, Hello again!');
        });

        it('should handle variables with whitespace', () => {
            const text = '${ name } and ${ age }';
            const variables = { name: 'John', age: 30 };
            expect(substituteVariables(text, variables)).toBe('John and 30');
        });

        it('should convert non-string values to strings', () => {
            const text = 'Count: ${count}, Active: ${active}';
            const variables = { count: 42, active: true };
            expect(substituteVariables(text, variables)).toBe('Count: 42, Active: true');
        });
    });

    describe('substituteVariablesBraces', () => {
        it('should substitute variables with {{}} format', () => {
            const text = 'Hello {{name}}, you are {{age}} years old';
            const variables = { name: 'John', age: 30 };
            expect(substituteVariablesBraces(text, variables)).toBe('Hello John, you are 30 years old');
        });

        it('should return original text when no variables provided', () => {
            const text = 'Hello {{name}}';
            expect(substituteVariablesBraces(text)).toBe('Hello {{name}}');
        });

        it('should leave unmatched variables unchanged', () => {
            const text = 'Hello {{name}}, your {{unknown}} variable';
            const variables = { name: 'John' };
            expect(substituteVariablesBraces(text, variables)).toBe('Hello John, your {{unknown}} variable');
        });

        it('should handle multiple occurrences of same variable', () => {
            const text = '{{greeting}} {{name}}, {{greeting}} again!';
            const variables = { greeting: 'Hello', name: 'John' };
            expect(substituteVariablesBraces(text, variables)).toBe('Hello John, Hello again!');
        });

        it('should handle variables with whitespace', () => {
            const text = '{{ name }} and {{ age }}';
            const variables = { name: 'John', age: 30 };
            expect(substituteVariablesBraces(text, variables)).toBe('John and 30');
        });

        it('should handle nested braces correctly', () => {
            const text = 'Data: {{{data}}}';
            const variables = { data: 'test' };
            expect(substituteVariablesBraces(text, variables)).toBe('Data: {{{data}}}');
        });
    });
}); 