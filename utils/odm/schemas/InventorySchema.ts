import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, getDocs, query, where } from 'firebase/firestore';

export class InventorySchema extends Schema {
  protected collectionName = 'inventory';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    productId: {
      type: 'reference',
      required: true,
      referenceTo: 'product'
    },
    productName: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    unitsInStock: {
      type: 'number',
      required: true,
      min: 0,
      default: 0
    },
    openUnitsWeight: {
      type: 'number',
      required: true,
      min: 0,
      default: 0
    },
    totalWeight: {
      type: 'number',
      required: true,
      min: 0,
      default: 0
    },
    minimumStock: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    isLowStock: {
      type: 'boolean',
      required: false,
      default: true
    },
    lastPurchaseCost: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    lastPurchaseAt: {
      type: 'date',
      required: false
    },
    lastSupplierId: {
      type: 'string',
      required: false
    },
    lastMovementAt: {
      type: 'date',
      required: false
    },
    lastMovementType: {
      type: 'string',
      required: false
    },
    lastMovementBy: {
      type: 'string',
      required: false
    },
    createdBy: {
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
    }
  };

  // Validate movement type values
  validateMovementType(data: any): ValidationResult {
    const errors: any[] = [];
    const validMovementTypes = ['sale', 'purchase', 'adjustment', 'opening', 'conversion', 'loss', 'return'];
    
    if (data.lastMovementType && !validMovementTypes.includes(data.lastMovementType)) {
      errors.push({
        field: 'lastMovementType',
        message: 'Movement type must be one of: sale, purchase, adjustment, opening, conversion, loss, return'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate stock quantities consistency
  validateStockQuantities(data: any): ValidationResult {
    const errors: any[] = [];
    
    // Check that all stock quantities are non-negative
    if (data.unitsInStock !== undefined && data.unitsInStock < 0) {
      errors.push({
        field: 'unitsInStock',
        message: 'Units in stock cannot be negative'
      });
    }
    
    if (data.openUnitsWeight !== undefined && data.openUnitsWeight < 0) {
      errors.push({
        field: 'openUnitsWeight',
        message: 'Open units weight cannot be negative'
      });
    }
    
    if (data.totalWeight !== undefined && data.totalWeight < 0) {
      errors.push({
        field: 'totalWeight',
        message: 'Total weight cannot be negative'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateCostValues(data: any): ValidationResult {
    const errors: any[] = [];

    if (data.lastPurchaseCost !== undefined && data.lastPurchaseCost < 0) {
      errors.push({
        field: 'lastPurchaseCost',
        message: 'Last purchase cost cannot be negative'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate unique inventory per product per business
  async validateUniqueProductInventory(productId: string, excludeId?: string): Promise<ValidationResult> {
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
        where('productId', '==', productId)
      ];

      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      // If we find any documents with the same productId
      if (!querySnapshot.empty) {
        // Check if it's a different document (not the one we're updating)
        const existingDoc = querySnapshot.docs[0];
        if (!excludeId || existingDoc.id !== excludeId) {
          errors.push({
            field: 'productId',
            message: 'An inventory record for this product already exists'
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'productId',
        message: `Failed to validate product inventory uniqueness: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  calculateLowStockStatus(unitsInStock: number, minimumStock: number): boolean {
    return minimumStock > 0 && unitsInStock < minimumStock;
  }

  // Override create to add custom validations
  override async create(data: any, validateRefs = false) {
    // Custom validations
    const movementTypeValidation = this.validateMovementType(data);
    if (!movementTypeValidation.valid) {
      return { 
        success: false, 
        error: `Movement type validation failed: ${movementTypeValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const stockValidation = this.validateStockQuantities(data);
    if (!stockValidation.valid) {
      return { 
        success: false, 
        error: `Stock validation failed: ${stockValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const costValidation = this.validateCostValues(data);
    if (!costValidation.valid) {
      return { 
        success: false, 
        error: `Cost validation failed: ${costValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    // Validate unique product inventory
    if (data.productId) {
      const uniqueValidation = await this.validateUniqueProductInventory(data.productId);
      if (!uniqueValidation.valid) {
        return { 
          success: false, 
          error: `Uniqueness validation failed: ${uniqueValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }
    
    if (data.unitsInStock !== undefined && data.minimumStock !== undefined) {
      data.isLowStock = this.calculateLowStockStatus(data.unitsInStock, data.minimumStock);
    }

    return super.create(data, validateRefs);
  }

  // Override update to add custom validations
  override async update(id: string, data: any, validateRefs = false) {
    // Apply same custom validations on update
    const movementTypeValidation = this.validateMovementType(data);
    if (!movementTypeValidation.valid) {
      return { 
        success: false, 
        error: `Movement type validation failed: ${movementTypeValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const stockValidation = this.validateStockQuantities(data);
    if (!stockValidation.valid) {
      return { 
        success: false, 
        error: `Stock validation failed: ${stockValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const costValidation = this.validateCostValues(data);
    if (!costValidation.valid) {
      return { 
        success: false, 
        error: `Cost validation failed: ${costValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    // Validate unique product inventory if productId is being updated
    if (data.productId) {
      const uniqueValidation = await this.validateUniqueProductInventory(data.productId, id);
      if (!uniqueValidation.valid) {
        return { 
          success: false, 
          error: `Uniqueness validation failed: ${uniqueValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }
    
    // Get current data to calculate derived fields
    const currentResult = await this.findById(id);
    if (!currentResult.success || !currentResult.data) {
      return { success: false, error: 'Failed to fetch current inventory data' };
    }
    
    const currentData = currentResult.data;
    const updatedData = { ...currentData, ...data };
    
    if (updatedData.unitsInStock !== undefined && updatedData.minimumStock !== undefined) {
      data.isLowStock = this.calculateLowStockStatus(updatedData.unitsInStock, updatedData.minimumStock);
    }

    return super.update(id, data, validateRefs);
  }

}