import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { getDoc, doc } from 'firebase/firestore';

export class SaleSchema extends Schema {
  protected collectionName = 'sale';

  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
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
    dailyCashSnapshotId: {
      type: 'reference',
      required: true,
      referenceTo: 'dailyCashSnapshot'
    },
    cashRegisterId: {
      type: 'reference',
      required: true,
      referenceTo: 'cashRegister'
    },
    cashRegisterName: {
      type: 'string',
      required: true,
      maxLength: 100
    },
    debtId: {
      type: 'reference',
      required: false,
      referenceTo: 'debt'
    },
    settlementId: {
      type: 'reference',
      required: false,
      referenceTo: 'settlement'
    },
    saleNumber: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 20
    },
    products: {
      type: 'array',
      required: true,
      arrayOf: 'object'
    },
    amountTotal: {
      type: 'number',
      required: true,
      min: 0
    },
    discountTotal: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    surcharge: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
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
  override async create(data: any, validateRefs = false) {
    // Validate sale-specific business rules
    const validation = this.validateSaleData(data);
    if (!validation.valid) {
      return {
        success: false,
        error: `Sale validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Validate that daily cash snapshot is open
    if (validateRefs) {
      const snapshotValidation = await this.validateDailyCashSnapshot(data.dailyCashSnapshotId);
      if (!snapshotValidation.valid) {
        return {
          success: false,
          error: `Daily cash snapshot validation failed: ${snapshotValidation.errors.map(e => e.message).join(', ')}`
        };
      }
    }

    return super.create(data, validateRefs);
  }

  /**
   * Sales should generally not be updatable (maintain audit trail)
   * Only allow specific field updates like inventory flags
   */
  override async update(id: string, data: any, validateRefs = false) {
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

    // Validate products array
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      errors.push({
        field: 'products',
        message: 'Sale must contain at least one product'
      });
    } else {
      // Validate each product
      for (let i = 0; i < data.products.length; i++) {
        const productErrors = this.validateSaleProduct(data.products[i], i);
        errors.push(...productErrors);
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

    // Validate cash register data consistency
    if (data.cashRegisterId && !data.cashRegisterName) {
      errors.push({
        field: 'cashRegisterName',
        message: 'Cash register name is required when cash register ID is provided'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual sale product
   */
  private validateSaleProduct(product: any, index: number): any[] {
    const errors: any[] = [];
    const prefix = `Product ${index + 1}:`;

    // Required fields for financial schema
    const requiredFields = ['productId', 'productName', 'quantity', 'unitType', 'unitPrice', 'totalPrice', 'priceType'];
    for (const field of requiredFields) {
      if (!product[field] && product[field] !== 0) {
        errors.push({
          field: `products[${index}].${field}`,
          message: `${prefix} ${field} is required`
        });
      }
    }

    // Validate numeric fields
    if (product.quantity && product.quantity <= 0) {
      errors.push({
        field: `products[${index}].quantity`,
        message: `${prefix} Quantity must be greater than 0`
      });
    }

    if (product.unitPrice && product.unitPrice <= 0) {
      errors.push({
        field: `products[${index}].unitPrice`,
        message: `${prefix} Unit price must be greater than 0`
      });
    }

    if (product.totalPrice && product.totalPrice <= 0) {
      errors.push({
        field: `products[${index}].totalPrice`,
        message: `${prefix} Total price must be greater than 0`
      });
    }

    if (product.appliedDiscount < 0) {
      errors.push({
        field: `products[${index}].appliedDiscount`,
        message: `${prefix} Applied discount cannot be negative`
      });
    }

    // Validate unit type
    if (product.unitType && !['unit', 'kg'].includes(product.unitType)) {
      errors.push({
        field: `products[${index}].unitType`,
        message: `${prefix} Unit type must be 'unit' or 'kg'`
      });
    }

    // Validate price type
    if (product.priceType && !['regular', 'cash', 'vip', 'bulk', 'promotion', 'threePlusDiscount'].includes(product.priceType)) {
      errors.push({
        field: `products[${index}].priceType`,
        message: `${prefix} Invalid price type: ${product.priceType}`
      });
    }

    return errors;
  }

  /**
   * Validate amount calculations for the entire sale (new financial schema)
   */
  private validateAmountCalculations(data: any): any[] {
    const errors: any[] = [];

    if (!data.products) {
      return errors; // Already handled in main validation
    }

    // Calculate expected total from products
    const calculatedProductTotal = data.products.reduce((sum: number, product: any) => {
      return sum + (product.totalPrice || 0);
    }, 0);

    // Calculate expected discount total from products
    const calculatedDiscountTotal = data.products.reduce((sum: number, product: any) => {
      return sum + (product.appliedDiscount || 0);
    }, 0);

    // Validate discount total if provided
    if (data.discountTotal !== undefined && Math.abs(data.discountTotal - calculatedDiscountTotal) > 0.01) {
      errors.push({
        field: 'discountTotal',
        message: `Discount total calculation error. Expected: ${calculatedDiscountTotal.toFixed(2)}, Got: ${data.discountTotal.toFixed(2)}`
      });
    }

    // Calculate expected amount total (products total + surcharge)
    const expectedAmountTotal = calculatedProductTotal + (data.surcharge || 0);
    if (Math.abs(data.amountTotal - expectedAmountTotal) > 0.01) {
      errors.push({
        field: 'amountTotal',
        message: `Amount total calculation error. Expected: ${expectedAmountTotal.toFixed(2)}, Got: ${data.amountTotal.toFixed(2)}`
      });
    }

    return errors;
  }

  /**
   * Validate that daily cash snapshot is open and available
   */
  private async validateDailyCashSnapshot(dailyCashSnapshotId: string): Promise<ValidationResult> {
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

      const snapshotDoc = await getDoc(doc(db, 'dailyCashSnapshot', dailyCashSnapshotId));

      if (!snapshotDoc.exists()) {
        errors.push({
          field: 'dailyCashSnapshotId',
          message: `Daily cash snapshot with ID ${dailyCashSnapshotId} not found`
        });
        return { valid: false, errors };
      }

      const snapshot = snapshotDoc.data();

      // Validate snapshot belongs to current business
      if (snapshot.businessId !== businessId) {
        errors.push({
          field: 'dailyCashSnapshotId',
          message: 'Daily cash snapshot does not belong to current business'
        });
      }

      // Validate snapshot is open (not closed)
      if (snapshot.status !== 'open') {
        errors.push({
          field: 'dailyCashSnapshotId',
          message: `Cannot create sales in a ${snapshot.status} daily cash snapshot`
        });
      }

    } catch (error) {
      errors.push({
        field: 'dailyCashSnapshotId',
        message: `Failed to validate daily cash snapshot: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

}