

# Fix: ProtectedRoute Infinite Loading / Wrong State

## Root Cause

The `ProtectedRoute` component has a **race condition** between `getSession()` and `onAuthStateChange`:

1. When navigating to a protected page, `getSession()` is called immediately
2. But Supabase may not have finished hydrating the session from localStorage yet, so `getSession()` returns `null`
3. The component immediately resolves to `"no-session"` -- showing the "exclusive content" overlay
4. The `onAuthStateChange` listener fires an `INITIAL_SESSION` event shortly after, but the current code **does not handle it** (only `SIGNED_OUT`, `SIGNED_IN`, and `TOKEN_REFRESHED` are handled). So the event is ignored
5. On the **first visit** it sometimes works because the session loads fast enough. On **subsequent visits** or route changes, the timing shifts and the bug appears

This is why the **homepage works fine** (it's not wrapped in `ProtectedRoute`) but all other pages show the lock overlay or get stuck loading.

## Solution

Rewrite the `ProtectedRoute` auth logic to use `onAuthStateChange` as the **primary** source of truth (the Supabase-recommended pattern), instead of relying on `getSession()` which can return stale/null data:

### File: `src/components/auth/ProtectedRoute.tsx`

1. **Handle the `INITIAL_SESSION` event** -- treat it the same as `SIGNED_IN`: run the full check with the session from the callback
2. **Use the session from the callback** parameter instead of calling `getSession()` again -- the callback always provides the correct session object
3. **Remove the separate `getSession()` call** as the initial check -- `onAuthStateChange` with `INITIAL_SESSION` covers this
4. **Keep silent re-check for `TOKEN_REFRESHED`** -- don't reset to loading state
5. **Keep the 10-second safety timeout** as a fallback

### Technical Details

The key change is refactoring `check()` to accept a `session` parameter from the callback rather than calling `getSession()` internally:

```text
Before:
  check() -> calls getSession() internally -> may get null
  onAuthStateChange -> ignores INITIAL_SESSION

After:
  onAuthStateChange(INITIAL_SESSION, session) -> check(session)
  onAuthStateChange(SIGNED_IN, session) -> check(session)  
  onAuthStateChange(TOKEN_REFRESHED, session) -> silent check(session)
  onAuthStateChange(SIGNED_OUT) -> set "no-session"
```

This ensures the session object used for checking is always the one Supabase provides directly, eliminating the race condition entirely.
