/*
  What the ODM System Provides:

  1. Field Validation

  // Client schema defines these validations:
  name: {
    type: 'string',
    required: true,
    maxLength: 100,
    minLength: 1
  },
  email: {
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/  // Email validation
  }

  2. Automatic ID Injection

  When you fetch documents, they automatically get the id field:
  const result = await clientSchema.findById('client123');
  // result.data = { id: 'client123', name: 'John Doe', email: '...', ... }

  3. Relationship Validation

  clientId: {
    type: 'reference',
    referenceTo: 'client'  // Validates this client exists
  }

  4. Clean API

  Instead of manual Firestore operations:
  // Before: 20+ lines of manual validation and Firestore code
  // After: 
  const result = await clientSchema.create(clientData);

  How to Use It:

  import { ClientSchema } from '~/utils/odm/schemas/clientSchema';

  const clientSchema = new ClientSchema();

  // Create with validation
  const result = await clientSchema.create({
    name: "John Doe",
    email: "john@email.com"
  });

  if (result.success) {
    console.log('Created client:', result.data); // Has ID + all fields
  }
*/


// Example usage of the ODM system with Client schema
import { ClientSchema } from './schemas/clientSchema';

// Create an instance of the client schema
const clientSchema = new ClientSchema();

// Example: How to use the ODM in your code

// 1. Creating a new client
async function createNewClient() {
  const clientData = {
    name: "John Doe",
    email: "john.doe@email.com", 
    phone: "+1234567890",
    address: "123 Main St, City",
    birthdate: new Date('1990-05-15'),
    isVip: false,
    preferences: "Prefers organic pet food",
    notes: "Has two dogs"
    // businessId, createdBy, timestamps will be added automatically
  };

  const result = await clientSchema.create(clientData);
  
  if (result.success) {
    console.log('Client created:', result.data);
    // result.data will include the generated ID:
    // { id: "abc123", name: "John Doe", email: "john.doe@email.com", ... }
  } else {
    console.error('Error creating client:', result.error);
  }
}

// 2. Finding clients
async function findClients() {
  // Find all active clients
  const activeClients = await clientSchema.findActive({
    orderBy: [{ field: 'name', direction: 'asc' }]
  });

  if (activeClients.success) {
    console.log('Active clients:', activeClients.data);
    // Each client will have the 'id' field automatically added
  }

  // Find VIP clients
  const vipClients = await clientSchema.findVipClients();
  
  // Find client by email
  const clientByEmail = await clientSchema.findByEmail("john.doe@email.com");
}

// 3. Updating a client
async function updateClient(clientId: string) {
  const updateData = {
    isVip: true,
    loyaltyLevel: 'gold',
    notes: "Upgraded to VIP status"
  };

  const result = await clientSchema.update(clientId, updateData);
  
  if (result.success) {
    console.log('Client updated successfully');
  } else {
    console.error('Error updating client:', result.error);
  }
}

// 4. Validation example
async function demonstrateValidation() {
  const invalidClient = {
    name: "", // Too short (minLength: 1)
    email: "invalid-email", // Doesn't match email pattern
    phone: "123456789012345678901234567890" // Too long (maxLength: 20)
  };

  const result = await clientSchema.create(invalidClient);
  
  if (!result.success) {
    console.log('Validation errors:', result.error);
    // Will show: "Validation failed: name must be at least 1 characters, email format is invalid, phone must be at most 20 characters"
  }
}

// 5. Reference validation example
async function demonstrateReferenceValidation() {
  const clientWithInvalidReference = {
    name: "Jane Doe",
    businessId: "nonexistent-business-id" // This business doesn't exist
  };

  const result = await clientSchema.create(clientWithInvalidReference);
  
  if (!result.success) {
    console.log('Reference validation error:', result.error);
    // Will show: "Reference validation failed: Referenced userBusiness with ID nonexistent-business-id does not exist"
  }
}

// How this compares to your current store approach:

// BEFORE (in your current store):
/*
async createClient(formData: ClientFormData): Promise<boolean> {
  // Manual validation
  if (!formData.name) {
    useToast(ToastEvents.error, "Name is required");
    return false;
  }
  
  // Manual Firestore operations
  const clientData = {
    businessId: currentBusinessId.value,
    name: formData.name,
    email: formData.email || null,
    // ... more manual field mapping
    createdBy: user.value.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  
  const docRef = await addDoc(collection(db, 'client'), clientData);
  // Manual ID handling and error handling
}
*/

// AFTER (with ODM):
/*
async createClient(formData: ClientFormData): Promise<boolean> {
  const result = await clientSchema.create(formData);
  
  if (result.success) {
    // result.data already includes the ID and formatted data
    return true;
  } else {
    useToast(ToastEvents.error, result.error);
    return false;
  }
}
*/

export {
  createNewClient,
  findClients,
  updateClient,
  demonstrateValidation,
  demonstrateReferenceValidation
};