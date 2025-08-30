import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, getDocs, query, where } from 'firebase/firestore';

export class SupplierSchema extends Schema {
  protected collectionName = 'supplier';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 200,
      minLength: 1
    },
    category: {
      type: 'string',
      required: true,
      maxLength: 50
    },
    email: {
      type: 'string',
      required: false,
      maxLength: 254,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    },
    phone: {
      type: 'string',
      required: false,
      maxLength: 20
    },
    address: {
      type: 'string',
      required: false,
      maxLength: 500
    },
    contactPerson: {
      type: 'string',
      required: false,
      maxLength: 200
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 1000
    },
    isActive: {
      type: 'boolean',
      required: false,
      default: true
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
    },
    archivedAt: {
      type: 'date',
      required: false
    }
  };

  // Validate supplier name uniqueness within business
  async validateUniqueSupplierName(name: string, excludeId?: string): Promise<ValidationResult> {
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
        where('name', '==', name.trim())
      ];

      const q = query(collection(db, this.collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      // If we find any documents with the same name
      if (!querySnapshot.empty) {
        // Check if it's a different document (not the one we're updating)
        const existingDoc = querySnapshot.docs[0];
        if (!excludeId || existingDoc.id !== excludeId) {
          errors.push({
            field: 'name',
            message: 'A supplier with this name already exists'
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'name',
        message: `Failed to validate supplier name uniqueness: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate supplier category is one of the allowed values
  validateCategory(category: string): ValidationResult {
    const allowedCategories = ['servicios', 'alimentos', 'accesorios'];
    const errors: any[] = [];

    if (!allowedCategories.includes(category)) {
      errors.push({
        field: 'category',
        message: `Category must be one of: ${allowedCategories.join(', ')}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Check if supplier is being used by any purchases or other entities
  async checkSupplierUsage(supplierId: string): Promise<ValidationResult> {
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
      
      // Check if supplier is referenced in inventory purchases
      // Note: This would need to be updated when purchase/inventory schemas are implemented
      // For now, we'll allow deletion but this provides the framework
      
      // Future: Check inventory movements, purchases, etc.
      // const inventoryMovementsQuery = query(
      //   collection(db, 'inventoryMovement'),
      //   where('businessId', '==', businessId),
      //   where('supplierId', '==', supplierId)
      // );
      // const movementsSnapshot = await getDocs(inventoryMovementsQuery);
      
      // if (!movementsSnapshot.empty) {
      //   errors.push({
      //     field: 'supplierId',
      //     message: `Cannot delete supplier because it is referenced in ${movementsSnapshot.size} inventory movement(s)`
      //   });
      // }

    } catch (error) {
      errors.push({
        field: 'supplierId',
        message: `Failed to check supplier usage: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Override create to add custom validations
  override async create(data: any, validateRefs = true) {
    // Validate supplier name uniqueness
    const nameValidation = await this.validateUniqueSupplierName(data.name);
    if (!nameValidation.valid) {
      return { 
        success: false, 
        error: `Name validation failed: ${nameValidation.errors.map(e => e.message).join(', ')}` 
      };
    }

    // Validate category
    const categoryValidation = this.validateCategory(data.category);
    if (!categoryValidation.valid) {
      return { 
        success: false, 
        error: `Category validation failed: ${categoryValidation.errors.map(e => e.message).join(', ')}` 
      };
    }

    return super.create(data, validateRefs);
  }

  // Override update to add custom validations
  override async update(id: string, data: any, validateRefs = true) {
    // Validate supplier name uniqueness if name is being updated
    if (data.name) {
      const nameValidation = await this.validateUniqueSupplierName(data.name, id);
      if (!nameValidation.valid) {
        return { 
          success: false, 
          error: `Name validation failed: ${nameValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    // Validate category if category is being updated
    if (data.category) {
      const categoryValidation = this.validateCategory(data.category);
      if (!categoryValidation.valid) {
        return { 
          success: false, 
          error: `Category validation failed: ${categoryValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    return super.update(id, data, validateRefs);
  }

  // Override delete to check supplier usage
  override async delete(id: string) {
    // Check if supplier is being used
    const usageValidation = await this.checkSupplierUsage(id);
    if (!usageValidation.valid) {
      return { 
        success: false, 
        error: usageValidation.errors.map(e => e.message).join(', ')
      };
    }

    return super.delete(id);
  }
}