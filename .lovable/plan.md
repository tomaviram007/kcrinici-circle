
# Plan: Fix Dialog Warnings and Infinite Loading Issue

## Issue 1: Console Warning - Missing DialogDescription
The Events page dialog (`DialogContent`) is missing `DialogTitle` and `DialogDescription` accessibility attributes, which causes the React warning shown in the screenshot. The dialog uses a custom layout without the standard `DialogHeader`/`DialogTitle`/`DialogDescription` components.

**Fix:** Add visually hidden `DialogTitle` and `DialogDescription` inside the Events page dialog using `sr-only` class so they exist for accessibility but don't affect the visual layout.

Similarly, review all other dialogs in the Gallery page (lightbox, photo edit, add-by-link) for the same issue.

---

## Issue 2: Pages Stuck on Loading on Second Visit
The `ProtectedRoute` component listens to `onAuthStateChange`. When `TOKEN_REFRESHED` fires (which happens frequently, especially on navigation), the component:
1. Resets `resolved.current = false`
2. Sets state back to `"loading"`
3. Calls `check()` again

This creates a loop where every token refresh re-triggers the full loading state, causing the spinner to show and the page to appear stuck -- especially on repeat visits when the token is being refreshed.

**Fix:** Modify the `onAuthStateChange` handler in `ProtectedRoute.tsx`:
- If the state is already `"ok"` and a `TOKEN_REFRESHED` event fires, do NOT reset to `"loading"`. Instead, silently re-check in the background without showing the spinner.
- Only reset to `"loading"` on `SIGNED_IN` (which indicates a new login, not a refresh).
- On `SIGNED_OUT`, immediately set to `"no-session"` (this already works correctly).

---

## Technical Details

### File: `src/components/auth/ProtectedRoute.tsx`
- Lines 141-149: Change the `onAuthStateChange` handler:
  - For `TOKEN_REFRESHED`: call `check()` without resetting state to `"loading"` (silent re-validation)
  - For `SIGNED_IN`: keep current behavior (reset + re-check)

### File: `src/pages/Events.tsx`
- Line 254: Add visually hidden `DialogTitle` and `DialogDescription` inside the `DialogContent` for accessibility compliance

### File: `src/pages/Gallery.tsx`
- Review all `Dialog` instances (lightbox, photo edit, add-by-link dialogs) and add missing `DialogTitle`/`DialogDescription` where needed

### File: `src/pages/Members.tsx`
- Verify the edit profile dialog has proper accessibility attributes
