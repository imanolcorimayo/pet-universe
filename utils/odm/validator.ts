import type { 
  FieldDefinition, 
  ValidationError, 
  ValidationResult,
  SchemaDefinition 
} from './types';

export class Validator {
  static validateField(
    fieldName: string, 
    value: any, 
    definition: FieldDefinition
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check required
    if (definition.required && (value === null || value === undefined || value === '')) {
      errors.push({
        field: fieldName,
        message: `${fieldName} is required`,
        value
      });
      return errors; // If required and missing, skip other validations
    }

    // If not required and empty, skip validations
    if (!definition.required && (value === null || value === undefined || value === '')) {
      return errors;
    }

    // Type validation
    switch (definition.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be a string`,
            value
          });
          break;
        }
        
        // String length validations
        if (definition.maxLength && value.length > definition.maxLength) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be at most ${definition.maxLength} characters`,
            value
          });
        }
        
        if (definition.minLength && value.length < definition.minLength) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be at least ${definition.minLength} characters`,
            value
          });
        }
        
        // Pattern validation
        if (definition.pattern && !definition.pattern.test(value)) {
          errors.push({
            field: fieldName,
            message: `${fieldName} format is invalid`,
            value
          });
        }
        break;

      case 'number':
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be a number`,
            value
          });
          break;
        }
        
        // Number range validations
        if (definition.max !== undefined && value > definition.max) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be at most ${definition.max}`,
            value
          });
        }
        
        if (definition.min !== undefined && value < definition.min) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be at least ${definition.min}`,
            value
          });
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be a boolean`,
            value
          });
        }
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be an array`,
            value
          });
          break;
        }
        
        // Validate array elements if arrayOf is specified
        if (definition.arrayOf) {
          value.forEach((item, index) => {
            const itemErrors = this.validateField(
              `${fieldName}[${index}]`,
              item,
              { type: definition.arrayOf!, required: true }
            );
            errors.push(...itemErrors);
          });
        }
        break;

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value) || value === null) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be an object`,
            value
          });
        }
        break;

      case 'date':
        // Accept Date objects or Firestore Timestamps
        if (!(value instanceof Date) && 
            !(value && typeof value.toDate === 'function')) {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be a Date or Timestamp`,
            value
          });
        }
        break;

      case 'reference':
        if (typeof value !== 'string' || value.trim() === '') {
          errors.push({
            field: fieldName,
            message: `${fieldName} must be a valid reference ID`,
            value
          });
        }
        break;
    }

    return errors;
  }

  static validateDocument(data: any, schema: SchemaDefinition): ValidationResult {
    const allErrors: ValidationError[] = [];

    // Validate each field in the schema
    for (const [fieldName, definition] of Object.entries(schema)) {
      const fieldValue = data[fieldName];
      const fieldErrors = this.validateField(fieldName, fieldValue, definition);
      allErrors.push(...fieldErrors);
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }

  static applyDefaults(data: any, schema: SchemaDefinition): any {
    const result: any = {};

    // Only include properties that are defined in the schema
    for (const [fieldName, definition] of Object.entries(schema)) {
      if (data[fieldName] !== undefined) {
        // Property exists in data, use its value
        result[fieldName] = data[fieldName];
      } else if (definition.default !== undefined) {
        // Property missing but has default, apply default
        result[fieldName] = typeof definition.default === 'function' 
          ? definition.default() 
          : definition.default;
      }
      // If property is missing and has no default, it remains undefined (not included)
    }

    return result;
  }
}