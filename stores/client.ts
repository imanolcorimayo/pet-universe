import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  limit,
  deleteDoc
} from "firebase/firestore";
import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";

// Client interfaces
interface Client {
  id: string;
  businessId: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthdate: string | null;
  originalBirthdate?: any;
  isVip: boolean;
  loyaltyLevel: LoyaltyLevel;
  totalPurchases: number;
  lastPurchaseAt: string | null;
  originalLastPurchaseAt?: any;
  preferences: string;
  notes: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  originalArchivedAt?: any;
  pets?: Pet[];
}

interface Pet {
  id: string;
  businessId: string;
  clientId: string;
  name: string;
  species: string;
  breed: string | null;
  birthdate: string | null;
  originalBirthdate?: any;
  weight: number | null;
  dietaryRestrictions: string;
  foodPreferences: string[];
  feedingSchedule: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
}

// Form interfaces
interface ClientFormData {
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birthdate: Date | null;
  isVip: boolean;
  preferences: string;
  notes: string;
}

interface PetFormData {
  name: string;
  species: string;
  breed: string | null;
  birthdate: Date | null;
  weight: number | null;
  dietaryRestrictions: string;
  foodPreferences: string[];
  feedingSchedule: string;
}

// Enums
type LoyaltyLevel = "regular" | "silver" | "gold" | "platinum";
type ClientFilter = "all" | "active" | "archived" | "vip";

// Store state interface
interface ClientState {
  clients: Client[];
  clientsByIdMap: Map<string, Client>;
  clientsLoaded: boolean;
  isLoading: boolean;
  selectedClient: Client | null;
  selectedPet: Pet | null;
  clientFilter: ClientFilter;
  searchQuery: string;
}

