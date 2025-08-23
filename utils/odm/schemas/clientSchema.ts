import { Schema } from '../schema';
import type { SchemaDefinition } from '../types';

export class ClientSchema extends Schema {
  protected collectionName = 'client';
  
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
    birthdate: {
      type: 'date',
      required: false
    },
    isVip: {
      type: 'boolean',
      required: false,
      default: false
    },
    loyaltyLevel: {
      type: 'string',
      required: false,
      default: 'regular'
    },
    totalPurchases: {
      type: 'number',
      required: false,
      default: 0,
      min: 0
    },
    lastPurchaseAt: {
      type: 'date',
      required: false
    },
    preferences: {
      type: 'string',
      required: false,
      maxLength: 500,
      default: ''
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

  // Additional client-specific methods can be added here
  async findByEmail(email: string) {
    return this.find({
      where: [{ field: 'email', operator: '==', value: email }],
      limit: 1
    });
  }

  async findVipClients() {
    return this.find({
      where: [{ field: 'isVip', operator: '==', value: true }],
      orderBy: [{ field: 'name', direction: 'asc' }]
    });
  }

  async findByLoyaltyLevel(level: string) {
    return this.find({
      where: [{ field: 'loyaltyLevel', operator: '==', value: level }],
      orderBy: [{ field: 'totalPurchases', direction: 'desc' }]
    });
  }
}