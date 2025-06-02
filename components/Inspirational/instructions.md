Component Purpose
ProductsEditStock.vue is a modal form for editing the stock and cost of a product in an inventory system. It supports different types of stock movements (addition, loss, adjustment, return), tracks suppliers, and provides a preview of the resulting inventory state.

Core Concepts & Structure
1. Modal Structure
The component is wrapped in a modal (ModalStructure), opened via a showModal(productId) method.
The modal header shows product info (name, description, unit).
2. Form State & Movement Types
Uses a FormKit form for input.
Movement types (selected by the user):
Addition: Add stock, set buying price, select supplier.
Loss: Remove stock, specify loss reason, optionally select supplier.
Adjustment: Set new stock and cost directly.
Return: Remove stock (for returns).
The form fields shown depend on the selected movement type.
3. Supplier Autocomplete
Supplier input with autocomplete dropdown.
Suppliers are fetched from the store (productsStore.fetchSuppliers()).
Selecting a supplier fills supplierName and supplierId in the form.
4. Calculations & Validation
Live calculations: As the user enters values, the component calculates:
New stock
New cost (weighted average for additions)
Stock change
Cost difference
Total value difference
Validation: The form is only submittable if the required fields for the selected movement type are valid.
5. Submission Logic
On submit (editProductStock):
Shows a confirmation dialog.
Prepares a stock update object and a movement details object (with type, notes, supplier, etc.).
Calls productsStore.updateStockWithMovement() to persist changes.
Shows a toast on success/failure and closes the modal if successful.
6. Stock Movement History
Shows a recent history of stock movements for the product.
Each movement displays type, quantity, date, and a description.
7. Computed Properties
getMovementTypeLabel: Returns a label for the current movement type.
costDifference/totalValueDifference: Show the impact of the change.
showAdditionTotals: Shows total paid to supplier for additions.
isValid: Determines if the form can be submitted.
8. Methods
selectMovementType(type): Changes the movement type and resets irrelevant fields.
calculateNewValues/calculateFromTotal: Updates calculated values based on input.
onSupplierInput/selectSupplier/onSupplierBlur: Handle supplier autocomplete logic.
fetchStockHistory: Loads recent stock movements for the product.
Key Dependencies
Pinia Store: Uses productsStore for products, suppliers, and stock movements.
FormKit: For form rendering and validation.
ModalStructure: For modal dialog UI.
Toast/ConfirmDialogue: For user feedback and confirmation.
Migration Notes
State Management: You’ll need a store (like Pinia) for products, suppliers, and stock movements.
UI Framework: Replace FormKit, ModalStructure, and icon components with equivalents in your new stack.
Reactivity: Uses Vue’s ref, computed, and watch for state and derived values.
Supplier Autocomplete: Requires a supplier list and filtering logic.
Stock Movement Logic: Ensure your backend or store supports the same movement types and calculation logic.