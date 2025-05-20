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
  documentId
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
      employeesFetched: false
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
    getEmployees: (state) => state.currentBusiness.employees || []
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
            employees: [],
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

        // Create the owner role in userRole
        await addDoc(collection(db, "userRole"), {
          userUid: user.value.uid,
          businessId: newBusiness.id,
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
    }
  }
});