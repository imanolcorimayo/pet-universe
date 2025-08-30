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
      maxLength: 50
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 1000,
      default: ''
    },
    additionalCharges: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    totalSpent: {
      type: 'number',
      required: true,
      min: 0
    },
    products: {
      type: 'array',
      required: true,
      arrayOf: 'object'
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
    createdAt: {
      type: 'date',
      required: true
    },
    updatedAt: {
      type: 'date',
      required: true
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
  validateTotalCalculations(products: any[], totalSpent: number, additionalCharges: number = 0): ValidationResult {
    const errors: any[] = [];

    const productsTotal = products.reduce((sum, product) => sum + (product.totalCost || 0), 0);
    const calculatedTotal = productsTotal + additionalCharges;

    if (Math.abs(totalSpent - calculatedTotal) > 0.01) {
      errors.push({
        field: 'totalSpent',
        message: `Total spent (${totalSpent}) does not match products total (${productsTotal}) + additional charges (${additionalCharges}) = ${calculatedTotal}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate invoice type
  validateInvoiceType(invoiceType: string): ValidationResult {
    const allowedTypes = ['A', 'B', 'C', 'factura', 'remito', 'nota_credito', 'nota_debito'];
    const errors: any[] = [];

    if (!allowedTypes.includes(invoiceType)) {
      errors.push({
        field: 'invoiceType',
        message: `Invoice type must be one of: ${allowedTypes.join(', ')}`
      });
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
    const totalValidation = this.validateTotalCalculations(data.products, data.totalSpent, data.additionalCharges);
    if (!totalValidation.valid) {
      return { 
        success: false, 
        error: `Total calculation validation failed: ${totalValidation.errors.map(e => e.message).join(', ')}` 
      };
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
      const totalSpent = data.totalSpent !== undefined ? data.totalSpent : existingData.totalSpent;
      const additionalCharges = data.additionalCharges !== undefined ? data.additionalCharges : existingData.additionalCharges;
      
      const totalValidation = this.validateTotalCalculations(data.products, totalSpent, additionalCharges);
      if (!totalValidation.valid) {
        return { 
          success: false, 
          error: `Total calculation validation failed: ${totalValidation.errors.map(e => e.message).join(', ')}` 
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

  // Override delete to check if invoice can be deleted
  override async delete(id: string) {
    // Note: In a real application, you might want to check if this invoice
    // is referenced in inventory movements or other related entities
    // For now, we'll allow deletion but this provides the framework
    
    return super.delete(id);
  }
}