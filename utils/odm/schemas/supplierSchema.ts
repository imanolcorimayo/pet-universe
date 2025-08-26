import { Schema } from '../schema';
import type { SchemaDefinition, ValidationResult } from '../types';

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
      maxLength: 100,
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
      maxLength: 200
    },
    contactPerson: {
      type: 'string',
      required: false,
      maxLength: 100
    },
    notes: {
      type: 'string',
      required: false,
      maxLength: 1000,
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

  // Validate supplier category
  validateCategory(data: any): ValidationResult {
    const errors: any[] = [];
    const validCategories = ['servicios', 'alimentos', 'accesorios'];
    
    if (data.category && !validCategories.includes(data.category)) {
      errors.push({
        field: 'category',
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate email format (when provided)
  validateEmailFormat(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.email && data.email !== null) {
      if (typeof data.email !== 'string') {
        errors.push({
          field: 'email',
          message: 'Email must be a string'
        });
      } else if (data.email.trim() !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push({
          field: 'email',
          message: 'Email must be in valid format (example@domain.com)'
        });
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate phone format (when provided)
  validatePhoneFormat(data: any): ValidationResult {
    const errors: any[] = [];
    
    if (data.phone && data.phone !== null) {
      if (typeof data.phone !== 'string') {
        errors.push({
          field: 'phone',
          message: 'Phone must be a string'
        });
      } else if (data.phone.trim() !== '') {
        // Basic phone validation - must contain only digits, spaces, hyphens, parentheses, and plus
        const phonePattern = /^[\d\s\-\(\)\+]+$/;
        if (!phonePattern.test(data.phone)) {
          errors.push({
            field: 'phone',
            message: 'Phone number can only contain digits, spaces, hyphens, parentheses, and plus sign'
          });
        }
        
        // Must have at least 7 digits
        const digitsOnly = data.phone.replace(/\D/g, '');
        if (digitsOnly.length < 7) {
          errors.push({
            field: 'phone',
            message: 'Phone number must contain at least 7 digits'
          });
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate contact information consistency
  validateContactConsistency(data: any): ValidationResult {
    const errors: any[] = [];
    
    // Check if at least one contact method is provided
    const hasEmail = data.email && data.email.trim() !== '';
    const hasPhone = data.phone && data.phone.trim() !== '';
    const hasAddress = data.address && data.address.trim() !== '';
    
    if (!hasEmail && !hasPhone && !hasAddress) {
      errors.push({
        field: 'contact',
        message: 'At least one contact method (email, phone, or address) should be provided'
      });
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate name uniqueness within business (optional validation)
  async validateNameUniqueness(data: any): Promise<ValidationResult> {
    const errors: any[] = [];
    
    if (data.name && data.name.trim() !== '') {
      try {
        // Check for existing suppliers with same name in the same business
        const existingSuppliers = await this.find({
          where: [{ field: 'name', operator: '==', value: data.name.trim() }]
        });
        
        if (existingSuppliers.success && existingSuppliers.data && existingSuppliers.data.length > 0) {
          // For updates, exclude current supplier from uniqueness check
          const currentSupplierId = data.id;
          const duplicates = existingSuppliers.data.filter(supplier => supplier.id !== currentSupplierId);
          
          if (duplicates.length > 0) {
            errors.push({
              field: 'name',
              message: 'A supplier with this name already exists'
            });
          }
        }
      } catch (error) {
        // If we can't check uniqueness, just log it but don't fail validation
        console.warn('Could not validate supplier name uniqueness:', error);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Validate string fields length and content
  validateStringFields(data: any): ValidationResult {
    const errors: any[] = [];
    
    // Validate name
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim() === '') {
        errors.push({
          field: 'name',
          message: 'Name is required and must be a non-empty string'
        });
      } else if (data.name.length > 100) {
        errors.push({
          field: 'name',
          message: 'Name must not exceed 100 characters'
        });
      }
    }
    
    // Validate contact person
    if (data.contactPerson && data.contactPerson !== null) {
      if (typeof data.contactPerson !== 'string') {
        errors.push({
          field: 'contactPerson',
          message: 'Contact person must be a string'
        });
      } else if (data.contactPerson.length > 100) {
        errors.push({
          field: 'contactPerson',
          message: 'Contact person name must not exceed 100 characters'
        });
      }
    }
    
    // Validate address
    if (data.address && data.address !== null) {
      if (typeof data.address !== 'string') {
        errors.push({
          field: 'address',
          message: 'Address must be a string'
        });
      } else if (data.address.length > 200) {
        errors.push({
          field: 'address',
          message: 'Address must not exceed 200 characters'
        });
      }
    }
    
    // Validate notes
    if (data.notes && data.notes !== null) {
      if (typeof data.notes !== 'string') {
        errors.push({
          field: 'notes',
          message: 'Notes must be a string'
        });
      } else if (data.notes.length > 1000) {
        errors.push({
          field: 'notes',
          message: 'Notes must not exceed 1000 characters'
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
    // Custom validations
    const categoryValidation = this.validateCategory(data);
    if (!categoryValidation.valid) {
      return { 
        success: false, 
        error: `Category validation failed: ${categoryValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const emailValidation = this.validateEmailFormat(data);
    if (!emailValidation.valid) {
      return { 
        success: false, 
        error: `Email validation failed: ${emailValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const phoneValidation = this.validatePhoneFormat(data);
    if (!phoneValidation.valid) {
      return { 
        success: false, 
        error: `Phone validation failed: ${phoneValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const contactValidation = this.validateContactConsistency(data);
    if (!contactValidation.valid) {
      return { 
        success: false, 
        error: `Contact validation failed: ${contactValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const stringValidation = this.validateStringFields(data);
    if (!stringValidation.valid) {
      return { 
        success: false, 
        error: `String field validation failed: ${stringValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const nameUniquenessValidation = await this.validateNameUniqueness(data);
    if (!nameUniquenessValidation.valid) {
      return { 
        success: false, 
        error: `Name uniqueness validation failed: ${nameUniquenessValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    return super.create(data, validateRefs);
  }

  // Override update to add custom validations
  override async update(id: string, data: any, validateRefs = true) {
    // Apply same custom validations on update
    if (data.category) {
      const categoryValidation = this.validateCategory(data);
      if (!categoryValidation.valid) {
        return { 
          success: false, 
          error: `Category validation failed: ${categoryValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }
    
    const emailValidation = this.validateEmailFormat(data);
    if (!emailValidation.valid) {
      return { 
        success: false, 
        error: `Email validation failed: ${emailValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const phoneValidation = this.validatePhoneFormat(data);
    if (!phoneValidation.valid) {
      return { 
        success: false, 
        error: `Phone validation failed: ${phoneValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    const stringValidation = this.validateStringFields(data);
    if (!stringValidation.valid) {
      return { 
        success: false, 
        error: `String field validation failed: ${stringValidation.errors.map(e => e.message).join(', ')}` 
      };
    }
    
    if (data.name) {
      // Include the current ID for uniqueness check during updates
      const nameUniquenessValidation = await this.validateNameUniqueness({ ...data, id });
      if (!nameUniquenessValidation.valid) {
        return { 
          success: false, 
          error: `Name uniqueness validation failed: ${nameUniquenessValidation.errors.map(e => e.message).join(', ')}` 
        };
      }
    }
    
    return super.update(id, data, validateRefs);
  }
}