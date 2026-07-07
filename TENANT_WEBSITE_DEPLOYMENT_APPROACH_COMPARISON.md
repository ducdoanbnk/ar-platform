# Tenant Website Deployment Approach Comparison

Audience: technical lead, solution architect, and bid solution reviewer.

Source of truth: Requirement Specification v2 and current architecture decision.

Purpose: clarify the difference between fully deploying a separate tenant website and using one shared platform deployment with tenant resolver and runtime/frontend bundle selection.

## Executive Answer

For this platform, the recommended default is:

- One shared SaaS platform deployment
- Pre-built template bundles (one per event type)
- Backend-driven rendering logic
- Optional portable template package for external hosting

Do not make 'fully deploy one complete website stack per tenant' the default architecture.

Reason: The requirement is a productized multi-tenant platform, not one-off event website delivery. Task, stamp, identity, LINE, WebAR, AI 3D, report, entitlement, and audit logic must remain platform-owned.

## Open Points

The following requires clarification with client/stakeholder:

| Point | Question | Impact |
|---|---|---|
| Approach A scope | Does any current or future tender require backend source handover or complete platform independence? | If yes, Approach A must be estimated as core scope, not optional |
| API contract commitment | Is the exported template allowed to depend on platform public APIs indefinitely? | Affects commercial/licensing model |
| Platform lock-in disclosure | Is client aware that exported template still requires platform for backend functionality? | Must be stated in tender requirements |

## Two Approaches Being Compared

### Approach A - Fully Deploy A Website Per Tenant

Meaning:

- Tenant A gets its own deployed frontend/backend/runtime stack.
- Tenant B gets another deployed frontend/backend/runtime stack.
- Each tenant deployment may have its own app runtime, config, database/schema, services, and release lifecycle.

This can mean different levels:

| Variant | Meaning |
|---|---|
| Frontend-only deployment per tenant | Each tenant has a separate frontend app, but calls shared backend APIs. |
| Full application deployment per tenant | Each tenant has separate frontend plus backend services. |
| Dedicated infrastructure per tenant | Each tenant has isolated compute/database/storage/network. |

These variants should not be mixed. The operational cost and risk are very different.

### Approach B - Shared Platform With Pre-built Template Bundles

Meaning:

- There is one platform deployment with pre-built template bundles.
- Each event type has its own standalone template source (not shared with others).
- Template rendering logic is driven by backend API, not embedded in frontend.
- Platform serves tenant/event content via API calls.
- Tenant context is injected via request body/API call, not embedded at build time.

Key design principles to prevent IP leak:

1. Separated template bundles: Each event type template is a completely isolated source tree. No shared platform logic is embedded.
2. Backend-driven rendering: All tenant-specific content (tasks, stamps, branding, event data) comes from backend API calls at runtime. Frontend only handles UI presentation.
3. Runtime tenant context: When the template runs externally (after export), tenant context is passed via POST body or API headers, not baked in at build time.
4. Public API client only: Exported template contains only a public API client. Platform internal services (resolver, template builder, multi-tenancy engine) are never exposed.

## IP Leak Prevention in Approach B

### What is NEVER exported

| Component | Why not exported |
|---|---|
| Multi-tenancy architecture | Platform IP |
| Tenant resolver service | Platform IP |
| Template catalog builder | Platform IP |
| Internal service-to-service APIs | Platform IP |
| Admin panel source | Platform IP |

### What IS Exported (per event type template)

| Component | Description | IP risk |
|---|---|
| Template UI components | Generic UI code for event type | Low - standard frontend code |
| Public API client | HTTP client for platform public APIs | None - API contract is public anyway |
| Template configuration schema | Expected config structure | Low - just data shape |
| Build and deployment scripts | Standard build tooling | None |
| Event-specific pages/routes | Pages for that event type only | Low - per-template |

## Comparison

| Criteria | Fully deploy per tenant | Shared deployment + pre-built templates |
|---|---|---|
| Fit with SaaS product requirement | Weak as default | Strong |
| Event creation speed | Slower if deployment required | Faster; publish config only |
| Frontend customization | Strong but uncontrolled | Strong enough through templates |
| Backend consistency | Risk of duplicated logic | Strong; shared backend core |
| Task/stamp trust | Harder if diverge | Strong; verification in API |
| LINE/WebAR/AI integration | Can fragment | Shared adapter contracts |
| Operation cost | Higher | Lower; one platform |
| Regression control | Harder | Easier; versioned contracts |
| Tender deliverable | Strong if independent | Covered for template export |
| IP protection | Strong | Strong - platform IP never exported |
| Automated event creation | Requires redeployment | 100% automated |

