# Pet Universe

Pet shop management system. Nuxt 3 (Vue 3), Tailwind CSS, Firebase, Pinia. Package manager: **yarn**.

## Workflow

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy
- Keep the main context window clean - offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update `tasks/lessons.md` with the pattern
- Write rules for yourself that prevent the same mistake
- Review lessons at session start

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Ask yourself: "Would a staff engineer approve this?"

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- Skip this for simple, obvious fixes - don't over-engineer

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Code Standards

- **English only**: Never use Spanish variable names, function names, or property names
- **Icons**: Always use `~icons/pack-name/icon-name` imports, never custom SVG code
- **Dates**: Always use `$dayjs` via `const { $dayjs } = useNuxtApp()`, never `new Date()`
- **Date parsing**: For ODM schema dates use `$dayjs(dateValue, 'DD/MM/YYYY')` format
- **No empty functions with comments**: Either implement the function or remove the handler entirely
- **Minimal comments**: Code should be self-explanatory. Only add comments for genuinely complex business logic

## Architecture

- **Stores**: Pinia stores in `stores/`. Firestore connections are made only in stores. Stores are created per collection depending on collection size
- **DRY (pragmatic)**: If something repeats many times, extract it. Otherwise a long script is fine - don't over-abstract
- **ODM Schemas**: Single source of truth in `utils/odm/schemas/` - all Firestore operations MUST use schemas
- **Components**: Modal-based entity management via `ModalStructure.vue` and `TooltipStructure.vue`
- **Component Naming**: Subfolder components prefixed with folder name: `/Sale/DiscountTooltip.vue` -> `<SaleDiscountTooltip />`

### Firebase Optimization
- Use local variable caching to minimize Firebase API calls
- Fetch data once per session, store in local state
- Update local arrays directly after operations, avoid re-fetching
- Pattern: `loadInitialData()` -> `addToCache()` -> `updateInCache()` -> `refreshFromFirebase()`

### Business Configuration (Never hardcode)
- Payment methods, providers, owner accounts: use `paymentMethodsStore` active getters
- Income/expense categories: use `indexStore` active getters
- Always filter by `active: true` when displaying options

### Pricing
- Profit margin in `product.profitMarginPercentage`, cost in `inventory.lastPurchaseCost`
- Use `productStore.calculatePricing()` and `productStore.calculateMarginFromPrice()`
- All pricing changes require user confirmation via modal
