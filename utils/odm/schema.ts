import { 
  addDoc, 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  serverTimestamp,
  type Timestamp 
} from 'firebase/firestore';
import { Validator } from './validator';
import type { 
  SchemaDefinition, 
  ValidationResult, 
  QueryOptions, 
  DocumentWithId,
  CreateResult,
  UpdateResult,
  DeleteResult,
  FetchResult,
  FetchSingleResult
} from './types';

export abstract class Schema {
  protected abstract collectionName: string;
  protected abstract schema: SchemaDefinition;
  
  // Reference cache to avoid duplicate fetches
  private referenceCache = new Map<string, any>();

  constructor() {}

  // Get current business ID from localStorage
  protected getCurrentBusinessId(): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('cBId');
    }
    return null;
  }

  // Get current user from Nuxt composable
  protected getCurrentUser() {
    try {
      return useCurrentUser();
    } catch {
      return { value: null };
    }
  }

  // Get Firestore instance
  protected getFirestore() {
    return useFirestore();
  }

  // Format date for display
  protected formatDate(timestamp: any): string {
    try {
      const { $dayjs } = useNuxtApp();
      if (timestamp && typeof timestamp.toDate === 'function') {
        return $dayjs(timestamp.toDate()).format('DD/MM/YYYY HH:mm');
      }
      if (timestamp instanceof Date) {
        return $dayjs(timestamp).format('DD/MM/YYYY HH:mm');
      }
      return '';
    } catch {
      return '';
    }
  }

  // Add businessId, createdBy, createdAt, updatedAt fields if missing and when required
  protected addSystemFields(data: any): any {
    const user = this.getCurrentUser();
    const businessId = this.getCurrentBusinessId();

    let updatedData = { ...data };

    const schemaFields = this.schema;

    // For new documents. Automatically add createdAt, createdBy, createdByName if missing and required
    if (user.value?.displayName && !updatedData.createdByName && schemaFields.createdByName?.required) {
      updatedData.createdByName = user.value.displayName;
    }
    if (user.value?.uid && !updatedData.createdBy && schemaFields.createdBy?.required) {
      updatedData.createdBy = user.value.uid;
    }
    if (user.value?.uid && !updatedData.updatedBy && schemaFields.updatedBy?.required) {
      updatedData.updatedBy = user.value.uid;
    }
    if (user.value?.displayName && !updatedData.updatedByName && schemaFields.updatedByName?.required) {
      updatedData.updatedByName = user.value.displayName;
    }

    // These fields will always be required
    updatedData.createdAt = serverTimestamp();
    updatedData.updatedAt = serverTimestamp();
    if (!updatedData.businessId && businessId) {
      updatedData.businessId = businessId;
    }

    return updatedData;
  }

  // Validate document against schema
  validate(data: any): ValidationResult {
    return Validator.validateDocument(data, this.schema);
  }

  // Apply default values to document
  applyDefaults(data: any): any {
    return Validator.applyDefaults(data, this.schema);
  }

  // Validate references exist
  async validateReferences(data: any): Promise<ValidationResult> {
    const errors: any[] = [];
    const db = this.getFirestore();
    const businessId = this.getCurrentBusinessId();

    if (!businessId) {
      errors.push({
        field: 'businessId',
        message: 'Business ID is required'
      });
      return { valid: false, errors };
    }

    for (const [fieldName, definition] of Object.entries(this.schema)) {
      if (definition.type === 'reference' && definition.referenceTo && data[fieldName]) {
        const referenceId = data[fieldName];
        const cacheKey = `${definition.referenceTo}:${referenceId}`;

        // Check cache first
        if (this.referenceCache.has(cacheKey)) {
          continue;
        }

        try {
          const referencedDoc = await getDoc(doc(db, definition.referenceTo, referenceId));
          
          if (!referencedDoc.exists()) {
            errors.push({
              field: fieldName,
              message: `Referenced ${definition.referenceTo} with ID ${referenceId} does not exist`
            });
          } else {
            // Cache the reference
            this.referenceCache.set(cacheKey, referencedDoc.data());
          }
        } catch (error) {
          errors.push({
            field: fieldName,
            message: `Failed to validate reference ${fieldName}: ${error}`
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Prepare document for saving (add timestamps, businessId, etc.)
  protected prepareForSave(data: any, isUpdate = false): any {
    const user = this.getCurrentUser();
    let prepared = { ...data };

    // Apply defaults
    prepared = this.applyDefaults(prepared);

    // Update timestamp when exists in schema and it's updating
    if (isUpdate && Object.hasOwn(this.schema, 'updatedAt')) {
      if (user.value?.uid) {
        prepared.updatedBy = user.value.uid;
      } else {
        prepared.updatedBy = 'Unknown';
      }
      if (user.value?.displayName) {
        prepared.updatedByName = user.value.displayName;
      } else {
        prepared.updatedByName = 'Unknown';
      }
      prepared.updatedAt = serverTimestamp();
    }

    // Ensure date fields are properly handled for Firestore
    // Convert any $dayjs or Date objects to Firestore timestamps or serverTimestamp
    for (const [fieldName, definition] of Object.entries(this.schema)) {
      if (definition.type === 'date' && prepared[fieldName] !== undefined) {
        const dateValue = prepared[fieldName];
        
        // Skip if already a serverTimestamp or null
        if (dateValue === null || (dateValue && typeof dateValue === 'object' && dateValue.constructor.name === 'ServerTimestampTransform')) {
          continue;
        }
        
        // Convert $dayjs objects, Date objects, or invalid dates to proper Firestore timestamps
        if (dateValue && typeof dateValue === 'object') {
          if (typeof dateValue.toDate === 'function') {
            // Already a Firestore timestamp, keep as is
            continue;
          } else if (dateValue._isAMomentObject || (dateValue.constructor && dateValue.constructor.name === 'Dayjs')) {
            // Convert dayjs to JavaScript Date, then let Firestore handle it
            prepared[fieldName] = dateValue.toDate ? dateValue.toDate() : new Date(dateValue.valueOf());
          } else if (dateValue instanceof Date) {
            // Keep Date objects as is - Firestore will convert them
            continue;
          }
        } else if (typeof dateValue === 'string') {
          // Convert string dates to Date objects
          const parsedDate = new Date(dateValue);
          if (!isNaN(parsedDate.getTime())) {
            prepared[fieldName] = parsedDate;
          } else {
            // Invalid date string, remove the field or set to null
            console.warn(`Invalid date string for field ${fieldName}:`, dateValue);
            prepared[fieldName] = null;
          }
        }
      }
    }

    return prepared;
  }

  // Add document ID to fetched data
  protected addDocumentId(docSnapshot: any): DocumentWithId {
    const data = docSnapshot.data();
    const result: DocumentWithId = {
      id: docSnapshot.id,
      ...data
    };

    // Dynamically format date fields based on schema definition
    for (const [fieldName, definition] of Object.entries(this.schema)) {
      if (definition.type === 'date' && data[fieldName]) {
        // Add formatted date for display
        result[fieldName] = this.formatDate(data[fieldName]);
        // Keep original timestamp for reference with 'original' prefix
        result[`original${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`] = data[fieldName];
      } else if (definition.type === 'date' && data[fieldName] === null) {
        // Handle null date fields explicitly
        result[fieldName] = null;
        result[`original${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`] = null;
      }
    }

    return result;
  }

  // Create a new document
  async create(data: any, validateRefs = true): Promise<CreateResult> {
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { success: false, error: 'Business ID is required' };
      }

      // Add system fields
      data = this.addSystemFields(data);

      // Validate schema
      const validation = this.validate(data);
      if (!validation.valid) {
        return { 
          success: false, 
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}` 
        };
      }

      // Validate references if requested
      if (validateRefs) {
        const refValidation = await this.validateReferences(data);
        if (!refValidation.valid) {
          return { 
            success: false, 
            error: `Reference validation failed: ${refValidation.errors.map(e => e.message).join(', ')}` 
          };
        }
      }

      // Properly fixes date fields and updates the "Updated At" timestamp with correct values (when updating)
      const prepared = this.prepareForSave(data, false);

      // Save to Firestore
      const docRef = await addDoc(collection(db, this.collectionName), prepared);

      // Return with ID
      const created: DocumentWithId = this.addDocumentId(await getDoc(docRef));

      return { success: true, data: created };
    } catch (error) {
      console.error(`Error creating ${this.collectionName}:`, error);
      return { success: false, error: `Failed to create document: ${error}` };
    }
  }

  // Update an existing document
  async update(id: string, data: any, validateRefs = true): Promise<UpdateResult> {
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { success: false, error: 'Business ID is required' };
      }

      // Get existing document to verify ownership
      const docRef = doc(db, this.collectionName, id);
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        return { success: false, error: 'Document not found' };
      }

      const existingData = docSnapshot.data();
      if (existingData.businessId !== businessId) {
        return { success: false, error: 'No permission to update this document' };
      }

      // Validate schema (only for provided fields)
      const completeData = { ...existingData, ...data };
      const validation = this.validate(completeData);
      if (!validation.valid) {
        return { 
          success: false, 
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}` 
        };
      }

      // Validate references if requested
      if (validateRefs) {
        const refValidation = await this.validateReferences(completeData);
        if (!refValidation.valid) {
          return { 
            success: false, 
            error: `Reference validation failed: ${refValidation.errors.map(e => e.message).join(', ')}` 
          };
        }
      }

      // Properly fixes date fields and updates the "Updated At" timestamp with correct values (when updating)
      const prepared = this.prepareForSave(completeData, true);

      // Update in Firestore
      await updateDoc(docRef, prepared);

      return { success: true, data: this.addDocumentId(await getDoc(docRef)) };
    } catch (error) {
      console.error(`Error updating ${this.collectionName}:`, error);
      return { success: false, error: `Failed to update document: ${error}` };
    }
  }

  // Delete a document
  async delete(id: string): Promise<DeleteResult> {
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { success: false, error: 'Business ID is required' };
      }

      // Get existing document to verify ownership
      const docRef = doc(db, this.collectionName, id);
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        return { success: false, error: 'Document not found' };
      }

      const existingData = docSnapshot.data();
      if (existingData.businessId !== businessId) {
        return { success: false, error: 'No permission to delete this document' };
      }

      // Delete from Firestore
      await deleteDoc(docRef);

      return { success: true };
    } catch (error) {
      console.error(`Error deleting ${this.collectionName}:`, error);
      return { success: false, error: `Failed to delete document: ${error}` };
    }
  }

  // Archive a document (soft delete)
  async archive(id: string): Promise<UpdateResult> {
    return this.update(id, {
      isActive: false,
      archivedAt: serverTimestamp()
    }, false);
  }

  // Restore an archived document
  async restore(id: string): Promise<UpdateResult> {
    return this.update(id, {
      isActive: true,
      archivedAt: null
    }, false);
  }

  // Find by ID
  async findById(id: string): Promise<FetchSingleResult> {
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { success: false, error: 'Business ID is required' };
      }

      const docRef = doc(db, this.collectionName, id);
      const docSnapshot = await getDoc(docRef);

      if (!docSnapshot.exists()) {
        return { success: false, error: 'Document not found' };
      }

      const data = docSnapshot.data();
      if (data.businessId !== businessId) {
        return { success: false, error: 'No permission to access this document' };
      }

      return { 
        success: true, 
        data: this.addDocumentId(docSnapshot) 
      };
    } catch (error) {
      console.error(`Error finding ${this.collectionName} by ID:`, error);
      return { success: false, error: `Failed to find document: ${error}` };
    }
  }

  // Find multiple documents with query options
  async find(options: QueryOptions = {}): Promise<FetchResult> {
    try {
      const db = this.getFirestore();
      const businessId = this.getCurrentBusinessId();

      if (!businessId) {
        return { success: false, error: 'Business ID is required' };
      }

      // Build query
      let queryRef = collection(db, this.collectionName);
      let constraints: any[] = [where('businessId', '==', businessId)];

      // Add where clauses
      if (options.where) {
        for (const condition of options.where) {
          constraints.push(where(condition.field, condition.operator, condition.value));
        }
      }

      // Add order by clauses
      if (options.orderBy) {
        for (const order of options.orderBy) {
          constraints.push(orderBy(order.field, order.direction));
        }
      }

      // Add limit
      if (options.limit) {
        constraints.push(firestoreLimit(options.limit));
      }

      // Execute query
      const q = query(queryRef, ...constraints);
      const querySnapshot = await getDocs(q);

      // Map documents and add IDs
      const documents = querySnapshot.docs.map(doc => this.addDocumentId(doc));

      return { success: true, data: documents };
    } catch (error) {
      console.error(`Error finding ${this.collectionName}:`, error);
      return { success: false, error: `Failed to find documents: ${error}` };
    }
  }

  // Find all active documents
  async findActive(additionalOptions: QueryOptions = {}): Promise<FetchResult> {
    const options: QueryOptions = {
      ...additionalOptions,
      where: [
        ...(additionalOptions.where || []),
        { field: 'isActive', operator: '==', value: true }
      ]
    };

    return this.find(options);
  }

  // Find all archived documents
  async findArchived(additionalOptions: QueryOptions = {}): Promise<FetchResult> {
    const options: QueryOptions = {
      ...additionalOptions,
      where: [
        ...(additionalOptions.where || []),
        { field: 'isActive', operator: '==', value: false }
      ]
    };

    return this.find(options);
  }

  // Clear reference cache
  clearCache(): void {
    this.referenceCache.clear();
  }
}