# UX Changes for Enhanced Prompt System

## Overview

The prompt system has been enhanced with new features that require UI updates. This document outlines the necessary changes to support prompt types, improved variable insertion, and prompt composition.

## 1. Prompt Type Selection

### New Field in Prompt Form
Add a required dropdown field for selecting the prompt type:

```typescript
type PromptType = 
  | 'SYSTEM'    // Base system instructions
  | 'USER'      // User-facing prompts
  | 'ASSISTANT' // Assistant responses
  | 'GUARD'     // Security rules
  | 'COMPOSITE' // Composed prompts
  | 'CONTEXT'   // Contextual info
  | 'FUNCTION'  // Function definitions
  | 'EXAMPLE'   // Example interactions
  | 'TEMPLATE'; // Reusable templates
```

### UI Implementation
- Add a dropdown in the prompt creation/editing form
- Default to 'USER' type
- Show type-specific validation messages
- Add tooltips explaining each type's purpose

## 2. Variable Insertion Enhancement

### Current State
Currently, variables are inserted with simple syntax: `{{variableName}}`

### New Requirements
Variables should now use the format: `{{variable:variableName}}`

### UI Changes
1. **Variable Insertion Dialog**:
   - Add a new button/icon in the prompt editor
   - When clicked, show a modal with:
     - Variable name input
     - Preview of the final syntax
     - List of existing variables
     - Option to create new variables

2. **Variable Management**:
   - Add a section to manage project variables
   - Show variable usage across prompts
   - Allow editing variable names (with impact analysis)

## 3. Prompt Composition

### New Reference Syntax
Prompts can now reference other prompts using:
- `{{prompt:promptName:versionTag}}`
- `{{prompt:promptName:latest}}`
- `{{prompt:promptName:latest:languageCode}}`

### UI Implementation
1. **Prompt Reference Dialog**:
   - Add a button/icon for inserting prompt references
   - Show a modal with:
     - Prompt selection (searchable)
     - Version selection
     - Language selection (optional)
     - Preview of the final syntax

2. **Reference Validation**:
   - Show warnings for invalid references
   - Prevent circular references
   - Validate type compatibility (e.g., GUARD prompts can only reference other GUARD prompts)

3. **Reference Visualization**:
   - Add a visual representation of prompt dependencies
   - Show reference chains
   - Highlight potential circular references

## 4. Version Management

### Enhanced Version UI
1. **Version Creation**:
   - Add semantic versioning support
   - Show version history
   - Allow comparing versions

2. **Translation Management**:
   - Support for multiple languages
   - Language-specific versioning
   - Translation status indicators

## 5. Asset Management

### Asset Reference Syntax
Assets now use the format:
- `{{asset:assetName:versionTag}}`
- `{{asset:assetName:latest}}`

### UI Changes
1. **Asset Insertion**:
   - Add a button/icon for inserting assets
   - Show a modal with:
     - Asset selection
     - Version selection
     - Preview of the final syntax

2. **Asset Management**:
   - Enhanced asset version control
   - Translation support for assets
   - Usage tracking across prompts

## 6. Validation and Error Handling

### New Validations
1. **Type-specific Rules**:
   - GUARD prompts cannot use variables
   - SYSTEM prompts cannot reference USER prompts
   - Maximum reference depth (5 levels)

2. **UI Feedback**:
   - Show validation errors in real-time
   - Provide clear error messages
   - Suggest fixes for common issues

## 7. Preview and Testing

### Enhanced Preview
1. **Reference Resolution**:
   - Show how references will be resolved
   - Preview with different versions
   - Preview with different languages

2. **Variable Testing**:
   - Test prompt with sample variables
   - Show variable resolution
   - Highlight missing variables

## Implementation Notes

1. **API Changes**:
   - Updated DTOs to include prompt type
   - New endpoints for reference validation
   - Enhanced version management

2. **Performance Considerations**:
   - Lazy loading of prompt references
   - Caching of resolved prompts
   - Optimized validation checks

3. **Security**:
   - Type-based access control
   - Reference validation
   - Variable sanitization

## Example UI Flow

1. **Creating a New Prompt**:
   ```
   1. Select prompt type
   2. Enter basic information
   3. Add content with variables/references
   4. Validate references and variables
   5. Create initial version
   ```

2. **Adding References**:
   ```
   1. Click reference button
   2. Search for prompt
   3. Select version/language
   4. Preview reference
   5. Insert reference
   ```

3. **Managing Variables**:
   ```
   1. Click variable button
   2. Enter variable name
   3. Preview syntax
   4. Insert variable
   ```

## Next Steps

1. Update API endpoints to support new features
2. Implement UI changes in phases
3. Add comprehensive validation
4. Update documentation
5. Add migration tools for existing prompts 