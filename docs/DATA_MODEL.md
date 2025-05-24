# AI Prompt Management Data Model Explanation

## Introduction

This document explains the Prisma data model designed for managing AI prompts, their versions, associated assets, localization details, and execution logs within an enterprise context. It provides a robust framework for organizing, developing, deploying, and monitoring AI prompting applications across various use cases.

*Note: This schema is designed for use with KeystoneJS, which may automatically manage certain fields and relationships.*

## Core Concepts

The data model revolves around several key concepts:

1.  **Prompts & Versioning:** The core instruction given to an AI. Every logical prompt (`Prompt`) can have multiple iterations (`PromptVersion`) to track changes, manage status (draft, active), and allow A/B testing or rollback.
2.  **Assets & Modularity:** Reusable pieces of text, instructions, or data (`PromptAsset`) that can be dynamically inserted into prompts. Assets also have their own versions (`PromptAssetVersion`) and are linked to specific prompt versions (`PromptAssetLink`), enabling modular and maintainable prompt construction.
3.  **Localization & Context:** The model provides strong support for adapting prompts and assets to different languages (`PromptTranslation`, `AssetTranslation`) and cultural contexts (`Region`, `CulturalData`).
4.  **Organization & Deployment:** Prompts and assets are organized within `Project`s, managed by `User`s, and deployed to different `Environment`s (e.g., development, staging, production). `Tag`s allow for further categorization.
5.  **Execution & Monitoring:** The `PromptExecutionLog` captures vital information about each time a prompt version is run, facilitating debugging, performance analysis, and monitoring.
6.  **AI Model Awareness:** The specific `AIModel` (like GPT-4o, Claude 3) can be tracked, allowing for model-specific configurations or performance comparisons.
7.  **RAG Support:** Dedicated metadata storage (`RagDocumentMetadata`) for Retrieval-Augmented Generation use cases.

## Entity Breakdown

Here's a description of the main entities (models) in the `schema.prisma` file:

### Organization & Users

* **`User`**: Represents users of the system. Owns `Project`s and can be associated with `PromptExecutionLog`s. Includes basic authentication fields.
* **`Project`**: A top-level container for grouping related prompts, assets, 4s, and AI models. Owned by a `User`. Helps organize work for different teams or applications.

### Deployment & AI Models

* **`Environment`**: Represents deployment stages (e.g., `development`, `staging`, `production`). `PromptVersion`s and `PromptAssetVersion`s can be marked as active within specific environments.
* **`AIModel`**: Defines specific AI models being used (e.g., `gpt-4o-2024-05-13`). Stores provider, API identifiers, capabilities (`maxTokens`, `supportsJson`, `contextWindow`), and can be associated with `Project`s.

### Prompts & Versioning

* **`Prompt`**: The logical representation of a prompt's purpose (e.g., "Translate English to Spanish", "Extract Invoice Data"). It groups different versions and links to `Project`  and `Tags`. Identified by a unique `name` (often a slug).
* **`PromptVersion`**: A specific iteration of a `Prompt`. This is where the actual `promptText` resides. It includes a `versionTag` (e.g., "1.0.0"), `status` ("draft", "active", "archived"), `changeMessage`, creation timestamp, and links to:
    * `PromptTranslation`s for different languages.
    * `PromptAssetLink`s defining which assets are used.
    * `Environment`s where it's active.
    * `PromptExecutionLog`s recording its runs.
* **`PromptTranslation`**: Stores the translated `promptText` for a specific `PromptVersion` in a given `languageCode`.

### Assets & Modularity

* **`PromptAsset`**: A reusable component (e.g., a brand voice guideline, a list of fields to extract, a standard greeting, a code snippet, a character profile). Identified by a unique `key` (slug). Contains metadata like `name`, `category`, and links to its `Project`.
* **`PromptAssetVersion`**: A specific iteration of a `PromptAsset`. Contains the actual `value` of the asset for that version, along with `versionTag`, `status`, `changeMessage`, and links to:
    * `AssetTranslation`s for different languages.
    * `PromptAssetLink`s showing where it's used.
    * `Environment`s where it's active.
* **`AssetTranslation`**: Stores the translated `value` for a specific `PromptAssetVersion` in a given `languageCode`.
* **`PromptAssetLink`**: The critical link entity connecting a specific `PromptVersion` to a specific `PromptAssetVersion`. It defines *how* an asset is used within a prompt, including `usageContext` (a description of its role, e.g., "Field to extract: vendor-name"), `position`, and `insertionLogic` (optional, for complex templating).

### Localization & Strategy