## Two Types of Deliverables in Approach B

### Type 1: Platform-hosted Runtime (Default)

- Platform serves tenant/event website
- Tenant context comes from: resolver (domain/path/LIFF)
- Rendering logic comes from: backend API
- No export needed

### Type 2: Portable Template Package (For Tender)

- Client receives: event-type template source code
- Tenant context comes from: POST body / API call at runtime
- Rendering logic comes from: platform public APIs
- Platform IP never leaves the platform

## Template Lifecycle: Development to Deployment to Export

This section clarifies the complete workflow from dev team development to platform deployment to tender export.

### Phase 1: Development (Dev Team) - Source Code Organization

Phase 1 produces template source code (one repository per event type).

Template Source Repository Structure:

    event-template-city-tour/
    |
    |-- src/
    |   |-- components/          UI components (Button, Card, Map, TaskCard, StampBadge...)
    |   |-- pages/               Event pages (Home, Task, Stamp, AR, Profile...)
    |   |-- hooks/               Custom hooks (useEvent, useTask, useStamp, useAR...)
    |   |-- api-client.ts        ONLY calls PUBLIC APIs - no internal platform imports
    |   |-- types/               TypeScript interfaces for config/API responses
    |   |-- config/              Expected config structure
    |   |-- assets/              Static assets (icons, images, fonts)
    |   |-- i18n/                Internationalization files
    |   |-- utils/               Utility functions
    |
    |-- api-contract.json         Platform public API endpoint definitions
    |-- config.schema.json       Required config shape/validation
    |-- package.json
    |-- tsconfig.json
    |-- vite.config.ts
    |-- tests/
        |-- unit/
        |-- integration/
        |-- e2e/

Rules during development:

- NO internal API imports (resolver, tenant-service, etc.)
- NO platform SDK dependencies
- Tenant context from config/API response, never hardcoded
- Template is self-contained and event-type agnostic

### Phase 2: Build and Register - Bundled Static Assets

Phase 2 takes Phase 1 source code and produces pre-built bundle + registry entry.

Build Process:

    Template Source
          |
          +---> npm run build
          |
          v
    dist/
    |
    |-- index.html               Entry point
    |-- js/
    |   |-- main.[hash].js       Minified, bundled application code
    |   |-- vendor.[hash].js     Third-party dependencies
    |-- css/
    |   |-- main.[hash].css      Minified, bundled styles
    |-- assets/                  Copied static assets
    |-- runtime-manifest.json    Template metadata

Build validation:
- API contract compatibility check
- No forbidden imports detected
- Config schema validation
- Output size limits

Platform Template Registry:

    Registered Templates:
    - city-tour-template v1.2.0 [ACTIVE]
    - hiking-template v2.0.1 [ACTIVE]
    - indoor-template v1.5.0 [ACTIVE]

    Each entry stores:
    - Built artifact (dist/) in platform storage
    - Runtime manifest (version, event types, capabilities)
    - Assigned event types
    - Status: ACTIVE | INACTIVE | DEPRECATED

Key: Build ONCE, register ONCE, use MANY times.

### Template Definition

In this architecture, "template" means:

    Template = Event-Type Template (not Event Instance)

    Template defines:
    - UI components (Button, Card, Map, TaskCard, StampBadge...)
    - Page structure (Home, Task, Stamp, AR, Profile...)
    - API client (calls platform public APIs)
    - Config schema (expected data shape)
    - Event type: city-tour, hiking, indoor...

    Event Instance is a specific event created from a template:
    - Tenant A City Tour Event (uses city-tour-template)
    - Tenant B Hiking Event (uses hiking-template)

    One Template -> Many Event Instances

### Phase 2 Frequency

