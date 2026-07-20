# End-to-end tests

Critical journey (run manually or with Playwright once browsers are installed):

1. Signup with email + password → signed in
2. Login → browse shop → add to cart
3. Checkout with saved address → UPI payment screen (server `expires_at`)
4. Submit UTR → verification pending
5. Admin approves → order Processing

Suggested Playwright install (optional):

```bash
cd frontend
npx playwright install
# add specs under e2e/ when ready
```

Backend integration coverage for auth, cart pricing, oversell, and payment transitions lives in `backend/tests/`.
