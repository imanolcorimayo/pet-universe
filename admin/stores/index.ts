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
  deleteDoc,
  limit,
  documentId,
  orderBy,
  deleteField
} from "firebase/firestore";
import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";


// User role types
type UserRoleType = "propietario" | "vendedor" | "empleado" | "administrador";
type RoleStatus = "active" | "pending" | "archived";

// Business and role interfaces
interface BusinessImage {
  imageUrl: string;
  imagePublicId: string;
  imageCompleteInfo: Record<string, any>;
}

interface Business {
  id: string;
  name: string;
  phone?: string;
  description?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  imageUrlThumbnail?: string | null;
  userBusinessImageId?: string | null;
  employees?: Employee[];
  createdAt: string;
  type?: string;
  ownerUid?: string;
}

interface Employee {
  id: string;
  userUid: string;
  name: string;
  email: string;
  role: UserRoleType;
  status: RoleStatus;
  createdAt: string;
}

interface UserRole {
  userUid: string | null;
  businessId: string;
  role: UserRoleType;
  status: RoleStatus;
  code?: string;
  invitedBy?: string;
  invitedAt?: any; // Firebase Timestamp
  acceptedAt?: any | null; // Firebase Timestamp
  createdAt: any; // Firebase Timestamp
  updatedAt: any; // Firebase Timestamp
}

// Store state interface
interface IndexState {
  userRole: UserRoleType | string;
  businessImage: BusinessImage;
  currentBusiness: Business;
  businesses: Business[];
  businessesFetched: boolean;
  employeesFetched: boolean;
  businessConfig: BusinessConfig | null;
  businessConfigFetched: boolean;
}

// Method responses
interface SaveEmployeeResponse {
  success: boolean;
  invitationCode?: string;
  roleId?: string;
}

interface BusinessInfo {
  name: string;
  phone: string;
  description?: string | null;
  address?: string | null;
  imageUrl?: string | null;
  imageUrlThumbnail?: string | null;
  userBusinessImageId?: string | null;
}

interface EmployeeInfo {
  role: UserRoleType;
  email?: string;
  name?: string;
}

// -------------- Configuration Interfaces --------------

interface Category {
  name: string;
  active: boolean;
  isDefault?: boolean;
}

interface BusinessConfig {
  id: string;
  businessId: string;
  incomeCategories: Record<string, Category>;
  expenseCategories: Record<string, Category>;
  createdAt: any;
  updatedAt: any;
}