* **`Region`**: Represents a geographical or linguistic region (e.g., `es-ES`, `en-US`). Identified by `languageCode`. Can have parent regions and stores `timeZone`, default formality, etc. Links to `CulturalData`.
* **`CulturalData`**: Stores specific cultural nuances for a `Region`, such as `formalityLevel`, communication `style`, and specific `considerations`. 

### Metadata & Logging

* **`Tag`**: Used for categorizing and searching `Prompt`s (e.g., "marketing", "extraction", "python", "rag").
* **`RagDocumentMetadata`**: Stores metadata about external documents used in Retrieval-Augmented Generation (RAG) use cases. Includes `documentName`, `category`, `complianceReviewed` status, etc. *Note: This entity stores metadata, not the document content or vectors themselves.*
* **`PromptExecutionLog`**: Records an instance of a `PromptVersion` being executed. Captures `timestamp`, links to the `PromptVersion`, `Environment`, and `User` (if applicable), the `input` provided, the generated `output`, `success` status, `durationMs`, and potential `errorMessage`. *Note: Could be enhanced with token counts and cost.*

## Use Case Examples & Seed Scripts

Several seed scripts were generated to illustrate how this model supports different enterprise use cases:

1.  **Document Data Extraction (`seed.invoice-extraction.ts`):** Shows how `PromptAsset`s can define individual fields to be extracted (like invoice number, date, total). The main `PromptVersion` provides general instructions and refers to linked assets. `AIModel` selection for JSON support is relevant.
2.  **Code Generation & Assistance (`seed.codegen.ts`):** Leverages `PromptAsset`s for code snippets, templates, and standards. `PromptVersion`s manage variations for different languages or tasks (generation vs. explanation). `Tags` categorize by language/task.

## Entity Importance Matrix by Use Case

This matrix shows the *relative* importance of key entities/concepts for each example use case.

* `+++`: Very High Importance / Core Feature
* `++`: High Importance / Frequently Used
* `+`: Moderate Importance / Supporting Role
* `-`: Low or Indirect Importance

| Entity / Concept                 | Chatbot Agent | Doc Extraction | Marketing Content | Code Generation | Internal RAG KB | Creative Writing | Educational Content |
| :------------------------------- | :-----------: | :------------: | :---------------: | :-------------: | :-------------: | :--------------: | :-----------------: |
| `Project`/`User`/`Environment`   |      ++       |       ++       |        ++         |       ++        |       ++        |        ++        |         ++          |
| **`Prompt`/`PromptVersion`** |     `+++`     |     `+++`      |       `+++`       |      `+++`      |      `+++`      |      `+++`       |        `+++`        |
| **`Asset`/`AssetVer`/`Link`** |      ++       |     `+++`      |       `+++`       |      `+++`      |       ++        |      `+++`       |        `+++`        |
| **`Region`/`CulturalData`** |     `+++`     |       -        |        ++         |        -        |        -        |        -         |         ++          |
| `Translations` (Prompt/Asset)  |     `+++`     |       -        |        ++         |        -        |        -        |        -         |         ++          |
| `Tag`                            |      +        |       +        |        ++         |       ++        |       ++        |        ++        |         ++          |
| `AIModel`                        |      +        |       ++       |        +          |       ++        |       +         |        +         |         +           |
| **`RagDocumentMetadata`** |      -        |       +        |        -          |        -        |      `+++`      |        -         |         -           |
| `PromptExecutionLog`           |      ++       |       ++       |        ++         |       ++        |      `+++`      |        +         |         ++          |

**Key Observations from Matrix:**

* `Prompt`/`PromptVersion` and `Asset`/`AssetVersion`/`Link` are fundamental to almost all use cases, enabling the core functionality of defining instructions and reusing components.
* Localization features (`Region`, `CulturalData`  `Translations`) are crucial for user-facing applications needing adaptation (Chatbot, Marketing, Education) but less so for internal or technical tasks (Extraction, CodeGen, Creative Writing typically).
* `RagDocumentMetadata` is specifically critical for RAG use cases.
* `PromptExecutionLog` is highly important for any deployed application requiring monitoring and debugging, especially RAG and Extraction where success/failure is key.
* `AIModel` is important when specific model capabilities (JSON, context size) are required (Extraction, CodeGen, RAG).

## Conclusion

This data model provides a comprehensive and flexible structure for managing the lifecycle of AI prompts and their components in an enterprise setting. Its strengths lie in robust versioning, modularity via assets, strong localization support, and clear organizational structures. It effectively supports a wide range of use cases, from simple content generation to complex RAG and localized chatbot interactions, as demonstrated by the seed examples. Potential areas for future enhancement could include more detailed logging metrics, a dedicated evaluation framework, and more advanced RAG metadata tracking.