Phase 2 (Build and Register) runs:

    WHEN: When a template is created or updated
    - Template source code changes
    - New template version needed
    - Template security update required

    HOW MANY TIMES PER EVENT TYPE:
    - Initial: 1 time (first registration)
    - Updates: On-demand (when template code changes)
    - Per event creation: 0 times (Phase 2 already done)

    EXAMPLE:
    - Phase 2 runs once for city-tour-template v1.0.0
    - Phase 2 runs again when city-tour-template v1.1.0 is ready
    - But creating Tenant A City Tour Event does NOT trigger Phase 2
    - Creating Tenant B City Tour Event also does NOT trigger Phase 2

    KEY: Event creation (Phase 3) uses pre-built bundle from Phase 2.
         No rebuild needed for each new event.

### Template Storage and Retrieval for Export

When Phase 4 exports, the platform retrieves from storage:

    PLATFORM STORAGE STRUCTURE:

    platform-storage/
    |
    |-- templates/
    |   |-- city-tour/
    |   |   |-- v1.0.0/
    |   |   |   |-- src/              <- Template source code (Phase 1)
    |   |   |   |-- dist/             <- Built bundle (Phase 2)
    |   |   |   |-- runtime-manifest.json
    |   |   |   |-- metadata.json     <- Version, event types, created date...
    |   |   |
    |   |   |-- v1.1.0/
    |   |   |   |-- src/
    |   |   |   |-- dist/
    |   |   |   |-- runtime-manifest.json
    |   |   |   |-- metadata.json
    |   |
    |   |-- hiking/
    |   |-- indoor/
    |
    |-- events/
        |-- evt-xxx/
        |   |-- config-{event-id}.json  <- Event config (Phase 3)
        |   |-- metadata.json           <- Tenant, template version, created date...

    PHASE 4 EXPORT RETRIEVAL:

    1. Get event config from events/evt-xxx/ (Phase 3 output)
    2. Get template source from templates/{event-type}/v{x.y.z}/src/ (Phase 1)
       OR
       Get template bundle from templates/{event-type}/v{x.y.z}/dist/ (Phase 2)
    3. Combine and package

    KEY: Template source is stored and versioned in platform storage.
         Not regenerated during export.


### Phase 3: Event Creation on Platform (Inherits from Phase 1 and 2)

Phase 3 inherits:
- Template BUNDLE from Phase 2 (pre-built and registered)
- Event CONFIG auto-generated in Phase 3

#### Flow: From Phase 2 Bundle to Live Event

Phase 2 Output (Pre-built Bundle):

    Platform Template Registry:
    
    city-tour-template v1.2.0 [ACTIVE]
      dist/ (pre-built static files)
        index.html
        js/main.[hash].js        <--- Template code from Phase 1
        css/main.[hash].css
        runtime-manifest.json
    
                                    |
                                    Bundle ready
                                    Template registered
                                    v

    PHASE 3: EVENT CREATION (Admin creates new event)

                                    |
                                    v

    Admin UI selects:
    
    1. Tenant              -> Tenant A
    2. Event Type          -> City Tour
    3. Template            -> city-tour-template v1.2.0 [ACTIVE]
                               (from Phase 2 registry)
    4. Event Content       -> Branding, Tasks, Stamps, Assets
    5. Domain/Path         -> tenant-a.event.com
    
    Admin clicks "Create Event"
    
                                    |
                                    NO rebuild
                                    NO deployment
                                    Template already built
                                    v

    PLATFORM AUTOMATICALLY GENERATES:

    1. EVENT CONFIG (config-{event-id}.json)
    
       {
         "eventId": "evt-xxx",           <- Auto-generated
         "tenantId": "tenant-a",         <- From admin selection
         "eventType": "city-tour",       <- From admin selection
         "templateVersion": "1.2.0",     <- From Phase 2 registry
         "branding": {                   <- From admin input
           "logo": "https://...",
           "theme": { "primary": "#xxx" }
         },
         "tasks": [                      <- From admin input
           { "id": "t1", "name": "...", "type": "GPS+AR" },
           { "id": "t2", "name": "...", "type": "QR" }
         ],
         "stamps": [                    <- From admin input
           { "id": "s1", "name": "...", "image": "..." }
         ],
         "apiBaseUrl": "https://api.platform.com",
         "apiCredentials": { "token": "xxx" }  <- Auto-generated
       }

    2. EVENT STATUS
    
       DRAFT --------------------> PUBLISHED
       (Admin preview)           (Public access)

    3. DOMAIN/PATH MAPPING
    
       tenant-a.event.com -> Resolver -> Event: evt-xxx
       OR
       platform.com/tenant-a/event-id -> Resolver -> Event: evt-xxx

    KEY: Event is LIVE immediately, no template rebuild needed.
         Template is still the bundle from Phase 2.

