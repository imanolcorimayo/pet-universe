# FEATURE REQUEST: [Feature Name]

**Status:** PLANNING  
**Priority:** HIGH  
**Estimated Effort:** MEDIUM  
**Created:** July 02, 2025  
**Last Updated:** July 02, 2025

## 📋 Description
Per my conversation with my client, the "Global" cash register should "Siempre abierta, no se juega con el concepto de apertura". This means, it's always open, it does not close. So I'm always able to see the progress on the cash register, the incomes and the outcomes. What you should do then is to fix the current behavior and adapt the system to this concept

## 🎯 Business Requirements
- [1] Modify the concept for Global Cash register
- [2] Make sure the permissions only allows admin users to enter this page
- [3] Make sure to update the instructions where this is listed: 
    - `GlobalRegisterOpeningModal.vue` - Opening the weekly global register
    - `GlobalTransactionEntryModal.vue` - New major business transactions
    - `GlobalRegisterClosingModal.vue` - End-of-week closing with sales register summaries

## 🏗️ Technical Considerations
- **Dependencies:** It depends of the "ventas" which will work with the concept of opening and closign
- **Database Changes:** globalCashRegister, globalRegisterTransaction. Chech if sale, salesRegisterExpense and salesRegister needs to change. These collections are closely connected
- **Performance Impact:** N/A
- **Security Considerations:** Permissions only

## ❓ Questions for Discussion
- N/A

## ✅ Acceptance Criteria
- N/A

## 🎨 UI/UX Requirements
- N/A

## 🔗 Related Features/Issues
- Related features are all regarding sales (ventas)

## 📝 Notes
- N/A