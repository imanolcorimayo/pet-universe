import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, query, where, getDocs, getDoc, doc } from 'firebase/firestore';

export class SaleSchema extends Schema {
  protected collectionName = 'sale';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    salesRegisterId: {
      type: 'reference',
      required: true,
      referenceTo: 'salesRegister'
    },
    saleNumber: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 20
    },
    clientId: {
      type: 'reference',
      required: false,
      referenceTo: 'client'
    },
    clientName: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    items: {
      type: 'array',
      required: true,
      arrayOf: 'object'
    },
    paymentDetails: {
      type: 'array',
      required: true,
      arrayOf: 'object'
    },
    subtotal: {
      type: 'number',
      required: true,
      min: 0
    },
    totalDiscount: {
      type: 'number',
      required: true,
      min: 0,
      default: 0
    },
    total: {
      type: 'number',
      required: true,
      min: 0
    },
    isReported: {
      type: 'boolean',
      required: true,
      default: true
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 1000,
      default: ''
    },
    createdBy: {
      type: 'string',
      required: true
    },
    createdByName: {
      type: 'string',
      required: true
    },
    createdAt: {
      type: 'date',
      required: true
    },
    updatedAt: {
      type: 'date',
      required: true
    },
    inventoryUpdated: {
      type: 'boolean',
      required: true,
      default: false
    },
    inventoryUpdateAt: {
      type: 'date',
      required: false
    }
  };

  /**
   * Custom validation for sale creation
   */
  override async create(data: any, validateRefs = true) {
    // Validate sale-specific business rules
    const validation = this.validateSaleData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Sale validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate that sales register is open
    if (validateRefs) {
      const registerValidation = await this.validateSalesRegister(data.salesRegisterId);
      if (!registerValidation.valid) {
        return {
          success: false,
          error: `Sales register validation failed: ${registerValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.create(data, validateRefs);
  }

  /**
   * Sales should generally not be updatable (maintain audit trail)
   * Only allow specific field updates like inventory flags
   */
  override async update(id: string, data: any, validateRefs = true) {
    const allowedUpdates = ['inventoryUpdated', 'inventoryUpdateAt', 'notes'];
    const updates = Object.keys(data);
    const invalidUpdates = updates.filter(key => !allowedUpdates.includes(key));

    if (invalidUpdates.length > 0) {
      return {
        success: false,
        error: `Invalid sale update. Only these fields can be updated: ${allowedUpdates.join(', ')}. Attempted to update: ${invalidUpdates.join(', ')}`
      };
    }

    return super.update(id, data, false); // Skip reference validation for inventory updates
  }

  /**
   * Sales should not be deletable (maintain audit trail)
   */
  override async delete(id: string) {
    return {
      success: false,
      error: 'Sales cannot be deleted. Contact system administrator if adjustment is needed.'
    };
  }

  /**
   * Validate sale data business rules
   */
  private validateSaleData(data: any): ValidationResult {
    const errors: any[] = [];

    // Validate items array
    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
      errors.push({
        field: 'items',
        message: 'Sale must contain at least one item'
      });
    } else {
      // Validate each item
      for (let i = 0; i < data.items.length; i++) {
        const itemErrors = this.validateSaleItem(data.items[i], i);
        errors.push(...itemErrors);
      }
    }

    // Validate payment details array
    if (!data.paymentDetails || !Array.isArray(data.paymentDetails) || data.paymentDetails.length === 0) {
      errors.push({
        field: 'paymentDetails',
        message: 'Sale must contain at least one payment method'
      });
    } else {
      // Validate each payment
      for (let i = 0; i < data.paymentDetails.length; i++) {
        const paymentErrors = this.validatePaymentDetail(data.paymentDetails[i], i);
        errors.push(...paymentErrors);
      }
    }

    // Validate amount calculations
    const calculationErrors = this.validateAmountCalculations(data);
    errors.push(...calculationErrors);

    // Validate sale number format (should be sequential)
    if (data.saleNumber && !/^\d{3,}$/.test(data.saleNumber)) {
      errors.push({
        field: 'saleNumber',
        message: 'Sale number should be a numeric string with at least 3 digits'
      });
    }

    // Validate client data consistency
    if (data.clientId && !data.clientName) {
      errors.push({
        field: 'clientName',
        message: 'Client name is required when client ID is provided'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual sale item
   */
  private validateSaleItem(item: any, index: number): any[] {
    const errors: any[] = [];
    const prefix = `Item ${index + 1}:`;

    // Required fields
    const requiredFields = ['productId', 'productName', 'quantity', 'unitType', 'unitPrice', 'totalPrice', 'priceType'];
    for (const field of requiredFields) {
      if (!item[field] && item[field] !== 0) {
        errors.push({
          field: `items[${index}].${field}`,
          message: `${prefix} ${field} is required`
        });
      }
    }

    // Validate numeric fields
    if (item.quantity && item.quantity <= 0) {
      errors.push({
        field: `items[${index}].quantity`,
        message: `${prefix} Quantity must be greater than 0`
      });
    }

    if (item.unitPrice && item.unitPrice <= 0) {
      errors.push({
        field: `items[${index}].unitPrice`,
        message: `${prefix} Unit price must be greater than 0`
      });
    }

    if (item.totalPrice && item.totalPrice <= 0) {
      errors.push({
        field: `items[${index}].totalPrice`,
        message: `${prefix} Total price must be greater than 0`
      });
    }

    if (item.appliedDiscount < 0) {
      errors.push({
        field: `items[${index}].appliedDiscount`,
        message: `${prefix} Applied discount cannot be negative`
      });
    }

    // Validate unit type
    if (item.unitType && !['unit', 'kg'].includes(item.unitType)) {
      errors.push({
        field: `items[${index}].unitType`,
        message: `${prefix} Unit type must be 'unit' or 'kg'`
      });
    }

    // Validate price type
    if (item.priceType && !['regular', 'cash', 'vip', 'bulk', 'promotion'].includes(item.priceType)) {
      errors.push({
        field: `items[${index}].priceType`,
        message: `${prefix} Invalid price type: ${item.priceType}`
      });
    }

    // Validate price calculations
    if (item.quantity && item.unitPrice && item.appliedDiscount !== undefined && item.totalPrice) {
      const expectedTotal = (item.quantity * item.unitPrice) - item.appliedDiscount;
      if (Math.abs(item.totalPrice - expectedTotal) > 0.01) {
        errors.push({
          field: `items[${index}].totalPrice`,
          message: `${prefix} Price calculation error. Expected: ${expectedTotal.toFixed(2)}, Got: ${item.totalPrice.toFixed(2)}`
        });
      }
    }

    return errors;
  }

  /**
   * Validate payment detail
   */
  private validatePaymentDetail(payment: any, index: number): any[] {
    const errors: any[] = [];
    const prefix = `Payment ${index + 1}:`;

    // Required fields
    if (!payment.paymentMethod) {
      errors.push({
        field: `paymentDetails[${index}].paymentMethod`,
        message: `${prefix} Payment method is required`
      });
    }

    if (!payment.amount || payment.amount <= 0) {
      errors.push({
        field: `paymentDetails[${index}].amount`,
        message: `${prefix} Payment amount must be greater than 0`
      });
    }

    return errors;
  }

  /**
   * Validate amount calculations for the entire sale
   */
  private validateAmountCalculations(data: any): any[] {
    const errors: any[] = [];

    if (!data.items || !data.paymentDetails) {
      return errors; // Already handled in main validation
    }

    // Calculate expected subtotal from items
    const calculatedSubtotal = data.items.reduce((sum: number, item: any) => {
      return sum + ((item.quantity * item.unitPrice) || 0);
    }, 0);

    if (Math.abs(data.subtotal - calculatedSubtotal) > 0.01) {
      errors.push({
        field: 'subtotal',
        message: `Subtotal calculation error. Expected: ${calculatedSubtotal.toFixed(2)}, Got: ${data.subtotal.toFixed(2)}`
      });
    }

    // Calculate expected total discount from items
    const calculatedDiscount = data.items.reduce((sum: number, item: any) => {
      return sum + (item.appliedDiscount || 0);
    }, 0);

    if (Math.abs(data.totalDiscount - calculatedDiscount) > 0.01) {
      errors.push({
        field: 'totalDiscount',
        message: `Total discount calculation error. Expected: ${calculatedDiscount.toFixed(2)}, Got: ${data.totalDiscount.toFixed(2)}`
      });
    }

    // Validate final total
    const expectedTotal = data.subtotal - data.totalDiscount;
    if (Math.abs(data.total - expectedTotal) > 0.01) {
      errors.push({
        field: 'total',
        message: `Total calculation error. Expected: ${expectedTotal.toFixed(2)}, Got: ${data.total.toFixed(2)}`
      });
    }

    // Validate payment total matches sale total
    const paymentTotal = data.paymentDetails.reduce((sum: number, payment: any) => {
      return sum + (payment.amount || 0);
    }, 0);

    if (Math.abs(paymentTotal - data.total) > 0.01) {
      errors.push({
        field: 'paymentDetails',
        message: `Payment total (${paymentTotal.toFixed(2)}) does not match sale total (${data.total.toFixed(2)})`
      });
    }

    return errors;
  }

  /**
   * Validate that sales register is open and available
   */
  private async validateSalesRegister(salesRegisterId: string): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        errors.push({
          field: 'businessId',
          message: 'Business ID is required'
        });
        return { valid: false, errors };
      }

      const registerDoc = await getDoc(doc(db, 'salesRegister', salesRegisterId));

      if (!registerDoc.exists()) {
        errors.push({
          field: 'salesRegisterId',
          message: `Sales register with ID ${salesRegisterId} not found`
        });
        return { valid: false, errors };
      }

      const register = registerDoc.data();

      // Validate register belongs to current business
      if (register.businessId !== businessId) {
        errors.push({
          field: 'salesRegisterId',
          message: 'Sales register does not belong to current business'
        });
      }

      // Validate register is open (not closed)
      if (register.closedAt) {
        errors.push({
          field: 'salesRegisterId',
          message: 'Cannot create sales in a closed register'
        });
      }

    } catch (error) {
      errors.push({
        field: 'salesRegisterId',
        message: `Failed to validate sales register: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Find sales for a specific sales register
   */
  async findSalesByRegister(salesRegisterId: string) {
    return this.find({
      where: [
        { field: 'salesRegisterId', operator: '==', value: salesRegisterId }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find sales for a specific client
   */
  async findSalesByClient(clientId: string) {
    return this.find({
      where: [
        { field: 'clientId', operator: '==', value: clientId }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Find sales within a date range
   */
  async findSalesByDateRange(startDate: Date, endDate: Date) {
    return this.find({
      where: [
        { field: 'createdAt', operator: '>=', value: startDate },
        { field: 'createdAt', operator: '<=', value: endDate }
      ],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });
  }

  /**
   * Get sales summary for a time period
   */
  async getSalesSummary(startDate?: Date, endDate?: Date) {
    const conditions: any[] = [];

    if (startDate) {
      conditions.push({ field: 'createdAt', operator: '>=', value: startDate });
    }

    if (endDate) {
      conditions.push({ field: 'createdAt', operator: '<=', value: endDate });
    }

    const sales = await this.find({
      where: conditions,
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    });

    if (!sales.success || !sales.data) {
      return { success: false, error: 'Failed to load sales for summary' };
    }

    const summary = {
      totalSales: sales.data.length,
      totalAmount: 0,
      totalSubtotal: 0,
      totalDiscount: 0,
      reportedAmount: 0,
      unreportedAmount: 0,
      averageSale: 0,
      salesByClient: {} as Record<string, { count: number; amount: number }>,
      salesByPaymentMethod: {} as Record<string, { count: number; amount: number }>,
      inventoryUpdatedCount: 0
    };

    for (const sale of sales.data) {
      summary.totalAmount += sale.total;
      summary.totalSubtotal += sale.subtotal;
      summary.totalDiscount += sale.totalDiscount;

      // Track reported vs unreported
      if (sale.isReported) {
        summary.reportedAmount += sale.total;
      } else {
        summary.unreportedAmount += sale.total;
      }

      // Track inventory update status
      if (sale.inventoryUpdated) {
        summary.inventoryUpdatedCount++;
      }

      // Group by client
      const clientKey = sale.clientName || 'Casual Customer';
      if (!summary.salesByClient[clientKey]) {
        summary.salesByClient[clientKey] = { count: 0, amount: 0 };
      }
      summary.salesByClient[clientKey].count++;
      summary.salesByClient[clientKey].amount += sale.total;

      // Group by payment method
      if (sale.paymentDetails && Array.isArray(sale.paymentDetails)) {
        for (const payment of sale.paymentDetails) {
          if (!summary.salesByPaymentMethod[payment.paymentMethod]) {
            summary.salesByPaymentMethod[payment.paymentMethod] = { count: 0, amount: 0 };
          }
          summary.salesByPaymentMethod[payment.paymentMethod].count++;
          summary.salesByPaymentMethod[payment.paymentMethod].amount += payment.amount;
        }
      }
    }

    summary.averageSale = summary.totalSales > 0 ? summary.totalAmount / summary.totalSales : 0;

    return { success: true, data: summary };
  }

  /**
   * Create wallet transactions for a sale
   */
  async createWalletTransactions(saleId: string, wallets: any[], globalCashId: string) {
    // This would integrate with WalletSchema to create the actual wallet transactions
    // Implementation would be handled by the business logic layer
    return { success: true, message: 'Wallet transactions would be created by business logic layer' };
  }

  /**
   * Create daily cash transaction for a sale
   */
  async createDailyCashTransaction(saleId: string, dailyCashSnapshotId: string, cashRegisterId: string, cashRegisterName: string, cashAmount: number) {
    // This would integrate with DailyCashTransactionSchema to create the cash transaction
    // Implementation would be handled by the business logic layer
    return { success: true, message: 'Daily cash transaction would be created by business logic layer' };
  }
}