#### Event Runtime Flow (On-Platform)

    USER VISITS EVENT URL (tenant-a.event.com)
                                    |
                                    1. Browser request
                                    v

    PLATFORM TENANT RESOLVER
                                    |
                                    v
    
    Request: tenant-a.event.com
                                    |
                                    v
    
    RESOLVER lookup:
      Input:   tenant-a.event.com
      Output:  Tenant: tenant-a
               Event: evt-xxx
               Template: city-tour-template v1.2.0
               Event Config: config-{event-id}.json
    
    ROUTING:
      -> Serve dist/ from Phase 2 bundle (city-tour-template v1.2.0)
      -> Inject event config into response
                                    |
                                    2. Platform serves PRE-BUILT template
                                       (Template code from Phase 1, Bundle from Phase 2)
                                    v

    TEMPLATE RUNTIME STARTS
                                    |
                                    v
    
    Template loads in browser:
      js/main.[hash].js       <- From Phase 2 bundle
      css/main.[hash].css     <- From Phase 2 bundle
      index.html              <- From Phase 2 bundle
    
    Template calls API:
      GET /api/event/{id}/config
    
    Platform returns:
      {
        "branding": { "logo": "...", "theme": "..." },  <- From Phase 3
        "tasks": [ ... ],                               <- From Phase 3
        "stamps": [ ... ]                               <- From Phase 3
      }
                                    |
                                    3. Template renders UI with data from API
                                    v

    USER SEES:
    
    Tenant A City Tour Event
      Tenant A branding (logo, theme)
      Tenant A tasks (GPS tasks, QR tasks)
      Tenant A stamps
      Tenant A assets
    
    ALL FROM:
      Template code: PHASE 1 (source) -> PHASE 2 (bundle)
      Event config:  PHASE 3 (auto-generated)
      Content data:  API call at runtime

#### Phase 3 Key Insight

    PHASE CONNECTION:
    
    Phase 1 (Source) ----> Phase 2 (Bundle) ----> Phase 3 (Event Creation)
         |                    |                    |
         |                    |                    +--> User sees event website
         |                    |
         |                    +--> Template code (generic, event-agnostic)
         |
         +--> Template source
    
    Phase 3 injects:
      Tenant context  -> from RESOLVER (domain/path)
      Event config    -> auto-generated config-{event-id}.json
      Branding        -> from admin input
      Tasks/Stamps    -> from admin input
      Template code   -> STILL from Phase 2 bundle (NOT regenerated)
    
    NO REBUILD NEEDED when creating new event.


### Phase 4: Export for Tender Deliverable (Inherits from Phase 1, 2, 3)

Phase 4 inherits:
- Template SOURCE from Phase 1 (for SOURCE mode)
- Template BUNDLE from Phase 2 (for BUNDLE mode)
- Event CONFIG from Phase 3 (generated when event was created)

#### Flow: From Phase 3 Event to Export Package

Phase 3 Output (Live Event):

    Event: Tenant A - City Tour Event
    
    config-{event-id}.json:
      {
        "eventId": "evt-xxx",
        "tenantId": "tenant-a",
        "eventType": "city-tour",
        "templateVersion": "1.2.0",
        "branding": { ... },
        "tasks": [ ... ],
        "stamps": [ ... ],
        "apiCredentials": { "apiKey": "evt-xxx-key" }
      }
    
    Template: city-tour-template v1.2.0
      Source: PHASE 1 (src/)
      Bundle: PHASE 2 (dist/)

                                    |
                                    Admin triggers export
                                    v

    PHASE 4: EXPORT (via platform UI)

                                    |
                                    v

    Admin selects:
    
    1. Event to export      -> Tenant A: City Tour Event (evt-xxx)
                               (From Phase 3)
    2. Template used        -> city-tour-template v1.2.0
                               (From Phase 2 registry)
    3. Export mode:
       SOURCE -> Editable source code
       BUNDLE -> Pre-built static files
    
    Admin clicks "Export for Client"

                                    |
                                    v

    PLATFORM PACKAGES TOGETHER:

    +------------------+------------------+------------------+
    | PHASE 1 OUTPUT   | PHASE 2 OUTPUT   | PHASE 3 OUTPUT  |
    | Template source  | Template bundle  | Event config    |
    | (src/)          | (dist/)         | (config-xxx)   |
    |                 |                  |                 |
    | <-- For SOURCE  | <-- For BUNDLE  | <-- For both   |
    +------------------+------------------+------------------+

    KEY: Platform code (resolver, multi-tenancy) is NOT exported.

