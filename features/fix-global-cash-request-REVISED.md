# FEATURE REQUEST: Fix Global Cash Register - Always Open Concept

**Status:** PLANNING  
**Priority:** HIGH  
**Estimated Effort:** LARGE  
**Created:** July 02, 2025  
**Last Updated:** July 03, 2025

## 📋 Description
Change the Global Cash Register from a weekly open/close cycle to an "always open" concept. The global register should continuously track business income and expenses without the concept of opening/closing periods. Users should always be able to view progress, add transactions, and see real-time financial status.

## 🎯 Business Requirements
- [ ] **Remove opening/closing concept** from Global Cash Register
- [ ] **Continuous transaction tracking** - always able to add income/expense entries
- [ ] **Real-time financial dashboard** showing current balances and transaction history
- [ ] **Admin-only access** to global cash register functionality
- [ ] **Maintain integration** with sales register daily summaries
- [ ] **Historical data preservation** during transition

## 🏗️ Technical Considerations
- **Dependencies:** Sales registers (ventas) will continue with daily open/close cycles
- **Database Changes:** 
  - `globalCashRegister` - Remove opening/closing workflow
  - `globalRegisterTransaction` - Adapt for continuous operation
  - Verify impact on `sale`, `salesRegisterExpense`, `salesRegister`
- **Performance Impact:** Minimal - removing workflow complexity
- **Security Considerations:** Ensure only admin/manager roles can access

## ❓ Questions for Discussion
- [x] **Q1:** How should we handle the transition from existing weekly registers to continuous operation? - *Status: ANSWERED* - **Answer:** Delete old data (development mode)
- [x] **Q2:** Should we maintain historical weekly summaries for reporting purposes? - *Status: ANSWERED* - **Answer:** No problem with removing them
- [x] **Q3:** What should happen to existing "open" global registers during transition? - *Status: ANSWERED* - **Answer:** Delete old data
- [x] **Q4:** Should daily sales summaries still auto-feed into the global register? - *Status: ANSWERED* - **Answer:** Yes, continue this integration
- [x] **Q5:** Do you want to keep track of running balances by payment method? - *Status: ANSWERED* - **Answer:** By payment method and total, both
- [x] **Q6:** Should we add filtering/date range views for the continuous transaction list? - *Status: ANSWERED* - **Answer:** Dashboard style view

## ✅ Acceptance Criteria
- [ ] **Global register always accessible** - no opening/closing required
- [ ] **All existing transaction types** continue to work (purchases, expenses, sales summaries)
- [ ] **Real-time balance calculations** by payment method
- [ ] **Admin permissions enforced** - only authorized users can access
- [ ] **Sales register integration** continues to work unchanged
- [ ] **Historical data preserved** during transition
- [ ] **UI updated** to remove opening/closing workflows
- [ ] **Components removed/updated:**
  - ~~`GlobalRegisterOpeningModal.vue`~~ (remove or repurpose)
  - ~~`GlobalRegisterClosingModal.vue`~~ (remove or repurpose)
  - `GlobalTransactionEntryModal.vue` (keep, may need updates)

## 🎨 UI/UX Requirements
- **Desktop:** Dashboard view with real-time balances and transaction entry
- **Mobile:** Responsive design for transaction viewing and entry
- **Accessibility:** Maintain existing accessibility standards

## 🔗 Related Features/Issues
- **Sales Register (ventas)** - Must continue daily open/close cycles
- **Transaction Entry** - Continuous operation
- **Financial Reporting** - May need updates for continuous data

## 📝 Notes
This is a significant conceptual change that affects the core workflow of the global cash register. Need to carefully plan the transition to avoid data loss or business disruption.