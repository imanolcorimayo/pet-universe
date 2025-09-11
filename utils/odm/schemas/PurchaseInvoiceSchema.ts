import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, getDocs, query, where, getDoc, doc } from 'firebase/firestore';

export class PurchaseInvoiceSchema extends Schema {
  protected collectionName = 'purchaseInvoice';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    supplierId: {
      type: 'reference',
      required: true,
      referenceTo: 'supplier'
    },
    supplierName: {
      type: 'string',
      required: true,
      maxLength: 200,
      minLength: 1
    },
    invoiceNumber: {
      type: 'string',
      required: true,
      maxLength: 100,
      minLength: 1
    },
    invoiceDate: {
      type: 'date',
      required: true
    },
    invoiceType: {
      type: 'string',
      required: true,
      pattern: /^(A|B|C|X)$/
    },
    status: {
      type: 'string',
      required: true,
      pattern: /^(pending|paid|cancelled)$/,
      default: 'pending'
    },
    amountTotal: {
      type: 'number',
      required: true,
      min: 0.01
    },
    amountAdditional: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    products: {
      type: 'array',
      required: true,
      arrayOf: 'object'
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 1000,
      default: ''
    },
    createdAt: {
      type: 'date',
      required: true
    },
    createdBy: {
      type: 'string',
      required: true
    },
    createdByName: {
      type: 'string',
      required: true,
      maxLength: 200
    },
    updatedAt: {
      type: 'date',
      required: true
    },
    updatedBy: {
      type: 'string',
      required: false
    },
    updatedByName: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    cancelledAt: {
      type: 'date',
      required: false
    },
    cancelledBy: {
      type: 'string',
      required: false
    },
    cancelReason: {
      type: 'string',
      required: false,
      maxLength: 500
    }
  };

  // Validate invoice number uniqueness per supplier
  async validateInvoiceNumber(invoiceNumber: string, supplierId: string, excludeId?: string): Promise<ValidationResult> {
    const errors: any[] = [];
    const businessId = this.getCurrentBusinessId();

    if (!businessId) {
      errors.push({
        field: 'businessId',
        message: 'Business ID is required'
      });
      return { valid: false, errors };
    }

    try {
      const db = this.getFirestore();
      const constraints = [
        where('businessId', '==', businessId),
        where('supplierId', '==', supplierId),
        where('invoiceNumber', '==', invoiceNumber.trim())
      ];

      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        if (!excludeId || existingDoc.id !== excludeId) {
          errors.push({
            field: 'invoiceNumber',
            message: 'An invoice with this number already exists for this supplier'
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'invoiceNumber',
        message: `Failed to validate invoice number uniqueness: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate products array structure
  validateProducts(products: any[]): ValidationResult {
    const errors: any[] = [];

    if (!Array.isArray(products) || products.length === 0) {
      errors.push({
        field: 'products',
        message: 'At least one product is required'
      });
      return { valid: false, errors };
    }

    products.forEach((product, index) => {
      const prefix = `products[${index}]`;

      if (!product.productId || typeof product.productId !== 'string') {
        errors.push({
          field: `${prefix}.productId`,
          message: 'Product ID is required and must be a string'
        });
      }

      if (!product.productName || typeof product.productName !== 'string') {
        errors.push({
          field: `${prefix}.productName`,
          message: 'Product name is required and must be a string'
        });
      }

      if (typeof product.quantity !== 'number' || product.quantity <= 0) {
        errors.push({
          field: `${prefix}.quantity`,
          message: 'Quantity must be a positive number'
        });
      }

      if (typeof product.unitCost !== 'number' || product.unitCost < 0) {
        errors.push({
          field: `${prefix}.unitCost`,
          message: 'Unit cost must be a non-negative number'
        });
      }

      if (typeof product.totalCost !== 'number' || product.totalCost < 0) {
        errors.push({
          field: `${prefix}.totalCost`,
          message: 'Total cost must be a non-negative number'
        });
      }

      // Validate calculation consistency
      const calculatedTotal = product.quantity * product.unitCost;
      if (Math.abs(product.totalCost - calculatedTotal) > 0.01) {
        errors.push({
          field: `${prefix}.totalCost`,
          message: `Total cost (${product.totalCost}) does not match quantity × unit cost (${calculatedTotal})`
        });
      }
    });

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate supplier exists and is active
  async validateSupplierReference(supplierId: string): Promise<ValidationResult> {
    const errors: any[] = [];
    const businessId = this.getCurrentBusinessId();

    if (!businessId) {
      errors.push({
        field: 'businessId',
        message: 'Business ID is required'
      });
      return { valid: false, errors };
    }

    try {
      const db = this.getFirestore();
      const supplierDoc = await getDoc(doc(db, 'supplier', supplierId));

      if (!supplierDoc.exists()) {
        errors.push({
          field: 'supplierId',
          message: 'Supplier does not exist'
        });
      } else {
        const supplierData = supplierDoc.data();
        if (supplierData.businessId !== businessId) {
          errors.push({
            field: 'supplierId',
            message: 'Supplier does not belong to this business'
          });
        }
        if (supplierData.isActive === false) {
          errors.push({
            field: 'supplierId',
            message: 'Cannot create invoice for inactive supplier'
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'supplierId',
        message: `Failed to validate supplier reference: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate total calculations
  validateTotalCalculations(products: any[], amountTotal: number, amountAdditional: number = 0): ValidationResult {
    const errors: any[] = [];

    const productsTotal = products.reduce((sum, product) => sum + (product.totalCost || 0), 0);
    const calculatedTotal = productsTotal + amountAdditional;

    if (Math.abs(amountTotal - calculatedTotal) > 0.01) {
      errors.push({
        field: 'amountTotal',
        message: `Total amount (${amountTotal}) does not match products total (${productsTotal}) + additional amount (${amountAdditional}) = ${calculatedTotal}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate invoice type
  validateInvoiceType(invoiceType: string): ValidationResult {
    const allowedTypes = ['A', 'B', 'C', 'X'];
    const errors: any[] = [];

    if (!allowedTypes.includes(invoiceType)) {
      errors.push({
        field: 'invoiceType',
        message: `Invoice type must be one of: A (Responsable Inscripto), B (Responsable Inscripto a CF), C (Consumidor Final), X (Otros)`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate purchase invoice status transitions
  async validateStatusTransition(invoiceId: string, newStatus: string): Promise<ValidationResult> {
    const errors: any[] = [];

    try {
      const existingInvoice = await this.findById(invoiceId);
      if (!existingInvoice.success || !existingInvoice.data) {
        errors.push({
          field: 'status',
          message: 'Cannot find existing invoice to validate status transition'
        });
        return { valid: false, errors };
      }

      const currentStatus = existingInvoice.data.status;

      // Define valid status transitions
      const validTransitions: Record<string, string[]> = {
        'pending': ['paid', 'cancelled'],
        'paid': [], // Paid invoices cannot be changed
        'cancelled': ['pending'] // Can reactivate cancelled invoices
      };

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        errors.push({
          field: 'status',
          message: `Invalid status transition from '${currentStatus}' to '${newStatus}'`
        });
      }

    } catch (error) {
      errors.push({
        field: 'status',
        message: `Failed to validate status transition: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate cancellation data
  validateCancellationData(data: any): ValidationResult {
    const errors: any[] = [];

    if (data.status === 'cancelled') {
      if (!data.cancelledAt) {
        errors.push({
          field: 'cancelledAt',
          message: 'Cancelled date is required when cancelling invoice'
        });
      }

      if (!data.cancelledBy) {
        errors.push({
          field: 'cancelledBy',
          message: 'Cancelled by user ID is required when cancelling invoice'
        });
      }

      if (!data.cancelReason) {
        errors.push({
          field: 'cancelReason',
          message: 'Cancel reason is required when cancelling invoice'
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Override create to add custom validations
  override async create(data: any, validateRefs = true) {
    // Validate invoice number uniqueness
    const invoiceNumberValidation = await this.validateInvoiceNumber(data.invoiceNumber, data.supplierId);
    if (!invoiceNumberValidation.valid) {
      return { 
        success: false, 
        error: `Invoice number validation failed: ${invoiceNumberValidation.errors.map(e => e.message).join(', ')}` 
      };
    }

    // Validate products array
    const productsValidation = this.validateProducts(data.products);
    if (!productsValidation.valid) {
      return { 
        success: false, 
        error: `Products validation failed: ${productsValidation.errors.map(e => e.message).join(', ')}` 
      };
    }

    // Validate supplier reference
    const supplierValidation = await this.validateSupplierReference(data.supplierId);
    if (!supplierValidation.valid) {
      return { 
        success: false, 
        error: `Supplier validation failed: ${supplierValidation.errors.map(e => e.message).join(', ')}` 
      };
    }

    // Validate total calculations
    const totalValidation = this.validateTotalCalculations(data.products, data.amountTotal, data.amountAdditional);
    if (!totalValidation.valid) {
      return { 
        success: false, 
        error: `Total calculation validation failed: ${totalValidation.errors.map(e => e.message).join(', ')}` 
      };
    }

    // Validate cancellation data if applicable
    if (data.status === 'cancelled') {
      const cancellationValidation = this.validateCancellationData(data);
      if (!cancellationValidation.valid) {
        return { 
          success: false, 
          error: `Cancellation validation failed: ${cancellationValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    // Validate invoice type
    const typeValidation = this.validateInvoiceType(data.invoiceType);
    if (!typeValidation.valid) {
      return { 
        success: false, 
        error: `Invoice type validation failed: ${typeValidation.errors.map(e => e.message).join(', ')}` 
      };
    }

    return super.create(data, validateRefs);
  }

  // Override update to add custom validations
  override async update(id: string, data: any, validateRefs = true) {
    // Get existing document for comparison
    const existingResult = await this.findById(id);
    if (!existingResult.success || !existingResult.data) {
      return { success: false, error: 'Invoice not found' };
    }

    const existingData = existingResult.data;

    // Validate invoice number uniqueness if being updated
    if (data.invoiceNumber && data.invoiceNumber !== existingData.invoiceNumber) {
      const supplierId = data.supplierId || existingData.supplierId;
      const invoiceNumberValidation = await this.validateInvoiceNumber(data.invoiceNumber, supplierId, id);
      if (!invoiceNumberValidation.valid) {
        return { 
          success: false, 
          error: `Invoice number validation failed: ${invoiceNumberValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    // Validate products array if being updated
    if (data.products) {
      const productsValidation = this.validateProducts(data.products);
      if (!productsValidation.valid) {
        return { 
          success: false, 
          error: `Products validation failed: ${productsValidation.errors.map(e => e.message).join(', ')}` 
        };
      }

      // Validate total calculations with updated data
      const amountTotal = data.amountTotal !== undefined ? data.amountTotal : existingData.amountTotal;
      const amountAdditional = data.amountAdditional !== undefined ? data.amountAdditional : existingData.amountAdditional;
      
      const totalValidation = this.validateTotalCalculations(data.products, amountTotal, amountAdditional);
      if (!totalValidation.valid) {
        return { 
          success: false, 
          error: `Total calculation validation failed: ${totalValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    // Validate status transitions if status is being updated
    if (data.status !== undefined && data.status !== existingData.status) {
      const statusValidation = await this.validateStatusTransition(id, data.status);
      if (!statusValidation.valid) {
        return { 
          success: false, 
          error: `Status transition validation failed: ${statusValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    // Validate cancellation data if applicable
    if (data.status === 'cancelled') {
      const cancellationValidation = this.validateCancellationData(data);
      if (!cancellationValidation.valid) {
        return { 
          success: false, 
          error: `Cancellation validation failed: ${cancellationValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    // Validate supplier reference if being updated
    if (data.supplierId && data.supplierId !== existingData.supplierId) {
      const supplierValidation = await this.validateSupplierReference(data.supplierId);
      if (!supplierValidation.valid) {
        return { 
          success: false, 
          error: `Supplier validation failed: ${supplierValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    // Validate invoice type if being updated
    if (data.invoiceType && data.invoiceType !== existingData.invoiceType) {
      const typeValidation = this.validateInvoiceType(data.invoiceType);
      if (!typeValidation.valid) {
        return { 
          success: false, 
          error: `Invoice type validation failed: ${typeValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    return super.update(id, data, validateRefs);
  }

  // Override delete to prevent deletion (maintain audit trail)
  override async delete(id: string) {
    return {
      success: false,
      error: 'Purchase invoices cannot be deleted. Use status cancellation instead to maintain audit trail.'
    };
  }

  /**
   * Find invoices by supplier
   */
  async findBySupplier(supplierId: string, status?: 'pending' | 'paid' | 'cancelled') {
    const conditions: any[] = [
      { field: 'supplierId', operator: '==', value: supplierId }
    ];

    if (status) {
      conditions.push({ field: 'status', operator: '==', value: status });
    }

    return this.find({
      where: conditions,
      orderBy: [{ field: 'invoiceDate', direction: 'desc' }]
    });
  }

  /**
   * Find invoices by status
   */
  async findByStatus(status: 'pending' | 'paid' | 'cancelled', startDate?: Date, endDate?: Date) {
    const conditions: any[] = [
      { field: 'status', operator: '==', value: status }
    ];

    if (startDate) {
      conditions.push({ field: 'invoiceDate', operator: '>=', value: startDate });
    }

    if (endDate) {
      conditions.push({ field: 'invoiceDate', operator: '<=', value: endDate });
    }

    return this.find({
      where: conditions,
      orderBy: [{ field: 'invoiceDate', direction: 'desc' }]
    });
  }

  /**
   * Get pending invoices
   */
  async findPendingInvoices() {
    return this.findByStatus('pending');
  }

  /**
   * Cancel a purchase invoice
   */
  async cancelInvoice(id: string, userId: string, userName: string, reason: string) {
    return this.update(id, {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: userId,
      cancelReason: reason,
      updatedAt: new Date(),
      updatedBy: userId,
      updatedByName: userName
    });
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(id: string, userId: string, userName: string) {
    return this.update(id, {
      status: 'paid',
      updatedAt: new Date(),
      updatedBy: userId,
      updatedByName: userName
    });
  }

  /**
   * Get purchase invoice summary
   */
  async getInvoiceSummary(startDate?: Date, endDate?: Date) {
    const conditions: any[] = [];

    if (startDate) {
      conditions.push({ field: 'invoiceDate', operator: '>=', value: startDate });
    }

    if (endDate) {
      conditions.push({ field: 'invoiceDate', operator: '<=', value: endDate });
    }

    const invoices = await this.find({
      where: conditions,
      orderBy: [{ field: 'invoiceDate', direction: 'desc' }]
    });

    if (!invoices.success || !invoices.data) {
      return { success: false, error: 'Failed to load invoices for summary' };
    }

    const summary = {
      totalInvoices: invoices.data.length,
      pendingCount: 0,
      paidCount: 0,
      cancelledCount: 0,
      totalAmount: 0,
      paidAmount: 0,
      pendingAmount: 0,
      invoicesBySupplier: {} as Record<string, { count: number; amount: number }>,
      invoicesByType: {} as Record<string, { count: number; amount: number }>
    };

    for (const invoice of invoices.data) {
      summary.totalAmount += invoice.amountTotal;
      
      // Count by status
      switch (invoice.status) {
        case 'pending':
          summary.pendingCount++;
          summary.pendingAmount += invoice.amountTotal;
          break;
        case 'paid':
          summary.paidCount++;
          summary.paidAmount += invoice.amountTotal;
          break;
        case 'cancelled':
          summary.cancelledCount++;
          break;
      }

      // Group by supplier (only for non-cancelled)
      if (invoice.status !== 'cancelled') {
        const supplierKey = invoice.supplierName;
        if (!summary.invoicesBySupplier[supplierKey]) {
          summary.invoicesBySupplier[supplierKey] = { count: 0, amount: 0 };
        }
        summary.invoicesBySupplier[supplierKey].count++;
        summary.invoicesBySupplier[supplierKey].amount += invoice.amountTotal;
      }

      // Group by invoice type (only for non-cancelled)
      if (invoice.status !== 'cancelled') {
        const typeKey = invoice.invoiceType;
        if (!summary.invoicesByType[typeKey]) {
          summary.invoicesByType[typeKey] = { count: 0, amount: 0 };
        }
        summary.invoicesByType[typeKey].count++;
        summary.invoicesByType[typeKey].amount += invoice.amountTotal;
      }
    }

    return { success: true, data: summary };
  }
}