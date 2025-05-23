# Product Requirements Document (PRD) - Prompt Management (JAPM)

## 1. Introduction

This document details the product requirements for the Prompt Management system (JAPM). JAPM aims to provide a centralized platform for users and systems to efficiently create, manage, version, and translate "prompts."

## 2. Product Goals

*   Facilitate the creation and organization of a prompt library.
*   Enable prompt versioning to track changes and improvements.
*   Support prompt internationalization through translations.
*   Provide a robust API for integration with other systems.
*   Ensure an intuitive user experience for prompt management (if a dedicated UI is developed).

## 3. Product Scope

### 3.1. Key Features (MVP - Minimum Viable Product)

*   **Base Prompt Management:**
    *   (Assumed Prerequisite) Create a new base prompt entity with a unique name/identifier and define its base language. (Exact mechanism/DTO for this step is TBD/separate).
    *   View a list of all prompts.
    *   View details of a specific prompt.
    *   Update prompt metadata (e.g., name, description).
    *   Delete a prompt (consider soft delete/archiving).
*   **Prompt Versioning:**
    *   Create a new version for an *existing* prompt. As per `CreatePromptVersionDto`, each new version includes:
        *   `promptText`: The actual text of the prompt for this version, in the prompt's base language.
        *   `versionTag`: A string to identify the version (e.g., "v1.0", "v1.1-beta"), unique per prompt.
        *   `changeMessage` (optional): A message describing the changes in this version.
        *   `initialTranslations` (optional): An array of initial translations for this version. Each translation object contains:
            *   `languageCode`: The language code for the translation (e.g., "es-ES", "fr-FR").
            *   `promptText`: The translated text.
    *   View all versions of a specific prompt.
    *   View details of a specific prompt version.
    *   (Optional MVP) Designate a version as "active" or "published" for a prompt.
*   **Translation Management for Prompt Versions:**
    *   Provide initial translations when a new prompt version is created (as part of `CreatePromptVersionDto`).
    *   Subsequently, add new translations to an existing prompt version for a specific `languageCode`.
    *   Update an existing translation for a prompt version.
    *   Delete a translation for a prompt version.
    *   Query all translations for a specific prompt version.


## 4. System Users

*   **Content/Prompt Administrators**: Responsible for creating and maintaining the prompt library.
*   **Developers/Systems**: Consume the JAPM API to get the necessary prompts for their applications.
*   **Translators**: Responsible for providing localized versions of prompts.
*   **(Future) System Administrators**: Manage users and JAPM system configurations.

## 5. Key Use Cases

### 5.1. Onboard a New Prompt and Create Its First Version

1.  **Actor**: Content Administrator.
2.  **Description**: The administrator wants to add a new prompt to the system and define its initial version.
3.  **Steps**:
    a.  (Prerequisite) The administrator creates a base prompt entity, providing its unique name and base language (e.g., via a `POST /prompts` with a `CreatePromptDto`).
    b.  The system confirms the creation of the base prompt entity.
    c.  The administrator then sends a request to create the first version for this new prompt (e.g., `POST /prompts/{promptId}/versions`) using `CreatePromptVersionDto`, providing:
        *   `promptText`: The text for the first version in the prompt's base language.
        *   `versionTag`: An initial version tag (e.g., "1.0.0").
        *   `changeMessage` (optional): e.g., "Initial version."
        *   `initialTranslations` (optional): Any initial translations.
    d.  The system creates the prompt version and any associated initial translations.
    e.  The system confirms the creation of the version.

### 5.2. Create a Subsequent Version of an Existing Prompt

1.  **Actor**: Content Administrator / Editor.
2.  **Description**: An existing prompt needs to be updated or improved, requiring a new version.
3.  **Steps**:
    a. The actor identifies the existing prompt to version.
    b. The actor sends a request to create a new version (e.g., `POST /prompts/{promptId}/versions`) with a payload conforming to `CreatePromptVersionDto`:
        *   `promptText`: The new or modified prompt text for this version.
        *   `versionTag`: A new, unique `versionTag` for this prompt (e.g., "v1.1.0", "v2.0-alpha").
        *   `changeMessage` (optional): A description of what changed in this version.
        *   `initialTranslations` (optional): Any new or updated translations specifically for this version release.
    c. The system validates the data (e.g., uniqueness of `versionTag` for the prompt).
    d. The system creates the new version associated with the prompt and saves any initial translations provided.
    e. The system confirms the creation of the new version.

### 5.3. Add or Manage Translations for an Existing Prompt Version

1.  **Actor**: Translator / Content Administrator.
2.  **Description**: Translations need to be added, or existing ones updated/deleted for a specific, already existing prompt version.
3.  **Note**: Initial translations can be provided during version creation (see Use Cases 5.1 and 5.2). This use case covers ongoing translation management.
4.  **Steps (Example: Adding/Updating a translation)**:
    a. The actor identifies the specific prompt and version (`promptId`, `versionTag`) to translate.
    b. For each language, the actor sends a request to add or update the translation (e.g., `POST` or `PUT` to `/prompts/{promptId}/versions/{versionTag}/translations`) with:
        *   `languageCode`: The target language code.
        *   `promptText`: The translated text.
    c. The system saves or updates the translation for the specified prompt version and language.
    d. The system confirms the operation.
    e. (Similar steps for deleting a specific translation, e.g., `DELETE /prompts/{promptId}/versions/{versionTag}/translations/{languageCode}`).

### 5.4. An External System Retrieves a Translated Prompt

1.  **Actor**: External System (API Consumer).
2.  **Description**: An application needs to get the text of a specific prompt, in a specific version and language.
3.  **Steps**:
    a. The external system sends a request (e.g., `GET /prompts/{promptNameOrId}/versions/{versionTag}/translate?lang=es-ES`).
    b. JAPM locates the requested prompt, version, and translation.
    c. JAPM returns the translated prompt text. If the exact translation or version does not exist, a fallback strategy is defined (e.g., return base language, error).

## 6. Non-Functional Requirements

*   **Performance**: Read requests for prompts should respond in under 200ms (95th percentile). Write operations can be slower but should complete within a reasonable time (e.g., < 1 second).
*   **Availability**: The system should have high availability (e.g., 99.9%).
*   **Security**:
    *   APIs must be protected (e.g., via API keys or JWT tokens in future phases).
    *   Common vulnerabilities (SQL injection, XSS, etc.) must be prevented.
*   **Usability**: (If UI is developed) The interface must be intuitive and easy to use.
*   **Maintainability**: The code must be well-documented and follow development best practices.
*   **Scalability**: The system must be able to scale horizontally to handle increased load.
*   **Internationalization (I18n)**: The system itself (API, error messages) should be prepared for internationalization if necessary, in addition to managing multilingual prompts. 