import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';

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
      required: true,
      maxLength: 100,
      minLength: 1
    },
    unitsInStock: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    openUnitsWeight: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    totalWeight: {
      type: 'number',
      required: false,
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
      default: false
    },
    averageCost: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    lastPurchaseCost: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    totalCostValue: {
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
      type: 'reference',
      required: false,
      referenceTo: 'supplier'
    },
    lastMovementAt: {
      type: 'date',
      required: false
    },
    lastMovementType: {
      type: 'string',
      required: false,
      maxLength: 50
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

  // Validate stock levels are non-negative
  validateStockLevels(data: any): ValidationResult {
    const errors: any[] = [];
    
    const stockFields = ['unitsInStock', 'openUnitsWeight', 'totalWeight'];
    
    stockFields.forEach(field => {
      if (data[field] !== undefined) {
        if (typeof data[field] !== 'number' || data[field] < 0) {
          errors.push({
            field,
            message: `${field} must be a non-negative number`
          });
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate cost values are non-negative
  validateCostValues(data: any): ValidationResult {
    const errors: any[] = [];
    
    const costFields = ['averageCost', 'lastPurchaseCost', 'totalCostValue'];
    
    costFields.forEach(field => {
      if (data[field] !== undefined) {
        if (typeof data[field] !== 'number' || data[field] < 0) {
          errors.push({
            field,
            message: `${field} must be a non-negative number`
          });
        }
      }
    });
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate minimum stock threshold
  validateMinimumStock(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.minimumStock !== undefined) {
      if (typeof data.minimumStock !== 'number' || data.minimumStock < 0) {
        errors.push({
          field: 'minimumStock',
          message: 'Minimum stock must be a non-negative number'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate movement type
  validateMovementType(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.lastMovementType !== undefined && data.lastMovementType !== null) {
      const validMovementTypes = ['sale', 'purchase', 'adjustment', 'opening', 'conversion', 'loss', 'return'];
      
      if (!validMovementTypes.includes(data.lastMovementType)) {
        errors.push({
          field: 'lastMovementType',
          message: `Movement type must be one of: ${validMovementTypes.join(', ')}`
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate low stock calculation consistency
  validateLowStockConsistency(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.isLowStock !== undefined && 
        data.unitsInStock !== undefined && 
        data.minimumStock !== undefined) {
      
      const actuallyLowStock = data.minimumStock > 0 && data.unitsInStock < data.minimumStock;
      
      if (data.isLowStock !== actuallyLowStock) {
        errors.push({
          field: 'isLowStock',
          message: `Low stock flag (${data.isLowStock}) doesn't match actual stock levels (${data.unitsInStock} vs minimum ${data.minimumStock})`
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate total cost value calculation
  validateTotalCostValue(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.totalCostValue !== undefined && 
        data.unitsInStock !== undefined && 
        data.averageCost !== undefined) {
      
      const expectedTotalCost = data.unitsInStock * data.averageCost;
      const tolerance = 0.01; // Allow small rounding differences
      
      if (Math.abs(data.totalCostValue - expectedTotalCost) > tolerance) {
        errors.push({
          field: 'totalCostValue',
          message: `Total cost value (${data.totalCostValue}) doesn't match calculated value (${expectedTotalCost.toFixed(2)})`
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate product name matches referenced product
  async validateProductNameConsistency(data: any): Promise<ValidationResult> {
    const errors: any[] = [];
    
    if (data.productId && data.productName) {
      try {
        // Check if product exists and name matches
        const productResult = await this.findById(data.productId);
        
        if (productResult.success && productResult.data) {
          // Note: This would require cross-collection validation
          // For now, we'll just validate the format
          if (typeof data.productName !== 'string' || data.productName.trim() === '') {
            errors.push({
              field: 'productName',
              message: 'Product name must be a non-empty string'
            });
          }
        }
      } catch (error) {
        // If we can't validate, just ensure basic format
        if (typeof data.productName !== 'string' || data.productName.trim() === '') {
          errors.push({
            field: 'productName',
            message: 'Product name must be a non-empty string'
          });
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Override create to add custom validations
  override async create(data: any, validateRefs = true) {
    // Custom validations
    const stockValidation = this.validateStockLevels(data);
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
    
    const minimumStockValidation = this.validateMinimumStock(data);
    if (!minimumStockValidation.valid) {
      return { 
        success: false, 
        error: `Minimum stock validation failed: ${minimumStockValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const movementTypeValidation = this.validateMovementType(data);
    if (!movementTypeValidation.valid) {
      return { 
        success: false, 
        error: `Movement type validation failed: ${movementTypeValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const lowStockValidation = this.validateLowStockConsistency(data);
    if (!lowStockValidation.valid) {
      return { 
        success: false, 
        error: `Low stock consistency validation failed: ${lowStockValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const totalCostValidation = this.validateTotalCostValue(data);
    if (!totalCostValidation.valid) {
      return { 
        success: false, 
        error: `Total cost validation failed: ${totalCostValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const productNameValidation = await this.validateProductNameConsistency(data);
    if (!productNameValidation.valid) {
      return { 
        success: false, 
        error: `Product name validation failed: ${productNameValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    return super.create(data, validateRefs);
  }

  // Override update to add custom validations
  override async update(id: string, data: any, validateRefs = true) {
    // Apply same custom validations on update
    const stockValidation = this.validateStockLevels(data);
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
    
    const minimumStockValidation = this.validateMinimumStock(data);
    if (!minimumStockValidation.valid) {
      return { 
        success: false, 
        error: `Minimum stock validation failed: ${minimumStockValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const movementTypeValidation = this.validateMovementType(data);
    if (!movementTypeValidation.valid) {
      return { 
        success: false, 
        error: `Movement type validation failed: ${movementTypeValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const lowStockValidation = this.validateLowStockConsistency(data);
    if (!lowStockValidation.valid) {
      return { 
        success: false, 
        error: `Low stock consistency validation failed: ${lowStockValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const totalCostValidation = this.validateTotalCostValue(data);
    if (!totalCostValidation.valid) {
      return { 
        success: false, 
        error: `Total cost validation failed: ${totalCostValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    if (data.productId || data.productName) {
      const productNameValidation = await this.validateProductNameConsistency(data);
      if (!productNameValidation.valid) {
        return { 
          success: false, 
          error: `Product name validation failed: ${productNameValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }
    
    return super.update(id, data, validateRefs);
  }
}