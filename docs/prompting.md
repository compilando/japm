# Prompt System Documentation

## Overview

This document describes the prompt system, its structure, and best practices for managing prompts, assets, and translations in the JAPM project.

## Prompt Structure (2024-06)

- **Prompt content** is stored in the `content` field of the `Prompt` model.
- **Prompt classification** (system, user, assistant, guard, etc.) is currently managed through the prompt's `name`, `description`, and project structure, **not** through a dedicated `type` field in the database.
- **Translations** are managed via the `PromptTranslation` model, and assets via `PromptAsset` and `PromptAssetVersion`.

### Example Prompt Object
```json
{
  "id": "system-base",
  "name": "System Base Instructions",
  "description": "Base system instructions for code generation, defining core behavior and constraints.",
  "content": "...prompt text...",
  "projectId": "codegen-examples",
  "tenantId": "..."
}
```

## Classification of Prompts

- **System prompts**: Use `name` and `description` to indicate their role (e.g., "System Base Instructions").
- **Guard prompts**: Clearly describe security or validation rules in the `description`.
- **User/Assistant prompts**: Use naming conventions and descriptions to clarify their function.

> **Note:** The `type` field exists in the Prisma schema, but is not currently used in the seed scripts due to type/linter issues. If you wish to reintroduce it, ensure the Prisma client exposes the enum correctly and update the seed scripts to use it.

## Prompt Content and References

- The main prompt text is stored in the `content` field.
- Prompts can reference variables, assets, and other prompts using the following syntax:
  - Variables: `{{variable:nombreVariable}}`
  - Assets: `{{asset:nombreAsset:versionTag}}` or `{{asset:nombreAsset:latest}}`
  - Prompts: `{{prompt:nombrePrompt:versionTag}}`, `{{prompt:nombrePrompt:latest}}`, or `{{prompt:nombrePrompt:latest:es-ES}}`

### Quick Reference Table

| Reference Type | Syntax Example                                 | Description                                 |
|---------------|-----------------------------------------------|---------------------------------------------|
| Variable      | `{{variable:userName}}`                        | Inserts the value of a variable             |
| Asset         | `{{asset:template:latest}}`                    | Inserts the latest version of an asset      |
| Asset (ver)   | `{{asset:template:1.0.0}}`                    | Inserts a specific version of an asset      |
| Prompt        | `{{prompt:system-base:latest}}`                | Inserts the latest version of a prompt      |
| Prompt (ver)  | `{{prompt:system-base:1.0.0}}`                | Inserts a specific version of a prompt      |
| Prompt (lang) | `{{prompt:system-base:latest:es-ES}}`          | Inserts a prompt in a specific language     |

## Practical Examples

### 1. Composing Prompts

Suppose you want to build a composite prompt for onboarding:

```text
{{prompt:system-base:latest}}

Welcome, {{variable:userName}}!

{{prompt:onboarding-instructions:latest:es-ES}}
```

### 2. Referencing Assets and Variables

```text
Please use the following template:
{{asset:email-template:latest}}

Your preferences:
- Language: {{variable:language}}
- Theme: {{variable:theme}}
```

### 3. Guard Prompt Example

```text
{{prompt:guard-codegen:latest}}

All code must pass security validation. If any rule is violated, reject the request.
```

## Translations

- Spanish and other language translations are managed via the `PromptTranslation` and `AssetTranslation` models.
- The seed scripts automatically create Spanish translations for all prompts and assets.

## Best Practices

- Use clear and descriptive `name` and `description` fields to indicate the role and function of each prompt.
- Maintain a consistent naming convention for prompt IDs (e.g., `system-base`, `guard-codegen`, `user-code-request`).
- Store the main prompt text in the `content` field.
- Use the reference syntax for modular and maintainable prompts.
- Avoid circular references between prompts.
- Use semantic versioning for prompt and asset versions (e.g., `1.0.0`).
- **Do not reference a prompt to itself** (e.g., `{{prompt:user-code-request}}` within the `user-code-request` prompt), as this can lead to infinite loops or unexpected behavior.

## How to Reintroduce the `type` Field

1. Ensure the `type` field is present and correctly defined in the Prisma schema as an enum.
2. Regenerate the Prisma client (`npx prisma generate`).
3. Update the seed scripts to use the `type` field, making sure the type is recognized by the Prisma client.
4. Use the enum values (e.g., `'SYSTEM'`, `'USER'`, etc.) when creating or updating prompts.

## Error Handling

- If a required field is missing (e.g., `content`), the seed process will fail. Always provide the main prompt text in `content`.
- If you wish to enforce classification, add validation logic in the application layer or update the seed scripts once the `type` field is fully supported.
- The system prevents circular references and logs warnings for missing references or translations.

## Example Use Case

A prompt for code generation might look like this:

```json
{
  "id": "guard-codegen",
  "name": "Guard Code Generation",
  "description": "Security-focused prompt that implements strict validation rules for code generation.",
  "content": "...security rules and validation logic..."
}
```

## FAQ (Frequently Asked Questions)

**Q: How can I add a new type of prompt?**
A: Currently, classification is done by name and description. If you need a dedicated field, follow the "How to Reintroduce the `type` Field" section.

**Q: What happens if I reference a prompt or asset that doesn't exist?**
A: The system will log it as a warning and continue, but it's recommended to validate references during development.

**Q: Can I nest references?**
A: Yes, references are resolved recursively, but circular loops are prevented.

**Q: How do I manage versions and translations?**
A: Use the `versionTag` field for versions and the `PromptTranslation` model for translations. The system can automatically find the appropriate translation.

**Q: Can I use dynamic variables in prompts?**
A: Yes, use the `{{variable:variableName}}` syntax and make sure to pass the value in the execution context.

## Conclusion

The current system is robust and flexible, allowing for modular prompt composition, multi-language support, and clear documentation. Prompt classification is handled via naming and description, but can be extended to use the `type` field in the future if needed. 