export const useClientStore = defineStore("client", {
  state: (): ClientState => ({
    clients: [],
    clientsByIdMap: new Map<string, Client>(),
    clientsLoaded: false,
    isLoading: false,
    selectedClient: null,
    selectedPet: null,
    clientFilter: "active",
    searchQuery: "",
  }),

  getters: {
    // Get all clients filtered by search and filter criteria
    filteredClients: (state): Client[] => {
      if (!state.clients.length) return [];

      let result = [...state.clients];

      // Apply client filter
      if (state.clientFilter === "active") {
        result = result.filter(client => client.isActive);
      } else if (state.clientFilter === "archived") {
        result = result.filter(client => !client.isActive);
      } else if (state.clientFilter === "vip") {
        result = result.filter(client => client.isVip);
      }

      // Apply search query if exists
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        result = result.filter(
          client =>
            client.name.toLowerCase().includes(query) ||
            (client.email && client.email.toLowerCase().includes(query)) ||
            (client.phone && client.phone.toLowerCase().includes(query))
        );
      }

      return result;
    },

    // Get client by ID
    getClientById: (state) => (id: string): Client | undefined => {
      // First check Map for O(1) lookup
      if (state.clientsByIdMap.has(id)) {
        return state.clientsByIdMap.get(id);
      }
      // Fallback to array lookup (slower)
      return state.clients.find(client => client.id === id);
    },

    // Get pets by client ID
    getPetsByClientId: (state) => (clientId: string): Pet[] => {
      const client = state.clients.find(client => client.id === clientId);
      return client?.pets || [];
    },
  },

  actions: {
    // Set client filter
    setClientFilter(filter: ClientFilter) {
      this.clientFilter = filter;
    },

    // Set search query
    setSearchQuery(query: string) {
      this.searchQuery = query;
    },

    // Clear selected client
    clearSelectedClient() {
      this.selectedClient = null;
      this.selectedPet = null;
    },

    // Fetch all clients for the current business
    async fetchClients(forceFetch = false): Promise<boolean> {

      if (this.clientsLoaded && !forceFetch) return true;

      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Clear the Map when fetching all clients
        this.clientsByIdMap.clear();

        // Query clients for this business
        const clientsRef = collection(db, 'client');
        const q = query(
          clientsRef,
          where('businessId', '==', currentBusinessId.value),
          orderBy('name', 'asc')
        );
        
        const snapshot = await getDocs(q);
        
        // Map snapshot to client objects
        const clients: Client[] = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Format timestamps
          let birthdate = null;
          if (data.birthdate) {
            birthdate = $dayjs(data.birthdate.toDate()).format('YYYY-MM-DD');
          }
          
          let lastPurchaseAt = null;
          if (data.lastPurchaseAt) {
            lastPurchaseAt = $dayjs(data.lastPurchaseAt.toDate()).format('YYYY-MM-DD');
          }
          
          let archivedAt = null;
          if (data.archivedAt) {
            archivedAt = $dayjs(data.archivedAt.toDate()).format('YYYY-MM-DD');
          }
          
          // Return formatted client with ID
          const client =  {
            id: doc.id,
            businessId: data.businessId,
            name: data.name,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            birthdate: birthdate,
            originalBirthdate: data.birthdate,
            isVip: data.isVip || false,
            loyaltyLevel: data.loyaltyLevel || 'regular',
            totalPurchases: data.totalPurchases || 0,
            lastPurchaseAt: lastPurchaseAt,
            originalLastPurchaseAt: data.lastPurchaseAt,
            preferences: data.preferences || '',
            notes: data.notes || '',
            isActive: data.isActive !== false, // Default to true if not specified
            createdBy: data.createdBy,
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY'),
            updatedAt: $dayjs(data.updatedAt.toDate()).format('DD/MM/YYYY'),
            archivedAt: archivedAt,
            originalArchivedAt: data.archivedAt,
            pets: [],
          };
      
          // Add to Map for quick lookup
          this.clientsByIdMap.set(doc.id, client);
          
          return client;
        });

        // Fetch pets for all clients
        for (const client of clients) {
          await this.fetchPetsForClient(client);

          // Update the Map with the client including pets
          this.clientsByIdMap.set(client.id, client);
        }
        
        this.clients = clients;
        this.clientsLoaded = true;
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error fetching clients:", error);
        useToast(ToastEvents.error, "Hubo un error al cargar los clientes. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Fetch pets for a client
    async fetchPetsForClient(client: Client): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        // Query pets for this client
        const petsRef = collection(db, 'pet');
        const q = query(
          petsRef,
          where('businessId', '==', currentBusinessId.value),
          where('clientId', '==', client.id),
          orderBy('name', 'asc')
        );
        
        const snapshot = await getDocs(q);
        
        // Map snapshot to pet objects
        const pets: Pet[] = snapshot.docs.map(doc => {
          const data = doc.data();
          
          // Format timestamps
          let birthdate = null;
          if (data.birthdate) {
            birthdate = $dayjs(data.birthdate.toDate()).format('YYYY-MM-DD');
          }
          
          let archivedAt = null;
          if (data.archivedAt) {
            archivedAt = $dayjs(data.archivedAt.toDate()).format('YYYY-MM-DD');
          }
          
          // Return formatted pet with ID
          return {
            id: doc.id,
            businessId: data.businessId,
            clientId: data.clientId,
            name: data.name,
            species: data.species || '',
            breed: data.breed || null,
            birthdate: birthdate,
            originalBirthdate: data.birthdate,
            weight: data.weight || null,
            dietaryRestrictions: data.dietaryRestrictions || '',
            foodPreferences: data.foodPreferences || [],
            feedingSchedule: data.feedingSchedule || '',
            isActive: data.isActive !== false, // Default to true if not specified
            createdBy: data.createdBy,
            createdAt: $dayjs(data.createdAt.toDate()).format('DD/MM/YYYY'),
            updatedAt: $dayjs(data.updatedAt.toDate()).format('DD/MM/YYYY'),
            archivedAt: archivedAt,
          };
        });
        
        // Add pets to client
        client.pets = pets;
        return true;
      } catch (error) {
        console.error("Error fetching pets:", error);
        return false;
      }
    },

    // Create a new client
    async createClient(formData: ClientFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Create client document
        const clientData = {
          businessId: currentBusinessId.value,
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          birthdate: formData.birthdate ? Timestamp.fromDate(formData.birthdate) : null,
          isVip: formData.isVip || false,
          loyaltyLevel: "regular" as LoyaltyLevel,
          totalPurchases: 0,
          lastPurchaseAt: null,
          preferences: formData.preferences || '',
          notes: formData.notes || '',
          isActive: true,
          createdBy: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          archivedAt: null,
        };
        
        const docRef = await addDoc(collection(db, 'client'), clientData);
        
        // Refresh the client list
        await this.fetchClients();
        
        useToast(ToastEvents.success, "Cliente agregado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error creating client:", error);
        useToast(ToastEvents.error, "Hubo un error al crear el cliente. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Update an existing client
    async updateClient(clientId: string, formData: ClientFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing client to verify ownership
        const clientRef = doc(db, 'client', clientId);
        const clientDoc = await getDoc(clientRef);
        
        if (!clientDoc.exists()) {
          useToast(ToastEvents.error, "Cliente no encontrado");
          this.isLoading = false;
          return false;
        }
        
        const clientData = clientDoc.data();
        if (clientData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para editar este cliente");
          this.isLoading = false;
          return false;
        }
        
        // Update client document
        await updateDoc(clientRef, {
          name: formData.name,
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          birthdate: formData.birthdate ? Timestamp.fromDate(formData.birthdate) : null,
          isVip: formData.isVip,
          preferences: formData.preferences || '',
          notes: formData.notes || '',
          updatedAt: serverTimestamp(),
        });
        
        // Refresh the client list or update local state
        const clientIndex = this.clients.findIndex(c => c.id === clientId);
        if (clientIndex >= 0) {
          const { $dayjs } = useNuxtApp();
          
          const updatedClient = {
            ...this.clients[clientIndex],
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            birthdate: formData.birthdate ? $dayjs(formData.birthdate).format('YYYY-MM-DD') : null,
            originalBirthdate: formData.birthdate ? Timestamp.fromDate(formData.birthdate) : null,
            isVip: formData.isVip,
            preferences: formData.preferences || '',
            notes: formData.notes || '',
            updatedAt: $dayjs().format('DD/MM/YYYY'),
          };
          
          this.clients.splice(clientIndex, 1, updatedClient);
          // Also update the Map
          this.clientsByIdMap.set(clientId, updatedClient);

        }
        
        useToast(ToastEvents.success, "Cliente actualizado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating client:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar el cliente. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Archive a client (soft delete)
    async archiveClient(clientId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing client to verify ownership
        const clientRef = doc(db, 'client', clientId);
        const clientDoc = await getDoc(clientRef);
        
        if (!clientDoc.exists()) {
          useToast(ToastEvents.error, "Cliente no encontrado");
          this.isLoading = false;
          return false;
        }
        
        const clientData = clientDoc.data();
        if (clientData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para archivar este cliente");
          this.isLoading = false;
          return false;
        }
        
        // Archive client document
        await updateDoc(clientRef, {
          isActive: false,
          archivedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        // Update local state
        const clientIndex = this.clients.findIndex(c => c.id === clientId);
        if (clientIndex >= 0) {
          const { $dayjs } = useNuxtApp();
          this.clients[clientIndex].isActive = false;
          this.clients[clientIndex].archivedAt = $dayjs().format('YYYY-MM-DD');
          this.clients[clientIndex].originalArchivedAt = Timestamp.now();
        }
        
        useToast(ToastEvents.success, "Cliente archivado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error archiving client:", error);
        useToast(ToastEvents.error, "Hubo un error al archivar el cliente. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Restore an archived client
    async restoreClient(clientId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing client to verify ownership
        const clientRef = doc(db, 'client', clientId);
        const clientDoc = await getDoc(clientRef);
        
        if (!clientDoc.exists()) {
          useToast(ToastEvents.error, "Cliente no encontrado");
          this.isLoading = false;
          return false;
        }
        
        const clientData = clientDoc.data();
        if (clientData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para restaurar este cliente");
          this.isLoading = false;
          return false;
        }
        
        // Restore client document
        await updateDoc(clientRef, {
          isActive: true,
          archivedAt: null,
          updatedAt: serverTimestamp(),
        });
        
        // Update local state
        const clientIndex = this.clients.findIndex(c => c.id === clientId);
        if (clientIndex >= 0) {
          this.clients[clientIndex].isActive = true;
          this.clients[clientIndex].archivedAt = null;
          this.clients[clientIndex].originalArchivedAt = null;
        }
        
        useToast(ToastEvents.success, "Cliente restaurado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error restoring client:", error);
        useToast(ToastEvents.error, "Hubo un error al restaurar el cliente. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Permanently delete a client (hard delete)
    async deleteClient(clientId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing client to verify ownership
        const clientRef = doc(db, 'client', clientId);
        const clientDoc = await getDoc(clientRef);
        
        if (!clientDoc.exists()) {
          useToast(ToastEvents.error, "Cliente no encontrado");
          this.isLoading = false;
          return false;
        }
        
        const clientData = clientDoc.data();
        if (clientData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para eliminar este cliente");
          this.isLoading = false;
          return false;
        }
        
        // Delete all pets for this client first
        const client = this.clients.find(c => c.id === clientId);
        if (client && client.pets && client.pets.length > 0) {
          for (const pet of client.pets) {
            await deleteDoc(doc(db, 'pet', pet.id));
          }
        }
        
        // Delete client document
        await deleteDoc(clientRef);
        
        // Update local state
        this.clients = this.clients.filter(c => c.id !== clientId);  
        // Also remove from the Map
        this.clientsByIdMap.delete(clientId);
        
        useToast(ToastEvents.success, "Cliente eliminado exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error deleting client:", error);
        useToast(ToastEvents.error, "Hubo un error al eliminar el cliente. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Create a new pet for a client
    async createPet(clientId: string, formData: PetFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing client to verify ownership
        const clientRef = doc(db, 'client', clientId);
        const clientDoc = await getDoc(clientRef);
        
        if (!clientDoc.exists()) {
          useToast(ToastEvents.error, "Cliente no encontrado");
          this.isLoading = false;
          return false;
        }
        
        const clientData = clientDoc.data();
        if (clientData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para agregar mascotas a este cliente");
          this.isLoading = false;
          return false;
        }
        
        // Create pet document
        const petData = {
          businessId: currentBusinessId.value,
          clientId: clientId,
          name: formData.name,
          species: formData.species,
          breed: formData.breed || null,
          birthdate: formData.birthdate ? Timestamp.fromDate(formData.birthdate) : null,
          weight: formData.weight || null,
          dietaryRestrictions: formData.dietaryRestrictions || '',
          foodPreferences: formData.foodPreferences || [],
          feedingSchedule: formData.feedingSchedule || '',
          isActive: true,
          createdBy: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          archivedAt: null,
        };
        
        const docRef = await addDoc(collection(db, 'pet'), petData);
        
        // Refresh the pet list for this client
        const client = this.clients.find(c => c.id === clientId);
        if (client) {
          await this.fetchPetsForClient(client);
        }
        
        useToast(ToastEvents.success, "Mascota agregada exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error creating pet:", error);
        useToast(ToastEvents.error, "Hubo un error al agregar la mascota. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Update an existing pet
    async updatePet(petId: string, formData: PetFormData): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing pet to verify ownership
        const petRef = doc(db, 'pet', petId);
        const petDoc = await getDoc(petRef);
        
        if (!petDoc.exists()) {
          useToast(ToastEvents.error, "Mascota no encontrada");
          this.isLoading = false;
          return false;
        }
        
        const petData = petDoc.data();
        if (petData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para editar esta mascota");
          this.isLoading = false;
          return false;
        }
        
        // Update pet document
        await updateDoc(petRef, {
          name: formData.name,
          species: formData.species,
          breed: formData.breed || null,
          birthdate: formData.birthdate ? Timestamp.fromDate(formData.birthdate) : null,
          weight: formData.weight || null,
          dietaryRestrictions: formData.dietaryRestrictions || '',
          foodPreferences: formData.foodPreferences || [],
          feedingSchedule: formData.feedingSchedule || '',
          updatedAt: serverTimestamp(),
        });
        
        // Refresh the pet or update local state
        const client = this.clients.find(c => c.id === petData.clientId);
        if (client) {
          const petIndex = client.pets?.findIndex(p => p.id === petId);
          if (petIndex !== undefined && petIndex >= 0 && client.pets) {
            const { $dayjs } = useNuxtApp();
            
            const updatedPet = {
              ...client.pets[petIndex],
              name: formData.name,
              species: formData.species,
              breed: formData.breed || null,
              birthdate: formData.birthdate ? $dayjs(formData.birthdate).format('YYYY-MM-DD') : null,
              originalBirthdate: formData.birthdate ? Timestamp.fromDate(formData.birthdate) : null,
              weight: formData.weight || null,
              dietaryRestrictions: formData.dietaryRestrictions || '',
              foodPreferences: formData.foodPreferences || [],
              feedingSchedule: formData.feedingSchedule || '',
              updatedAt: $dayjs().format('DD/MM/YYYY'),
            };
            
            client.pets.splice(petIndex, 1, updatedPet);

            // Also update the Map
            this.clientsByIdMap.set(client.id, client);
          }
        }
        
        useToast(ToastEvents.success, "Mascota actualizada exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error updating pet:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar la mascota. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Delete a pet
    async deletePet(petId: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      
      const currentBusinessId = useLocalStorage('cBId', null);
      if (!user.value?.uid || !currentBusinessId.value) return false;

      try {
        this.isLoading = true;
        
        // Get existing pet to verify ownership
        const petRef = doc(db, 'pet', petId);
        const petDoc = await getDoc(petRef);
        
        if (!petDoc.exists()) {
          useToast(ToastEvents.error, "Mascota no encontrada");
          this.isLoading = false;
          return false;
        }
        
        const petData = petDoc.data();
        if (petData.businessId !== currentBusinessId.value) {
          useToast(ToastEvents.error, "No tienes permiso para eliminar esta mascota");
          this.isLoading = false;
          return false;
        }
        
        // Delete pet document
        await deleteDoc(petRef);
        
        // Update local state
        const clientId = petData.clientId;
        const client = this.clients.find(c => c.id === clientId);
        if (client && client.pets) {
          client.pets = client.pets.filter(p => p.id !== petId);
        }
        
        useToast(ToastEvents.success, "Mascota eliminada exitosamente");
        this.isLoading = false;
        return true;
      } catch (error) {
        console.error("Error deleting pet:", error);
        useToast(ToastEvents.error, "Hubo un error al eliminar la mascota. Por favor intenta nuevamente.");
        this.isLoading = false;
        return false;
      }
    },

    // Select a client to view details
    selectClient(clientId: string) {
      this.selectedClient = this.clients.find(c => c.id === clientId) || null;
    },

    // Select a pet to view details
    selectPet(petId: string) {
      if (!this.selectedClient) return;
      
      this.selectedPet = this.selectedClient.pets?.find(p => p.id === petId) || null;
    }
  }
});