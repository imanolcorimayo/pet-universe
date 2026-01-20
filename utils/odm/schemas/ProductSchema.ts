import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';

export class ProductSchema extends Schema {
  protected collectionName = 'product';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    // For backward compatibility, this property does not contain 'Id' suffix
    // But references should always contain 'Id' suffix
    category: {
      type: 'reference',
      required: true,
      referenceTo: 'productCategory'
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 100,
      minLength: 1
    },
    productCode: {
      type: 'string',
      required: false,
      maxLength: 50
    },
    description: {
      type: 'string',
      required: false,
      maxLength: 500,
      default: ''
    },
    subcategory: {
      type: 'string',
      required: false,
      maxLength: 100,
      default: ''
    },
    brand: {
      type: 'string',
      required: false,
      maxLength: 100,
      default: ''
    },
    prices: {
      type: 'object',
      required: false,
      default: () => ({
        regular: 0,
        cash: 0,
        vip: 0,
        bulk: 0
      })
    },
    trackingType: {
      type: 'string',
      required: true,
      default: 'unit'
    },
    unitType: {
      type: 'string',
      required: true,
      maxLength: 50,
      default: 'unit'
    },
    unitWeight: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    allowsLooseSales: {
      type: 'boolean',
      required: false,
      default: false
    },
    minimumStock: {
      type: 'number',
      required: false,
      min: 0,
      default: 0
    },
    supplierIds: {
      type: 'array',
      required: false,
      arrayOf: 'string',
      default: () => []
    },
    profitMarginPercentage: {
      type: 'number',
      required: false,
      min: 0,
      max: 1000,
      default: 30
    },
    threePlusMarkupPercentage: {
      type: 'number',
      required: false,
      min: 0,
      max: 200,
      default: 8
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

  // Validate tracking type values
  validateTrackingType(data: any): ValidationResult {
    const errors: any[] = [];
    const validTrackingTypes = ['unit', 'weight', 'dual'];
    
    if (data.trackingType && !validTrackingTypes.includes(data.trackingType)) {
      errors.push({
        field: 'trackingType',
        message: 'Tracking type must be one of: unit, weight, dual'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate dual tracking requirements
  validateDualTrackingRequirements(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.trackingType === 'dual') {
      if (!data.unitWeight || data.unitWeight <= 0) {
        errors.push({
          field: 'unitWeight',
          message: 'Unit weight is required and must be greater than 0 for dual tracking products'
        });
      }
      
      // Dual products should allow loose sales by default
      if (data.allowsLooseSales === false) {
        errors.push({
          field: 'allowsLooseSales',
          message: 'Dual tracking products should allow loose sales'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate pricing structure
  validatePricingStructure(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.prices && typeof data.prices === 'object') {
      const requiredPriceFields = ['regular', 'cash', 'vip', 'bulk'];
      
      // Check base price fields
      for (const field of requiredPriceFields) {
        if (data.prices[field] !== undefined && (typeof data.prices[field] !== 'number' || data.prices[field] < 0)) {
          errors.push({
            field: `prices.${field}`,
            message: `${field} price must be a non-negative number`
          });
        }
      }
      
      // For dual tracking, validate kg price structure
      if (data.trackingType === 'dual' && data.prices.kg) {
        const kgFields = ['regular', 'threePlusDiscount', 'vip'];
        for (const field of kgFields) {
          if (data.prices.kg[field] !== undefined && (typeof data.prices.kg[field] !== 'number' || data.prices.kg[field] < 0)) {
            errors.push({
              field: `prices.kg.${field}`,
              message: `Kg ${field} price must be a non-negative number`
            });
          }
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate supplier IDs format
  validateSupplierIds(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.supplierIds && Array.isArray(data.supplierIds)) {
      data.supplierIds.forEach((supplierId: any, index: number) => {
        if (typeof supplierId !== 'string' || supplierId.trim() === '') {
          errors.push({
            field: `supplierIds[${index}]`,
            message: 'Each supplier ID must be a non-empty string'
          });
        }
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate unique product code (async - requires DB query)
  async validateUniqueProductCode(productCode: string, excludeId?: string): Promise<ValidationResult> {
    const errors: any[] = [];

    if (!productCode || productCode.trim() === '') {
      return { valid: true, errors: [] };
    }

    const result = await this.find({
      where: [{ field: 'productCode', operator: '==', value: productCode.trim() }],
      limit: 1
    });

    if (result.success && result.data && result.data.length > 0) {
      const existingProduct = result.data[0];
      if (!excludeId || existingProduct.id !== excludeId) {
        errors.push({
          field: 'productCode',
          message: `Ya existe un producto con el código "${productCode}"`
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate profit margin percentage
  validateProfitMargin(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.profitMarginPercentage !== undefined) {
      if (typeof data.profitMarginPercentage !== 'number' || data.profitMarginPercentage < 0) {
        errors.push({
          field: 'profitMarginPercentage',
          message: 'Profit margin percentage must be a non-negative number'
        });
      }
    }
    
    if (data.threePlusMarkupPercentage !== undefined) {
      if (typeof data.threePlusMarkupPercentage !== 'number' || 
          data.threePlusMarkupPercentage < 0 || 
          data.threePlusMarkupPercentage > 200) {
        errors.push({
          field: 'threePlusMarkupPercentage',
          message: 'Three plus markup percentage must be between 0 and 200'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Override create to add custom validations
  override async create(data: any, validateRefs = false) {
    // Validate unique product code (async)
    if (data.productCode) {
      const productCodeValidation = await this.validateUniqueProductCode(data.productCode);
      if (!productCodeValidation.valid) {
        return {
          success: false,
          error: productCodeValidation.errors.map(e => e.message).join(', ')
        };
      }
    }

    // Custom validations
    const trackingValidation = this.validateTrackingType(data);
    if (!trackingValidation.valid) {
      return {
        success: false,
        error: `Tracking type validation failed: ${trackingValidation.errors.map(e => e.message).join(', ')}`
      };
    }
    
    const dualTrackingValidation = this.validateDualTrackingRequirements(data);
    if (!dualTrackingValidation.valid) {
      return { 
        success: false, 
        error: `Dual tracking validation failed: ${dualTrackingValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const pricingValidation = this.validatePricingStructure(data);
    if (!pricingValidation.valid) {
      return { 
        success: false, 
        error: `Pricing validation failed: ${pricingValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const supplierValidation = this.validateSupplierIds(data);
    if (!supplierValidation.valid) {
      return { 
        success: false, 
        error: `Supplier validation failed: ${supplierValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const marginValidation = this.validateProfitMargin(data);
    if (!marginValidation.valid) {
      return { 
        success: false, 
        error: `Profit margin validation failed: ${marginValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    return super.create(data, validateRefs);
  }

  // Override update to add custom validations
  override async update(id: string, data: any, validateRefs = false) {
    // Validate unique product code (exclude current product)
    if (data.productCode !== undefined) {
      const productCodeValidation = await this.validateUniqueProductCode(data.productCode, id);
      if (!productCodeValidation.valid) {
        return {
          success: false,
          error: productCodeValidation.errors.map(e => e.message).join(', ')
        };
      }
    }

    // Apply same custom validations on update
    if (data.trackingType) {
      const trackingValidation = this.validateTrackingType(data);
      if (!trackingValidation.valid) {
        return { 
          success: false, 
          error: `Tracking type validation failed: ${trackingValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }
    
    const dualTrackingValidation = this.validateDualTrackingRequirements(data);
    if (!dualTrackingValidation.valid) {
      return { 
        success: false, 
        error: `Dual tracking validation failed: ${dualTrackingValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const pricingValidation = this.validatePricingStructure(data);
    if (!pricingValidation.valid) {
      return { 
        success: false, 
        error: `Pricing validation failed: ${pricingValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const supplierValidation = this.validateSupplierIds(data);
    if (!supplierValidation.valid) {
      return { 
        success: false, 
        error: `Supplier validation failed: ${supplierValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const marginValidation = this.validateProfitMargin(data);
    if (!marginValidation.valid) {
      return { 
        success: false, 
        error: `Profit margin validation failed: ${marginValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    return super.update(id, data, validateRefs);
  }
}