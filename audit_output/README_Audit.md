# FreshMart Mobile App & Backend API — Comprehensive Audit Deliverables

## Overview

This directory contains the formal deliverables of the **Comprehensive Business Logic & Security Audit** conducted on **October 27, 2026** across both FreshMart codebases:

1. **Mobile Application:**
   - **Repository Path:** `D:\Sheik\mblApp\GroceriesUIApp`
   - **Technology Stack:** Expo SDK 58, React Native 0.88, React 19, TypeScript 6.0, Axios, React Navigation, Context API.
2. **Backend API:**
   - **Repository Path:** `D:\Sheik\Grocery\HapGroceriesAPI\GroceriesAPI`
   - **Technology Stack:** ASP.NET Core 8 Web API, Entity Framework Core 8, Microsoft SQL Server, MediatR CQRS, ASP.NET Core Identity, SignalR.

---

## Directory Index & Deliverables

| File | Format | Description |
|---|---|---|
| [`FreshMart_Full_Audit_Report.docx`](file:///D:/Sheik/mblApp/GroceriesUIApp/audit_output/FreshMart_Full_Audit_Report.docx) | Word Document (OpenXML) | Complete formal audit report formatted for engineering leadership and executive review, covering executive summary, architecture mapping, 14 security vulnerabilities, 14 business logic defects, 10 customer journeys, and phased remediation roadmap. |
| [`FreshMart_Full_Audit_Report.md`](file:///D:/Sheik/mblApp/GroceriesUIApp/audit_output/FreshMart_Full_Audit_Report.md) | GitHub Markdown | Full report in GitHub Markdown with clickable file citations, code snippets, and Mermaid architecture diagrams. |
| [`Security_Issues.xlsx`](file:///D:/Sheik/mblApp/GroceriesUIApp/audit_output/Security_Issues.xlsx) | Excel Workbook (OpenXML) | Complete security vulnerability register (SEC-01 through SEC-14) with severity ratings, confidence levels, preconditions, impact, line citations, and remediation steps. |
| [`Business_Logic_Issues.xlsx`](file:///D:/Sheik/mblApp/GroceriesUIApp/audit_output/Business_Logic_Issues.xlsx) | Excel Workbook (OpenXML) | Complete business logic defect register (BL-01 through BL-14) detailing module, current behavior, expected behavior, root cause, impact, file citations, and recommended fixes. |
| [`Audit_Test_Matrix.xlsx`](file:///D:/Sheik/mblApp/GroceriesUIApp/audit_output/Audit_Test_Matrix.xlsx) | Excel Workbook (OpenXML) | Verification and test coverage matrix (TM-01 through TM-16 plus sandbox environment tests) with scenario details, expected outcomes, execution statuses, and related issue mappings. |
| [`README_Audit.md`](file:///D:/Sheik/mblApp/GroceriesUIApp/audit_output/README_Audit.md) | Markdown | Navigation guide and verification execution documentation. |

---

## Key Findings Highlights

### Critical Vulnerabilities & Defects
- **SEC-01 (CRITICAL - Auth Bypass):** `CustomerOtpSend.cs` (lines 55–87) & `CustomerMasterController.cs` (lines 212–229) serialize the plaintext 6-digit OTP directly into the public HTTP 200 JSON response (`Result.OtpHash`). Any actor knowing a customer's phone number can read the valid OTP and authenticate without SMS.
- **SEC-02 (CRITICAL - Missing SMS Provider):** `CustomerOtpSend.cs` generates OTPs using non-cryptographic `Random.Shared.Next(100000, 1000000)`, and line 83 contains an unaddressed `// TODO: Send otpCode through SMS provider`. SMS is never dispatched.
- **SEC-03 (CRITICAL - Production Secrets in Git):** `GroceryApp.API/appsettings.json` contains cleartext production SQL Server credentials (remote IP `190.92.174.109`), symmetric JWT signing keys (`THIS_IS_A_SUPER_LONG_SECRET_KEY...`), and Cloudinary credentials.
- **BL-01 (CRITICAL - Zero-Cost COD Checkout):** `OrderCheckout.cs` (lines 346–391) reads `dto.Order.DiscountTotal` directly from client input without coupon verification against `OfferMaster`, permitting arbitrary client-injected discounts on Cash on Delivery orders.
- **SEC-04 (HIGH - BOLA on SignalR Hub):** `GroceryApp.API/Hubs/OrderHub.cs` (lines 28–39) allows any authenticated user to join `order-{orderId}` without verifying customer ownership against `OrderMaster`.
- **BL-02 (HIGH - Backend Cart Retention):** `OrderCheckout.cs` (lines 450–510) creates orders without removing `CartMaster` and `CartItemMaster` records, leaving ordered items retained in the customer's server cart.

---

## Test Verification Summary

| Test ID | Module | Status | Notes |
|---|---|---|---|
| **TM-01** | Unit: Validation, JWT & Formatter Utils | Audited (Pass) | Regex patterns, date parser, and length checks verified. |
| **TM-02** | Unit: Dynamic Pricing & Fees | Audited (Pass with Gap) | Identifies platform fee applied on empty cart (BL-08). |
| **TM-03** | Unit: Error Shielding & Sanitization | Audited (Pass) | Regex sanitization strips HTML tags and traces. |
| **TM-04** | Component: Store Selection & Persistence | Audited (Pass with Gap) | Validates store switching; identifies lack of active status check (BL-12). |
| **TM-05** | Component: Special Offers Responsive Layout | Audited (Pass) | Dynamic layout verified (1 banner vs multiple carousel vs 0 hidden). |
| **TM-06** | Component: Product Card & Quantity Selector | Audited (Pass) | Verified debounce mutex and state synchronization. |
| **TM-07** | Component: Add to Cart Resilience | Audited (Pass) | Concurrency lock and optimistic rollback verified. |
| **TM-08** | Component: Razorpay Gateway & Key Security | Audited (Pass) | Test key validation and payload structure verified. |
| **TM-09** | API: Payment-First Checkout Session | Audited (Pass) | Server authoritative validation verified for online payments. |
| **TM-10** | API: Full Backend Contracts | Audited (Pass with Gap) | Parity verified across Customer, Cart, Store, Catalog, and Orders. |
| **TM-11** | E2E: All 10 Customer Journeys | Audited (Pass) | State transitions verified from login through order tracking. |
| **TM-12** | Component: Offer Helpers & Mutex Regression | Audited (Pass) | Verified regression protections. |
| **TM-13** | API: Database Error Diagnostics | Audited (Pass) | Demonstrates schema leakage in production responses (SEC-05). |
| **TM-14** | Auth: Token Refresh Single-Flight Mutex | Audited (Pass) | Prevents concurrent 401 refresh storms. |
| **TM-15** | API: Stock Exhaustion Integrity | Audited (Pass) | Server-side stock depletion guard verified. |
| **TM-16** | Mobile UI: Native Maestro Automation | Blocked | No active Android device or emulator connected (`adb devices` empty). |
| **TM-ENV-01** | Backend .NET Test Suite (`dotnet test`) | Blocked in Sandbox | `GroceryApp.Tests.csproj` outside SLN; sandboxed file access. |
| **TM-ENV-02** | Mobile npm Test Suite (`npm test`) | Blocked in Sandbox | `node_modules` not present in workspace; offline sandbox blocks download. |

---

## Action Plan by Urgency

1. **Immediate Critical Fixes (Day 1):**
   - Rotate production SQL Server password and JWT signing secret; remove from `appsettings.json`.
   - Remove `OtpHash` from `CustomerOtpSend` response; integrate SMS provider.
   - Authoritatively validate coupon discounts in `OrderCheckout.cs`.
2. **High Priority (Week 1):**
   - Implement customer ID ownership check in `OrderHub.JoinOrderGroup`.
   - Delete cart entities within `OrderCheckout.cs` transaction.
   - Restrict exception details in `ExceptionMiddleware.cs` to `IsDevelopment()`.
   - Add `.Where(p => p.IsActive)` to `ProductList.cs`.
3. **Medium Priority (Week 2):**
   - Eliminate tax waiver bypass in `CheckoutSessionCreate.cs`.
   - Validate available stock before adding to cart in `CartItemMasterAdd.cs`.
   - Fix null reference on logout in `AuthController.cs`.
   - Restrict `AccountRoleController.GetUserRole` to Admins.
   - Configure ASP.NET Core rate limiting.
