# Active Context

## Current Focus
- Implementing the **Provider Payments** page.
- Integrating real APIs for:
  - Fetching the list of banks (`GET /api/v1/providers/banks`).
  - Verifying bank account details (`POST /api/v1/providers/bank-account/verify`).
- **Fixing Runtime Errors**: Resolved a crash in `ProviderCalendarPage.tsx`.

## Recent Changes
- **Provider Payments**:
  - Added `GET_BANKS` and `VERIFY_ACCOUNT` endpoints to `src/config/api.ts`.
  - Added `fetchBanks`, `useBanks`, `verifyBankAccount`, and `useVerifyBankAccount` to `src/services/providerService.ts`.
  - Updated `ProviderPaymentsPage.tsx` to:
    - Fetch banks using `useBanks` and populate the dropdown.
    - Validate bank selection and account number input.
    - Call `verifyBankAccount` when the "Verify Account Details" button is clicked.
    - Display the resolved account name upon success.
    - Show error messages using `react-hot-toast` if verification fails.
- **Provider Onboarding**: 
  - Implemented smart redirection for completed onboarding.
  - Connected "Finish" button to completion endpoint.

## Next Steps
- Verify the payments verification flow end-to-end with the backend.
- Connect real data to the Provider Dashboard stats and charts (Overview page).
- Implement other provider pages (Services, Reports, etc.).
- **Backend Connection**: Ensure the backend server is running on port 6000 and accessible.

## Active Decisions
- **Bank List Caching**: Cached the bank list for 24 hours (`staleTime: 24 * 60 * 60 * 1000`) in React Query to reduce API calls, as the list of banks rarely changes.
- **Verification UX**: Added a loading state to the "Verify" button and disabled it until valid inputs are provided to improve UX.
- **Smart Redirection**: We check for onboarding status at multiple levels to ensure smooth user flow.
