import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';
import { collection, getDocs, query, where } from 'firebase/firestore';

export class ProductCategorySchema extends Schema {
  protected collectionName = 'productCategory';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 100,
      minLength: 1
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 500,
      default: ''
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

  // Validate category name uniqueness within business
  async validateUniqueName(name: string, excludeId?: string): Promise<ValidationResult> {
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
            message: 'A category with this name already exists'
          });
        }
      }
    } catch (error) {
      errors.push({
        field: 'name',
        message: `Failed to validate category name uniqueness: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Check if category is being used by any products
  async checkCategoryUsage(categoryId: string): Promise<ValidationResult> {
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
      const productsQuery = query(
        collection(db, 'product'),
        where('businessId', '==', businessId),
        where('category', '==', categoryId)
      );

      const productsSnapshot = await getDocs(productsQuery);
      if (!productsSnapshot.empty) {
        errors.push({
          field: 'categoryId',
          message: `Cannot delete category because it is being used by ${productsSnapshot.size} product(s)`
        });
      }
    } catch (error) {
      errors.push({
        field: 'categoryId',
        message: `Failed to check category usage: ${error}`
      });
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Override create to add name uniqueness validation
  override async create(data: any, validateRefs = true) {
    // Validate name uniqueness
    const nameValidation = await this.validateUniqueName(data.name);
    if (!nameValidation.valid) {
      return { 
        success: false, 
        error: `Name validation failed: ${nameValidation.errors.map(e => e.message).join(', ')}` 
      };
    }

    return super.create(data, validateRefs);
  }

  // Override update to add name uniqueness validation
  override async update(id: string, data: any, validateRefs = true) {
    // Validate name uniqueness if name is being updated
    if (data.name) {
      const nameValidation = await this.validateUniqueName(data.name, id);
      if (!nameValidation.valid) {
        return { 
          success: false, 
          error: `Name validation failed: ${nameValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }

    return super.update(id, data, validateRefs);
  }

  // Override delete to check category usage
  override async delete(id: string) {
    // Check if category is being used by products
    const usageValidation = await this.checkCategoryUsage(id);
    if (!usageValidation.valid) {
      return { 
        success: false, 
        error: usageValidation.errors.map(e => e.message).join(', ')
      };
    }

    return super.delete(id);
  }
}