# DEVELOPMENT PLAN: Fix Global Cash Register - Always Open Concept

**Status:** APPROVED  
**Total Estimated Effort:** LARGE  
**Created:** July 03, 2025  
**Last Updated:** July 03, 2025

## 📋 Next Steps (Priority Order)
1. [ ] **Analyze Current Implementation** - Study existing global cash register code - *Effort: S* - *ETA: 30min*
2. [ ] **Update Database Schema** - Modify globalCashRegister collection structure - *Effort: M* - *ETA: 1h*
3. [ ] **Update Global Cash Store** - Remove opening/closing logic from store - *Effort: L* - *ETA: 2h*
4. [ ] **Create New Dashboard Component** - Build always-open dashboard view - *Effort: L* - *ETA: 3h*
5. [ ] **Update/Remove Modal Components** - Remove opening/closing modals, update transaction modal - *Effort: M* - *ETA: 1h*
6. [ ] **Update Global Cash Page** - Replace current page with new dashboard - *Effort: M* - *ETA: 1h*
7. [ ] **Verify Sales Integration** - Ensure sales summaries still feed correctly - *Effort: S* - *ETA: 30min*
8. [ ] **Add Permission Checks** - Ensure only admin users can access - *Effort: S* - *ETA: 30min*
9. [ ] **Clean Database** - Remove old global cash register data - *Effort: S* - *ETA: 15min*
10. [ ] **Testing** - Manual testing of new workflow - *Effort: M* - *ETA: 1h*

## 🚫 Blocked/Questions
- *None currently - all questions resolved*

## 🔗 Dependencies
- **Internal:** Sales register functionality (must continue working)
- **External:** None
- **Data:** Firebase Firestore globalCashRegister and globalRegisterTransaction collections

## 🏗️ Technical Architecture

### **Components to Remove:**
- `GlobalRegisterOpeningModal.vue` - No longer needed
- `GlobalRegisterClosingModal.vue` - No longer needed

### **Components to Modify:**
- `GlobalTransactionEntryModal.vue` - Remove references to register states
- `/pages/caja-global/index.vue` - Complete overhaul to dashboard style

### **Components to Create:**
- `GlobalCashDashboard.vue` - Main dashboard component
- `GlobalBalanceCard.vue` - Payment method balance display
- `GlobalTransactionList.vue` - Recent transactions list

### **Store Changes:**
- `globalCashRegister.ts` - Remove opening/closing logic, add continuous operation
- Update all CRUD operations for continuous model

### **Database Changes:**
- `globalCashRegister` collection - Simplify structure, remove opening/closing fields
- `globalRegisterTransaction` collection - May need minor updates for continuous operation

## 🧪 Testing Strategy
- **Manual Testing:** 
  - Add transactions in continuous mode
  - Verify sales summaries integration
  - Test permission restrictions
  - Verify balance calculations
- **Integration Tests:** Sales register to global register data flow
- **Cross-browser Testing:** Dashboard responsiveness

## 🚀 Deployment Considerations
- **Environment Variables:** None needed
- **Database Migrations:** Clear existing globalCashRegister data
- **Rollback Plan:** Restore previous components from git history

## 📋 Definition of Done
- [ ] Global cash register operates continuously (no open/close)
- [ ] Dashboard shows real-time balances by payment method
- [ ] Transaction entry works without register state dependencies
- [ ] Sales register summaries continue to feed into global register
- [ ] Only admin users can access the feature
- [ ] All old opening/closing components removed
- [ ] Clean database with no old register data
- [ ] Mobile responsive design
- [ ] Manual testing completed successfully

## 📝 Notes
- This is a fundamental change to the business logic
- Focus on maintaining the sales register integration
- Dashboard should be intuitive and show clear financial overview
- Keep transaction entry simple and efficient