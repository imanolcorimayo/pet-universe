import { Schema, type TransactionOptions } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';

export class InventoryMovementSchema extends Schema {
  protected collectionName = 'inventoryMovement';
  
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
      maxLength: 200,
      minLength: 1
    },
    movementType: {
      type: 'string',
      required: true
    },
    referenceType: {
      type: 'string',
      required: true
    },
    referenceId: {
      type: 'string',
      required: false
    },
    quantityChange: {
      type: 'number',
      required: true
    },
    weightChange: {
      type: 'number',
      required: true,
      default: 0
    },
    unitCost: {
      type: 'number',
      required: false,
      min: 0
    },
    previousCost: {
      type: 'number',
      required: false,
      min: 0
    },
    totalCost: {
      type: 'number',
      required: false,
      min: 0
    },
    supplierId: {
      type: 'string',
      required: false
    },
    unitsBefore: {
      type: 'number',
      required: true,
      min: 0
    },
    unitsAfter: {
      type: 'number',
      required: true,
      min: 0
    },
    weightBefore: {
      type: 'number',
      required: true,
      min: 0
    },
    weightAfter: {
      type: 'number',
      required: true,
      min: 0
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 500,
      default: ''
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
    }
  };

  // Validate movement type values
  validateMovementType(data: any): ValidationResult {
    const errors: any[] = [];
    const validMovementTypes = ['sale', 'purchase', 'adjustment', 'opening', 'conversion', 'loss'];

    if (data.movementType && !validMovementTypes.includes(data.movementType)) {
      errors.push({
        field: 'movementType',
        message: 'Movement type must be one of: sale, purchase, adjustment, opening, conversion, loss'
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate reference type values
  validateReferenceType(data: any): ValidationResult {
    const errors: any[] = [];
    const validReferenceTypes = ['sale', 'purchase_order', 'manual_adjustment'];
    
    if (data.referenceType && !validReferenceTypes.includes(data.referenceType)) {
      errors.push({
        field: 'referenceType',
        message: 'Reference type must be one of: sale, purchase_order, manual_adjustment'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate movement consistency
  validateMovementConsistency(data: any): ValidationResult {
    const errors: any[] = [];
    
    // Check that before/after values are consistent with changes
    if (data.unitsBefore !== undefined && data.unitsAfter !== undefined && data.quantityChange !== undefined) {
      const expectedUnitsAfter = data.unitsBefore + data.quantityChange;
      if (Math.abs(data.unitsAfter - expectedUnitsAfter) > 0.001) { // Allow for floating point precision
        errors.push({
          field: 'unitsAfter',
          message: `Units after (${data.unitsAfter}) does not match expected value (${expectedUnitsAfter}) based on units before and quantity change`
        });
      }
    }
    
    if (data.weightBefore !== undefined && data.weightAfter !== undefined && data.weightChange !== undefined) {
      const expectedWeightAfter = data.weightBefore + data.weightChange;
      if (Math.abs(data.weightAfter - expectedWeightAfter) > 0.001) { // Allow for floating point precision
        errors.push({
          field: 'weightAfter',
          message: `Weight after (${data.weightAfter}) does not match expected value (${expectedWeightAfter}) based on weight before and weight change`
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate cost information for purchase movements
  validateCostInformation(data: any): ValidationResult {
    const errors: any[] = [];
    
    // For purchase movements, unit cost should be provided
    if (data.movementType === 'purchase') {
      if (data.unitCost === undefined || data.unitCost === null) {
        errors.push({
          field: 'unitCost',
          message: 'Unit cost is required for purchase movements'
        });
      }
      
      if (data.quantityChange > 0 && data.unitCost !== undefined && data.totalCost === undefined) {
        // Calculate expected total cost
        data.totalCost = data.quantityChange * data.unitCost;
      }
    }
    
    // Validate that costs are non-negative when provided
    if (data.unitCost !== undefined && data.unitCost < 0) {
      errors.push({
        field: 'unitCost',
        message: 'Unit cost cannot be negative'
      });
    }
    
    if (data.previousCost !== undefined && data.previousCost < 0) {
      errors.push({
        field: 'previousCost',
        message: 'Previous cost cannot be negative'
      });
    }
    
    if (data.totalCost !== undefined && data.totalCost < 0) {
      errors.push({
        field: 'totalCost',
        message: 'Total cost cannot be negative'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate before/after snapshots
  validateSnapshots(data: any): ValidationResult {
    const errors: any[] = [];
    
    // Check that before values are non-negative
    if (data.unitsBefore !== undefined && data.unitsBefore < 0) {
      errors.push({
        field: 'unitsBefore',
        message: 'Units before cannot be negative'
      });
    }
    
    if (data.weightBefore !== undefined && data.weightBefore < 0) {
      errors.push({
        field: 'weightBefore',
        message: 'Weight before cannot be negative'
      });
    }
    
    // Check that after values are non-negative
    if (data.unitsAfter !== undefined && data.unitsAfter < 0) {
      errors.push({
        field: 'unitsAfter',
        message: 'Units after cannot be negative'
      });
    }
    
    if (data.weightAfter !== undefined && data.weightAfter < 0) {
      errors.push({
        field: 'weightAfter',
        message: 'Weight after cannot be negative'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Override create to add custom validations
  override async create(data: any, validateRefs = false, txOptions?: TransactionOptions) {
    // Custom validations
    const movementTypeValidation = this.validateMovementType(data);
    if (!movementTypeValidation.valid) {
      return {
        success: false,
        error: `Movement type validation failed: ${movementTypeValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    const referenceTypeValidation = this.validateReferenceType(data);
    if (!referenceTypeValidation.valid) {
      return {
        success: false,
        error: `Reference type validation failed: ${referenceTypeValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    const consistencyValidation = this.validateMovementConsistency(data);
    if (!consistencyValidation.valid) {
      return {
        success: false,
        error: `Movement consistency validation failed: ${consistencyValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    const costValidation = this.validateCostInformation(data);
    if (!costValidation.valid) {
      return {
        success: false,
        error: `Cost validation failed: ${costValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    const snapshotValidation = this.validateSnapshots(data);
    if (!snapshotValidation.valid) {
      return {
        success: false,
        error: `Snapshot validation failed: ${snapshotValidation.errors.map(e => e.message).join(', ')}`
      };
    }

    // Add created by name if not provided
    if (!data.createdByName) {
      const user = this.getCurrentUser();
      if (user.value) {
        data.createdByName = user.value.displayName || user.value.email || 'Unknown User';
      }
    }

    return super.create(data, validateRefs, txOptions);
  }

  // Override update to prevent modifications (movements should be immutable)
  override async update(id: string, data: any, validateRefs = false) {
    return { 
      success: false, 
      error: 'Inventory movements are immutable and cannot be updated after creation' 
    };
  }

  // Override delete to prevent deletions (movements should be permanent)
  override async delete(id: string) {
    return { 
      success: false, 
      error: 'Inventory movements cannot be deleted to maintain audit trail' 
    };
  }

}