#### Export Package Structure

MODE: SOURCE (Editable)
Inherits: Phase 1 + Phase 3

    event-export-{event-id}/
    |
    |-- src/                              <- FROM PHASE 1
    |   |-- components/                   <- Generic UI components
    |   |-- pages/                        <- Event type pages
    |   |-- hooks/                        <- Custom hooks
    |   |-- api-client.ts                <- Only calls PUBLIC APIs
    |   |-- types/
    |   |-- config/
    |   |-- assets/
    |
    |-- api-contract.json                 <- FROM PHASE 1
    |   (Platform public API endpoints)
    |
    |-- config-{event-id}.json           <- FROM PHASE 3
        {
          "eventId": "evt-xxx",
          "tenantId": "tenant-a",
          "eventType": "city-tour",
          "templateVersion": "1.2.0",
          "branding": { ... },
          "tasks": [ ... ],
          "stamps": [ ... ],
          "apiBaseUrl": "https://api.platform.com/public",
          "apiCredentials": { "apiKey": "evt-xxx-key" }
        }
    
    |-- BUILD.md                          Hướng dẫn build
    |-- DEPLOY.md                         Hướng dẫn deploy
    |-- PLATFORM-API-README.md            Cách goi platform APIs
    
    NOTE: NO platform internal code
          NO resolver, multi-tenancy, template builder


MODE: BUNDLE (Compiled)
Inherits: Phase 2 + Phase 3

    event-export-{event-id}/
    |
    |-- dist/                              <- FROM PHASE 2
    |   |-- index.html                     <- Pre-built
    |   |-- js/main.[hash].js             <- Pre-built
    |   |-- css/main.[hash].css           <- Pre-built
    |   |-- assets/
    |
    |-- config-{event-id}.json           <- FROM PHASE 3
        (Pre-filled with event data)
    |
    |-- API-DOCUMENTATION.pdf              Public API reference
    |-- DEPLOY.md                          Deployment guide

#### Exported Template Runtime Flow

    CLIENT HOSTS EXPORTED TEMPLATE
    (on clients own server/CDN)
                                    |
                                    Client deploys
                                    v

    TEMPLATE INITIALIZATION
                                    |
                                    v
    
    Template loads config-{event-id}.json
                                    |
                                    v
    
    Config contains:
      {
        "eventId": "evt-xxx",
        "apiBaseUrl": "https://api.platform.com/public",
        "apiCredentials": { "apiKey": "evt-xxx-key" }
      }
    
    Tenant context FROM CONFIG FILE, not from platform.
                                    |
                                    v

    TEMPLATE RUNTIME - EXTERNAL
                                    |
                                    v
    
    Template calls PUBLIC API:
      GET /api/public/event/{id}/config
      Header: X-API-Key: evt-xxx-key
                                    |
                                    v
    
    Platform returns:
      {
        "branding": { ... },   <- From Phase 3 event config
        "tasks": [ ... ],      <- From Phase 3 event config
        "stamps": [ ... ]      <- From Phase 3 event config
      }
                                    |
                                    v
    
    Template renders UI
                                    |
                                    v
    
    User sees: Tenant A City Tour Event (same as on-platform)
              but hosted by client.

#### Phase 4 Key Insight

    PHASE CONNECTION:
    
    Phase 4 Export = Phase 1 (source) + Phase 2 (bundle) + Phase 3 (config)
                    NO new platform code generated
    
    Platform NEVER exposes:
      Tenant resolver service
      Multi-tenancy architecture
      Template catalog builder
      Internal service-to-service APIs
    
    Exported template ONLY contains:
      Generic UI components (from Phase 1)
      Public API client (calls platform public APIs)
      Event-specific config (from Phase 3)
      API contract (from Phase 1)


