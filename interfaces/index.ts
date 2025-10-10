// Add to your existing interfaces
export enum StockMovementType {
  ADDITION = "addition", // Adding new stock
  SALE = "sale", // Stock used in a sale
  LOSS = "loss", // Stock lost
  ADJUSTMENT = "adjustment", // Manual stock adjustment
  RETURN = "return" // Product returned
}

export interface StockMovement {
  id?: string;
  businessId: string;
  productId: string;
  productName: string; // For easier reporting
  orderId: string | null; // Add this new field to link directly to orders
  date: any; // Timestamp
  type: StockMovementType; // Type of movement
  quantity: number; // Amount changed (positive or negative)
  previousStock: number; // Stock before the movement
  newStock: number; // Stock after the movement
  previousCost: number; // Cost before the movement (if changed)
  newCost: number; // Cost after the movement (if changed)
  unitBuyingPrice: number | null; // Price paid to supplier (for additions). Price of the stock currently (For returns)
  supplierId: string | null; // Reference to supplier
  supplierName: string | null; // Name of supplier
  notes: string | null; // Additional information
  userUid: string; // User ID who made the change
  createdByName: string; // User name who made the change
  createdAt: any; // Timestamp
}

// Add this to your ToastEvents if not already there
export enum ToastEvents {
  success = "success",
  error = "error",
  warning = "warning",
  info = "info"
}
