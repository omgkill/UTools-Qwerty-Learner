# Changelog

## 2026-02-13

### Fixes

#### 1. Restore `preload.js` Functionality
- **Files Modified**: 
  - `public/preload.js`
  - `public/preload/services.js`
  - `build/preload.js`
- **Details**:
  - Implemented missing uTools API integrations.
  - Added Node.js API exposure (`fs`, `path`, `process`).
  - Added `window.getMode()` for mode detection ("typing" vs "moyu").
  - Implemented database wrappers (`postDB`, `getDB`) with `Uint8Array` support for user data and mistake DB.
  - Implemented local dictionary management (`readLocalDictConfig`, `writeLocalDictConfig`, `newLocalDictFromJson`, `readLocalDict`, `delLocalDict`).

#### 2. Fix Mixpanel Initialization Crash
- **File Modified**: `src/index.tsx`
- **Details**:
  - Added null checks for `import.meta.env.VITE_MIXPANEL_KEY` and `VITE_MIXPANEL_KEY_DEV`.
  - Added a mock `mixpanel.track` function when API keys are missing to prevent `Uncaught TypeError` crashes in development environments without configured env variables.

### Features / Modifications

#### 1. Unlock VIP Features
- **File Modified**: `src/utils/utools.ts`
- **Details**:
  - **Permanent VIP**: Modified `processPayment` to forcibly set `localStorage.getItem('x-vipState')` to `'c'` (Permanent VIP) regardless of payment status.
  - **Unlock Conceal Mode**: Modified `setConcealFeature` to bypass VIP status checks, enabling "Moyu" mode for all users.