## Summary: Phase Inheritance Chain

    TEMPLATE LIFECYCLE - INHERITANCE

    Phase 1: Development
      Produces: Template SOURCE CODE
        src/ (components, pages, api-client)
        api-contract.json
        config.schema.json
                |
                | Build once
                v
    Phase 2: Build and Register
      Produces: Pre-built BUNDLE + Registry Entry
        dist/ (index.html, js, css)
        runtime-manifest.json
                |
                | Use many times (no rebuild)
                v
    Phase 3: Event Creation
      Produces: Event CONFIG + Live Event
        config-{event-id}.json (tenant, branding, tasks, stamps)
        Event is LIVE (no redeployment)
                |
                | Export triggered
                v
    Phase 4: Export for Tender
      Produces: Export Package
        FROM Phase 1: Template source (mode SOURCE)
        FROM Phase 2: Template bundle (mode BUNDLE)
        FROM Phase 3: Event config (pre-filled)
        NO new platform code generated


    IP PROTECTION FLOW:

    Platform INTERNAL code (NEVER exported):
      Multi-tenancy engine     <- NEVER exported
      Tenant resolver          <- NEVER exported
      Template builder         <- NEVER exported
      Internal APIs            <- NEVER exported

    Platform EXTERNAL code (safe to export):
      Template UI components  <- FROM Phase 1 -> Exported (safe)
      Public API client       <- FROM Phase 1 -> Exported (safe)
      Event config           <- FROM Phase 3 -> Exported (safe)
      API contract           <- FROM Phase 1 -> Exported (safe)

## Comparison: On-Platform vs Exported Runtime

| Aspect | On-Platform Runtime | Exported Runtime |
|---|---|---|
| Template source | FROM Phase 1 | FROM Phase 1 |
| Template bundle | FROM Phase 2 | FROM Phase 2 |
| Event config | FROM Phase 3 | FROM Phase 3 |
| Template hosting | Platform CDN/edge | Client own hosting |
| Tenant context source | Platform resolver (domain/path) | Config file (API call at init) |
| Config source | Platform API call | Embedded config file |
| API credentials | Platform-managed | Pre-filled in config |
| Template updates | Automatic (platform updates bundle) | Client must rebuild/redeploy |
| Platform IP exposure | None | None |

## Why Pre-built Template Bundles?

Problem with dynamic code generation:
- Template builder generates frontend code dynamically
- Generated code contains platform logic
- Export = IP leak

Solution: Pre-built template bundles
- Templates are built once per event type
- Templates only contain UI + API client
- Platform rendering logic stays in backend
- Export = safe event-specific code only

## When Each Approach Makes Sense

Approach B is sufficient when:
- Tender requires event website source code
- Client wants to modify UI/customize event website
- Client accepts platform API dependency
- Client accepts that platform core remains proprietary

Approach A is required when:
- Tender explicitly requires backend source code handover
- Client demands complete platform independence
- Government/compliance requires isolated infrastructure
- Commercial model justifies dedicated deployment cost

## Recommended Architecture Position

Default:
- Shared SaaS platform deployment
- Pre-built template bundles (one per event type)
- Backend-driven rendering
- Portable template package for tender deliverables

Exceptional (estimated separately):
- Dedicated tenant deployment
- Separate estimate
- Separate infrastructure/security/operation plan
- Only when required by contract/compliance

## How To Explain To Zoustec

The platform has pre-built template bundles for each event type. These templates are standalone source code (not platform internals).

When running on platform:
- Tenant context comes from platform resolver
- Content comes from platform APIs
- No code generation or redeployment needed

When exported for tender:
- Client receives event-type template source code
- Tenant context is passed via API call at runtime
- Template only calls public platform APIs
- Platform core (multi-tenancy, resolver, template builder) never leaves our control

This satisfies tender deliverable requirements without exposing platform IP.

## WBS Implication

Default WBS should include:
- Pre-built template bundles (one per event type)
- Backend-driven rendering API
- Public API client SDK
- Template export mechanism
- API contract documentation
- Tenant-scoped backend APIs
- Entitlement and audit controls

Optional / advanced WBS should include:
- Dedicated tenant deployment model
- Per-tenant infrastructure automation
- Standalone backend handover package
- Complete platform independence deployment

## Decision To Confirm

Recommended assumption for WBS:

The default architecture is shared SaaS deployment with pre-built template bundles. Portable template export is supported for tender deliverables. Pre-built templates contain only UI + public API client; platform IP never exports. Full dedicated tenant deployment is optional/advanced and separately estimated only when required by contract or compliance.