export const useIndexStore = defineStore("index", {
  state: (): IndexState => {
    return {
      userRole: "employee",
      businessImage: {
        imageUrl: "",
        imagePublicId: "",
        imageCompleteInfo: {}
      },
      currentBusiness: {
        id: "",
        name: "",
        description: null,
        address: null,
        imageUrl: null,
        employees: [],
        createdAt: ""
      },
      businesses: [],
      businessesFetched: false,
      employeesFetched: false,
      businessConfig: null,
      businessConfigFetched: false
    };
  },
  getters: {
    getUserRole: (state): string => state.userRole,
    isOwner: (state): boolean => state.userRole === "propietario",
    getBusinessImage: (state) => state.businessImage,
    areBusinessesFetched: (state): boolean => state.businessesFetched,
    areEmployeesFetched: (state): boolean => state.employeesFetched,
    getBusinesses: (state): Business[] => state.businesses,
    getCurrentBusiness: (state): Business => state.currentBusiness,
    getEmployees: (state) => state.currentBusiness.employees || [],

    // ----------- Configuration Getters
    getBusinessConfig: (state): BusinessConfig | null => state.businessConfig,
    getActiveIncomeCategories: (state): Record<string, Category> => {
      if (!state.businessConfig) return {};
      
      const result: Record<string, Category> = {};
      Object.entries(state.businessConfig.incomeCategories).forEach(([code, category]) => {
        if (category.active) {
          result[code] = category;
        }
      });
      return result;
    },
    getActiveExpenseCategories: (state): Record<string, Category> => {
      if (!state.businessConfig) return {};
      
      const result: Record<string, Category> = {};
      Object.entries(state.businessConfig.expenseCategories).forEach(([code, category]) => {
        if (category.active) {
          result[code] = category;
        }
      });
      return result;
    },
  },
  actions: {
    async updateRoleInStore(): Promise<UserRoleType | boolean> {
      const user = await getCurrentUser();
      const db = useFirestore();
      const businessId = useLocalStorage("cBId", null);
    
      if (!user || !businessId.value) {
        return false;
      }
    
      try {
        // Validate the user role
        const roleQuery = await getDocs(
          query(
            collection(db, "userRole"),
            where("userUid", "==", user.uid),
            where("businessId", "==", businessId.value),
            where("status", "==", "active")
          )
        );
    
        // If user has no role, return false
        if (roleQuery.empty) {
          return false;
        }
    
        // Get the user role
        const userRole = roleQuery.docs[0].data().role as UserRoleType;
    
        this.userRole = userRole;
        return userRole;
      } catch (error) {
        console.error("Error updating role in store:", error);
        return false;
      }
    },
    
    async fetchBusinesses(): Promise<boolean> {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
    
      if (!user.value || this.areBusinessesFetched) {
        return false;
      }
    
      try {
        // Get all businesses owned by this user
        const userBusiness = await getDocs(
          query(
            collection(db, "userBusiness"),
            where("ownerUid", "==", user.value.uid)
          )
        );
    
        // Get owned businesses
        this.businesses = userBusiness.docs.map((doc) => {
          const docData = doc.data();
    
          // Create thumbnail
          let imageUrlThumbnail: string | null = null;
          if (docData.imageUrl) {
            imageUrlThumbnail = docData.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/");
          }
    
          return {
            id: doc.id,
            ...docData,
            imageUrlThumbnail,
            type: "propietario",
            createdAt: $dayjs(docData.createdAt.toDate()).format("DD/MM/YYYY")
          } as Business;
        });
    
        // Get businesses where this user is an employee (via userRole)
        const userRoles = await getDocs(
          query(
            collection(db, "userRole"),
            where("userUid", "==", user.value.uid),
            where("status", "==", "active"),
            where("role", "!=", "propietario")
          )
        );
    
        // If user has employee roles, fetch the associated businesses
        if (!userRoles.empty) {
          const businessIds = userRoles.docs.map(doc => doc.data().businessId);
          
          // Get business details for each role
          const employeeBusinesses = await getDocs(
            query(
              collection(db, "userBusiness"),
              where(documentId(), "in", businessIds)
            )
          );
    
          // Add employee businesses to the list
          this.businesses = [
            ...this.businesses,
            ...employeeBusinesses.docs.map((doc) => {
              const docData = doc.data();
              const userRole = userRoles.docs.find(
                role => role.data().businessId === doc.id
              );
              const roleData = userRole ? userRole.data() : { role: "empleado" };
    
              // Create thumbnail
              let imageUrlThumbnail: string | null = null;
              if (docData.imageUrl) {
                imageUrlThumbnail = docData.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/");
              }
    
              return {
                id: doc.id,
                ...docData,
                imageUrlThumbnail,
                type: roleData.role.toLowerCase(),
                createdAt: $dayjs(docData.createdAt.toDate()).format("DD/MM/YYYY")
              } as Business;
            })
          ];
        }
    
        // Update current business id in localStorage
        const currentBusinessId = useLocalStorage("cBId", null);
        if (!this.currentBusiness.id && this.businesses.length > 0) {
          // Find matching business
          let business = this.businesses[0];
          if (currentBusinessId.value) {
            business = this.businesses.find((b) => b.id === currentBusinessId.value) || this.businesses[0];
    
            // If business not found, reset and reload
            if (!business) {
              currentBusinessId.value = null;
              window.location.reload();
              return false;
            }
          }
    
          // Save the business ID
          // @ts-ignore
          currentBusinessId.value = business.id;
    
          // Update store
          this.currentBusiness = {
            id: business.id,
            name: business.name,
            phone: business.phone,
            imageUrl: business.imageUrl,
            imageUrlThumbnail: business.imageUrlThumbnail,
            employees: this.$state.employeesFetched ? this.$state.currentBusiness.employees : [],
            createdAt: business.createdAt,
            type: business.type
          };
    
          this.updateRoleInStore();
        }
    
        // If no business is found, clear the current business id
        if (currentBusinessId.value) {
          const business = this.businesses.find((b) => b.id === currentBusinessId.value);
    
          if (!business) {
            currentBusinessId.value = null;
            return false;
          }
        }
    
        this.businessesFetched = true;
        return true;
      } catch (error) {
        console.error(error);
        useToast(ToastEvents.error, "Hubo un error al obtener la información, por favor intenta nuevamente");
        return false;
      }
    },
    
    async saveBusiness(businessInfo: BusinessInfo): Promise<boolean> {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();

      if (!user.value) {
        return false;
      }

      // Validate information. Name is the only field required
      if (!businessInfo.name || typeof businessInfo.name !== "string") {
        useToast(ToastEvents.error, "El nombre de la tienda es requerido. Si el error persiste, contáctese con soporte");
        return false;
      }

      // Validate it has phone
      if (!businessInfo.phone || typeof businessInfo.phone !== "string" || businessInfo.phone.length != 14) {
        useToast(ToastEvents.error, "El teléfono de la tienda no es válido. Si el error persiste, contáctese con soporte");
        return false;
      }

      try {
        // Validate this user does not have 3 business already
        const userBusiness = await getDocs(
          query(collection(db, "userBusiness"), where("ownerUid", "==", user.value.uid))
        );
        if (userBusiness.docs.length >= 3) {
          useToast(ToastEvents.error, "No puedes tener mas de 3 tiendas registradas");
          return false;
        }

        // Create business
        const newBusiness = await addDoc(collection(db, "userBusiness"), {
          name: businessInfo.name,
          phone: businessInfo.phone,
          description: businessInfo.description || null,
          address: businessInfo.address || null,
          imageUrl: businessInfo.imageUrl || null,
          imageUrlThumbnail: businessInfo.imageUrl ? 
            businessInfo.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/") : null,
          userBusinessImageId: businessInfo.userBusinessImageId || null,
          ownerUid: user.value.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          archivedAt: null
        });

        // Create default payment method and owners account
        const paymentMethodsStore = usePaymentMethodsStore();
        const defaultPaymentSetup = await paymentMethodsStore.createDefaultPaymentMethodAndAccount();
        
        if (!defaultPaymentSetup) {
          console.warn('Failed to create default payment method and account for new business');
          // Continue anyway - this is not a critical failure
        }

        // Create the owner role in userRole
        await addDoc(collection(db, "userRole"), {
          userUid: user.value.uid,
          businessId: newBusiness.id,
          userName: user.value.displayName,
          userEmail: user.value.email,
          role: "propietario" as UserRoleType,
          status: "active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          invitedBy: user.value.uid,
          invitedAt: serverTimestamp(),
          acceptedAt: serverTimestamp()
        });

        // Update current business id in localStorage
        if (!this.currentBusiness.id) {
          const cBId = useLocalStorage("cBId", null);
          // @ts-ignore
          cBId.value = newBusiness.id;

          // Update store
          this.currentBusiness = {
            id: newBusiness.id,
            name: businessInfo.name,
            phone: businessInfo.phone,
            imageUrl: businessInfo.imageUrl || null,
            imageUrlThumbnail: businessInfo.imageUrl ? 
              businessInfo.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/") : null,
            employees: [],
            createdAt: $dayjs().format("DD/MM/YYYY"),
            type: "propietario"
          };
        }

        // Update businesses in store
        this.businesses = [
          ...this.businesses,
          {
            id: newBusiness.id,
            name: businessInfo.name,
            phone: businessInfo.phone,
            description: businessInfo.description || null,
            address: businessInfo.address || null,
            imageUrl: businessInfo.imageUrl || null,
            imageUrlThumbnail: businessInfo.imageUrl ? 
              businessInfo.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/") : null,
            userBusinessImageId: businessInfo.userBusinessImageId || null,
            type: "propietario",
            ownerUid: user.value.uid,
            createdAt: $dayjs().format("DD/MM/YYYY")
          }
        ];

        return true;
      } catch (error) {
        console.error(error);
        useToast(ToastEvents.error, "Hubo un error al guardar la información, por favor intenta nuevamente");
        return false;
      }
    },
    
    async changeCurrentBusiness(businessId: string): Promise<boolean> {
      // Get Firestore and Current User
      const user = useCurrentUser();

      if (!user.value) {
        return false;
      }

      try {
        // Update current business id in localStorage
        const cBId = useLocalStorage("cBId", businessId);
        cBId.value = businessId;

        // Reload the full page
        window.location.reload();

        return true;
      } catch (error) {
        console.error(error);
        useToast(ToastEvents.error, "Hubo un error al cambiar de tienda, por favor intenta nuevamente");
        return false;
      }
    },
    
    async joinBusiness(code: string): Promise<boolean> {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
    
      if (!user.value) {
        return false;
      }
    
      // Validate information
      if (!code || typeof code !== "string") {
        useToast(ToastEvents.error, "El código es requerido. Por favor ingresalo e intenta nuevamente");
        return false;
      }
    
      if (!code.includes("-")) {
        useToast(ToastEvents.error, "El código ingresado no es válido. Por favor intenta nuevamente");
        return false;
      }
    
      try {
        // Get pending invitation with this code
        const invitations = await getDocs(
          query(
            collection(db, "userRole"),
            where("code", "==", code),
            where("status", "==", "pending"),
            where("userUid", "==", null)
          )
        );
    
        if (invitations.empty) {
          useToast(
            ToastEvents.error,
            "El código ingresado no es válido. Es probable que ya haya sido utilizado o esté expirado."
          );
          return false;
        }
    
        // Get the invitation
        const invitation = invitations.docs[0];
        const invitationData = invitation.data() as UserRole;
        
        // Update the userRole document to link it to this user
        await updateDoc(doc(db, "userRole", invitation.id), {
          userUid: user.value.uid,
          userName: user.value.displayName,
          userEmail: user.value.email,
          status: "active",
          acceptedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
    
        // Get business information
        const businessDoc = await getDoc(doc(db, "userBusiness", invitationData.businessId));
        
        if (!businessDoc.exists()) {
          useToast(ToastEvents.error, "El negocio asociado a esta invitación ya no existe.");
          return false;
        }
        
        const businessData = businessDoc.data();
    
        // Update current business id in localStorage
        const cBId = useLocalStorage("cBId", null);
        // @ts-ignore
        cBId.value = invitationData.businessId;
    
        // Create thumbnail
        const imageUrlThumbnail = businessData.imageUrl ? 
          businessData.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/") : null;
    
        // Update store
        this.currentBusiness = {
          id: invitationData.businessId,
          name: businessData.name,
          phone: businessData.phone,
          imageUrl: businessData.imageUrl || null,
          imageUrlThumbnail: imageUrlThumbnail,
          employees: [],
          createdAt: $dayjs(businessData.createdAt.toDate()).format("DD/MM/YYYY"),
          type: invitationData.role.toLowerCase()
        };
    
        // Update businesses list
        this.businesses = [
          ...this.businesses,
          {
            id: invitationData.businessId,
            name: businessData.name,
            phone: businessData.phone,
            imageUrl: businessData.imageUrl || null,
            imageUrlThumbnail: imageUrlThumbnail,
            type: invitationData.role.toLowerCase(),
            createdAt: $dayjs(businessData.createdAt.toDate()).format("DD/MM/YYYY")
          }
        ];
    
        return true;
      } catch (error) {
        console.error(error);
        useToast(ToastEvents.error, "Hubo un error al unirte al negocio, por favor intenta nuevamente");
        return false;
      }
    },
    
    async fetchEmployees(): Promise<boolean> {
      // Get Firestore and Current User
      const db = useFirestore();
      const { $dayjs } = useNuxtApp();
    
      // Get current business ID
      const businessId = useLocalStorage("cBId", null).value;
      
      if (!businessId) {
        useToast(ToastEvents.error, "No se encontró un negocio seleccionado");
        return false;
      }
      
      // Check if already fetched employees and prevent redundant fetches
      if (this.employeesFetched) {
        return true;
      }
      
      try {
        // Get all roles for this business (active, pending and archived)
        const rolesSnapshot = await getDocs(
          query(
            collection(db, "userRole"),
            where("businessId", "==", businessId),
            orderBy("createdAt", "desc")
          )
        );

        // If no roles, set empty array and return
        if (rolesSnapshot.empty) {
          this.currentBusiness.employees = [];
          this.employeesFetched = true;
          return true;
        }
        
        // Process roles
        const roles = rolesSnapshot.docs.map((doc) => {
          const roleData = doc.data();
          
          // Format creation date
          let createdAt = "";
          if (roleData.createdAt) {
            createdAt = $dayjs(roleData.createdAt.toDate()).format("DD/MM/YYYY");
          }
          
          // Get name and email (if user is linked)
          let name = "";
          let email = "";
          
          // Return role data with id
          return {
            id: doc.id,
            name: roleData.userName || name,
            email: roleData.userEmail || email,
            role: roleData.role,
            status: roleData.status,
            code: roleData.code || null,
            userUid: roleData.userUid || null,
            createdAt,
          } as Employee;
        });
        
        // Get all user information for linked users
        const userUids = roles
          .filter(role => role.userUid)
          .map(role => role.userUid);
          
        if (userUids.length > 0) {
          // Query Firebase Auth users or user profile collection
          // Implementation depends on how user data is stored
          // This is a placeholder for actual implementation
        }
        
        // Set employees and update fetched flag
        this.currentBusiness.employees = roles;
        this.employeesFetched = true;
        return true;
      } catch (error) {
        console.error("Error fetching employees:", error);
        useToast(ToastEvents.error, "Hubo un error al obtener los empleados, por favor intenta nuevamente");
        return false;
      }
    },
    
    async deactivateEmployee(roleId: string): Promise<boolean> {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();
      
      if (!user.value) {
        return false;
      }
      
      // Get current business ID
      const businessId = useLocalStorage("cBId", null).value;
      
      if (!businessId) {
        useToast(ToastEvents.error, "No se encontró un negocio seleccionado");
        return false;
      }
      
      try {
        // Get the role document
        const roleDoc = await getDoc(doc(db, "userRole", roleId));
        
        if (!roleDoc.exists()) {
          useToast(ToastEvents.error, "El rol especificado no existe");
          return false;
        }
        
        const roleData = roleDoc.data();
        
        // Validate role belongs to current business
        if (roleData.businessId !== businessId) {
          useToast(ToastEvents.error, "No tienes permisos para modificar este rol");
          return false;
        }
        
        // Update role status to archived
        await updateDoc(doc(db, "userRole", roleId), {
          status: "archived" as RoleStatus,
          updatedAt: serverTimestamp(),
          archivedBy: user.value.uid,
          archivedAt: serverTimestamp()
        });
        
        // Update in store
        if (this.currentBusiness.employees) {
          const employeeIndex = this.currentBusiness.employees.findIndex(emp => emp.id === roleId);
          
          if (employeeIndex >= 0) {
            this.currentBusiness.employees[employeeIndex].status = "archived";
          }
        }
        
        useToast(ToastEvents.success, "El empleado ha sido desactivado exitosamente");
        return true;
      } catch (error) {
        console.error("Error deactivating employee:", error);
        useToast(ToastEvents.error, "Hubo un error al desactivar el empleado, por favor intenta nuevamente");
        return false;
      }
    },
    
    async reactivateEmployee(roleId: string): Promise<boolean> {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();
      
      if (!user.value) {
        return false;
      }
      
      // Get current business ID
      const businessId = useLocalStorage("cBId", null).value;
      
      if (!businessId) {
        useToast(ToastEvents.error, "No se encontró un negocio seleccionado");
        return false;
      }
      
      try {
        // Get the role document
        const roleDoc = await getDoc(doc(db, "userRole", roleId));
        
        if (!roleDoc.exists()) {
          useToast(ToastEvents.error, "El rol especificado no existe");
          return false;
        }
        
        const roleData = roleDoc.data();
        
        // Validate role belongs to current business
        if (roleData.businessId !== businessId) {
          useToast(ToastEvents.error, "No tienes permisos para modificar este rol");
          return false;
        }
        
        // Can only reactivate if status is archived
        if (roleData.status !== "archived") {
          useToast(ToastEvents.error, "Solo se pueden reactivar empleados archivados");
          return false;
        }
        
        // Update role status to active
        await updateDoc(doc(db, "userRole", roleId), {
          status: "active" as RoleStatus,
          updatedAt: serverTimestamp(),
          reactivatedBy: user.value.uid,
          reactivatedAt: serverTimestamp()
        });
        
        // Update in store
        if (this.currentBusiness.employees) {
          const employeeIndex = this.currentBusiness.employees.findIndex(emp => emp.id === roleId);
          
          if (employeeIndex >= 0) {
            this.currentBusiness.employees[employeeIndex].status = "active";
          }
        }
        
        useToast(ToastEvents.success, "El empleado ha sido reactivado exitosamente");
        return true;
      } catch (error) {
        console.error("Error reactivating employee:", error);
        useToast(ToastEvents.error, "Hubo un error al reactivar el empleado, por favor intenta nuevamente");
        return false;
      }
    },
    
    async updateEmployeeRole(roleId: string, newRole: UserRoleType): Promise<boolean> {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();
      
      if (!user.value) {
        return false;
      }
      
      // Get current business ID
      const businessId = useLocalStorage("cBId", null).value;
      
      if (!businessId) {
        useToast(ToastEvents.error, "No se encontró un negocio seleccionado");
        return false;
      }
      
      // Validate new role
      if (!newRole || typeof newRole !== "string") {
        useToast(ToastEvents.error, "El rol es requerido");
        return false;
      }
      
      try {
        // Get the role document
        const roleDoc = await getDoc(doc(db, "userRole", roleId));
        
        if (!roleDoc.exists()) {
          useToast(ToastEvents.error, "El rol especificado no existe");
          return false;
        }
        
        const roleData = roleDoc.data();
        
        // Validate role belongs to current business
        if (roleData.businessId !== businessId) {
          useToast(ToastEvents.error, "No tienes permisos para modificar este rol");
          return false;
        }
        
        // Cannot change role for owners
        if (roleData.role === "propietario") {
          useToast(ToastEvents.error, "No se puede cambiar el rol del propietario");
          return false;
        }
        
        // Update role
        await updateDoc(doc(db, "userRole", roleId), {
          role: newRole,
          updatedAt: serverTimestamp()
        });
        
        // Update in store
        if (this.currentBusiness.employees) {
          const employeeIndex = this.currentBusiness.employees.findIndex(emp => emp.id === roleId);
          
          if (employeeIndex >= 0) {
            this.currentBusiness.employees[employeeIndex].role = newRole;
          }
        }
        
        useToast(ToastEvents.success, "El rol del empleado ha sido actualizado exitosamente");
        return true;
      } catch (error) {
        console.error("Error updating employee role:", error);
        useToast(ToastEvents.error, "Hubo un error al actualizar el rol del empleado, por favor intenta nuevamente");
        return false;
      }
    },
    
    async saveEmployee(employeeInfo: EmployeeInfo): Promise<SaveEmployeeResponse | boolean> {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();
    
      if (!user.value) {
        return false;
      }
    
      // Get current business ID
      const businessId = useLocalStorage("cBId", null).value;
      
      if (!businessId) {
        useToast(ToastEvents.error, "No se encontró un negocio seleccionado");
        return false;
      }
    
      // Validate information
      if (!employeeInfo.role || typeof employeeInfo.role !== "string") {
        useToast(ToastEvents.error, "El rol del empleado es requerido");
        return false;
      }
    
      try {
        // Generate a unique invitation code (format: businessId-XXXX)
        const shortBusinessId = (businessId as string).substring(0, 4);
        const randomCode = Math.random().toString(36).substring(2, 6).toUpperCase();
        const invitationCode = `${shortBusinessId}-${randomCode}`;
    
        // Create the employee role with pending status
        const roleDoc = await addDoc(collection(db, "userRole"), {
          userUid: null, // Will be filled when invitation is accepted
          businessId: businessId,
          role: employeeInfo.role,
          status: "pending",
          code: invitationCode,
          invitedBy: user.value.uid,
          invitedAt: serverTimestamp(),
          acceptedAt: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
    
        return {
          success: true,
          invitationCode: invitationCode,
          roleId: roleDoc.id
        };
      } catch (error) {
        console.error(error);
        useToast(ToastEvents.error, "Hubo un error al crear la invitación, por favor intenta nuevamente");
        return false;
      }
    },

    // -------------- Configuration Methods --------------

    async loadBusinessConfig(): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness) return false;
      
      try {
        // Check if config exists for this business
        const configQuery = query(
          collection(db, 'businessConfig'),
          where('businessId', '==', currentBusinessId.value),
          limit(1)
        );
        
        const configSnapshot = await getDocs(configQuery);
        
        if (!configSnapshot.empty) {
          // Config exists, load it
          const configData = configSnapshot.docs[0].data();
          this.businessConfig = {
            id: configSnapshot.docs[0].id,
            ...configData
          } as BusinessConfig;
        } else {
          // Config doesn't exist, create default
          await this.createDefaultBusinessConfig();
        }
        
        this.businessConfigFetched = true;
        return true;
      } catch (error) {
        console.error('Error loading business config:', error);
        useToast(ToastEvents.error, 'Error al cargar la configuración del negocio');
        return false;
      }
    },
    
    async createDefaultBusinessConfig(): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const currentBusinessId = useLocalStorage('cBId', null);
      const isLoggedIn = !!user.value?.uid;
      const hasActiveBusiness = !!currentBusinessId.value;
      
      if (!isLoggedIn || !hasActiveBusiness || !user.value) return false;
      
      try {
        // Default income categories
        const defaultIncomeCategories: Record<string, Category> = {
          "ventas": { name: "Ventas", active: true, isDefault: true },
          "otros-ingresos": { name: "Otros ingresos", active: true }
        };
        
        // Default expense categories
        const defaultExpenseCategories: Record<string, Category> = {
          "compras": { name: "Compras", active: true, isDefault: true },
          "servicios": { name: "Servicios", active: true },
          "mantenimiento": { name: "Mantenimiento", active: true },
          "salarios": { name: "Sueldos", active: true },
          "varios": { name: "Gastos varios", active: true }
        };
        
        const configData = {
          businessId: currentBusinessId.value,
          incomeCategories: defaultIncomeCategories,
          expenseCategories: defaultExpenseCategories,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.value.uid,
          updatedBy: user.value.uid
        };
        
        // Add to Firestore
        const configRef = await addDoc(collection(db, 'businessConfig'), configData);
        
        // Update local state
        this.businessConfig = {
          id: configRef.id,
          ...configData
        } as unknown as BusinessConfig;
        
        return true;
      } catch (error) {
        console.error('Error creating default business config:', error);
        useToast(ToastEvents.error, 'Error al crear la configuración del negocio');
        return false;
      }
    },
    
    async updateCategory(type: 'income' | 'expense', code: string, data: Category): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const isLoggedIn = !!user.value?.uid;
      
      if (!isLoggedIn || !this.businessConfig) return false;
      
      // TypeScript type assertion
      if (!user.value) {
        useToast(ToastEvents.error, 'No se encontró el usuario');
        return false;
      }
      
      const categoryType = type === 'income' ? 'incomeCategories' : 'expenseCategories';
      
      try {
        // Update in Firestore
        await updateDoc(doc(db, 'businessConfig', this.businessConfig.id), {
          [`${categoryType}.${code}`]: data,
          updatedAt: serverTimestamp(),
          updatedBy: user.value.uid
        });
        
        // Update local state
        if (type === 'income' && this.businessConfig.incomeCategories) {
          this.businessConfig.incomeCategories[code] = data;
        } else if (type === 'expense' && this.businessConfig.expenseCategories) {
          this.businessConfig.expenseCategories[code] = data;
        }
        
        useToast(ToastEvents.success, 'Categoría actualizada correctamente');
        return true;
      } catch (error) {
        console.error('Error updating category:', error);
        useToast(ToastEvents.error, 'Error al actualizar la categoría');
        return false;
      }
    },
    
    async addCategory(type: 'income' | 'expense', code: string, data: Category): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const isLoggedIn = !!user.value?.uid;
      
      if (!isLoggedIn || !this.businessConfig) return false;
      
      // TypeScript type assertion
      if (!user.value) {
        useToast(ToastEvents.error, 'No se encontró el usuario');
        return false;
      }
      
      // Validate code format (alphanumeric, no spaces)
      if (!/^[a-z0-9_]+$/.test(code)) {
        useToast(ToastEvents.error, 'El código debe contener solo letras minúsculas, números y guiones bajos');
        return false;
      }
      
      const categoryType = type === 'income' ? 'incomeCategories' : 'expenseCategories';
      const categories = type === 'income' ? this.businessConfig.incomeCategories : this.businessConfig.expenseCategories;
      
      // Check if code already exists
      if (categories && categories[code]) {
        useToast(ToastEvents.error, 'Ya existe una categoría con este código');
        return false;
      }
      
      try {
        // Update in Firestore
        await updateDoc(doc(db, 'businessConfig', this.businessConfig.id), {
          [`${categoryType}.${code}`]: data,
          updatedAt: serverTimestamp(),
          updatedBy: user.value.uid
        });
        
        // Update local state
        if (type === 'income' && this.businessConfig.incomeCategories) {
          this.businessConfig.incomeCategories[code] = data;
        } else if (type === 'expense' && this.businessConfig.expenseCategories) {
          this.businessConfig.expenseCategories[code] = data;
        }
        
        useToast(ToastEvents.success, 'Categoría añadida correctamente');
        return true;
      } catch (error) {
        console.error('Error adding category:', error);
        useToast(ToastEvents.error, 'Error al añadir la categoría');
        return false;
      }
    },
    
    async deleteCategory(type: 'income' | 'expense', code: string): Promise<boolean> {
      const db = useFirestore();
      const user = useCurrentUser();
      const isLoggedIn = !!user.value?.uid;
      
      if (!isLoggedIn || !this.businessConfig) return false;
      
      // TypeScript type assertion
      if (!user.value) {
        useToast(ToastEvents.error, 'No se encontró el usuario');
        return false;
      }
      
      const categoryType = type === 'income' ? 'incomeCategories' : 'expenseCategories';
      const categories = type === 'income' ? this.businessConfig.incomeCategories : this.businessConfig.expenseCategories;
      
      // Check if category exists
      if (!categories || !categories[code]) {
        useToast(ToastEvents.error, 'La categoría no existe');
        return false;
      }

      // Check if it's the default category
      if (categories[code].isDefault) {
        useToast(ToastEvents.error, 'No se puede eliminar la categoría predeterminada');
        return false;
      }
      
      try {
        // Use Firebase field delete functionality
        const updateData = {
          [`${categoryType}.${code}`]: deleteField(),
          updatedAt: serverTimestamp(),
          updatedBy: user.value.uid
        };
        
        // Update in Firestore
        await updateDoc(doc(db, 'businessConfig', this.businessConfig.id), updateData);
        
        // Update local state - remove the category
        if (type === 'income' && this.businessConfig.incomeCategories) {
          delete this.businessConfig.incomeCategories[code];
        } else if (type === 'expense' && this.businessConfig.expenseCategories) {
          delete this.businessConfig.expenseCategories[code];
        }
        
        useToast(ToastEvents.success, 'Categoría eliminada correctamente');
        return true;
      } catch (error) {
        console.error('Error deleting category:', error);
        useToast(ToastEvents.error, 'Error al eliminar la categoría');
        return false;
      }
    }
  }
});