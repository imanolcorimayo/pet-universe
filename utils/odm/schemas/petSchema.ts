import { Schema } from '../schema';
import type { SchemaDefinition } from '../types';

export class PetSchema extends Schema {
  protected collectionName = 'pet';
  
  protected schema: SchemaDefinition = {
    businessId: {
      type: 'reference',
      required: true,
      referenceTo: 'userBusiness'
    },
    clientId: {
      type: 'reference',
      required: true,
      referenceTo: 'client'
    },
    name: {
      type: 'string',
      required: true,
      maxLength: 64,
      minLength: 1
    },
    species: {
      type: 'string',
      required: true,
      maxLength: 50
    },
    breed: {
      type: 'string',
      required: false,
      maxLength: 100
    },
    birthdate: {
      type: 'date',
      required: false
    },
    weight: {
      type: 'number',
      required: false,
      min: 0,
      max: 200 // Reasonable max weight in kg
    },
    dietaryRestrictions: {
      type: 'string',
      required: false,
      maxLength: 500,
      default: ''
    },
    foodPreferences: {
      type: 'array',
      required: false,
      arrayOf: 'string',
      default: () => []
    },
    feedingSchedule: {
      type: 'string',
      required: false,
      maxLength: 200,
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

  // Pet-specific methods
  async findByClient(clientId: string) {
    return this.find({
      where: [{ field: 'clientId', operator: '==', value: clientId }],
      orderBy: [{ field: 'name', direction: 'asc' }]
    });
  }

  async findBySpecies(species: string) {
    return this.find({
      where: [{ field: 'species', operator: '==', value: species }],
      orderBy: [{ field: 'name', direction: 'asc' }]
    });
  }

  // Calculate age from birthdate
  calculateAge(birthdate: any): number | null {
    try {
      const { $dayjs } = useNuxtApp();
      let date = birthdate;
      
      // Handle Firestore timestamp
      if (birthdate && typeof birthdate.toDate === 'function') {
        date = birthdate.toDate();
      }
      
      if (!date) return null;
      
      return $dayjs().diff($dayjs(date), 'year');
    } catch {
      return null;
    }
  }

  // Validate that age doesn't exceed 30 years (as per your requirement)
  validateAge(data: any): boolean {
    if (!data.birthdate) return true;
    
    const age = this.calculateAge(data.birthdate);
    return age === null || age <= 30;
  }

  // Override create to add age validation
  override async create(data: any, validateRefs = true) {
    if (!this.validateAge(data)) {
      return { 
        success: false, 
        error: 'Pet age cannot exceed 30 years' 
      };
    }
    
    return super.create(data, validateRefs);
  }

  // Override update to add age validation
  override async update(id: string, data: any, validateRefs = true) {
    if (data.birthdate && !this.validateAge(data)) {
      return { 
        success: false, 
        error: 'Pet age cannot exceed 30 years' 
      };
    }
    
    return super.update(id, data, validateRefs);
  }
}