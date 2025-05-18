import {
  addDoc,
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
  deleteDoc,
  limit
} from "firebase/firestore";
import { defineStore } from "pinia";
import { ToastEvents } from "~/interfaces";

const defaultObject = {
  userRole: "employee",
  businessImage: {
    imageUrl: "",
    imagePublicId: "",
    imageCompleteInfo: {}
  },
  currentBusiness: {
    id: "",
    name: "",
    description: "",
    address: "",
    imageUrl: "",
    employees: [],
    createdAt: ""
  },
  businesses: [],
  businessesFetched: false,
  employeesFetched: false
};

export const useIndexStore = defineStore("index", {
  state: (): any => {
    return Object.assign({}, defaultObject);
  },
  getters: {
    getUserRole: (state) => state.userRole,
    isOwner: (state) => state.userRole === "propietario",
    getBusinessImage: (state) => state.businessImage,
    areBusinessesFetched: (state) => state.businessesFetched,
    areEmployeesFetched: (state) => state.employeesFetched,
    getBusinesses: (state) => state.businesses,
    getCurrentBusiness: (state) => state.currentBusiness,
    getEmployees: (state) => state.currentBusiness.employees
  },
  actions: {
    async updateRoleInStore() {
      const user = await getCurrentUser();
      const db = useFirestore();
      const businessId = useLocalStorage("cBId", null);

      // Validate the user role
      const role = await getDocs(
        query(collection(db, "roles"), where("userUid", "==", user.uid), where("businessId", "==", businessId.value))
      );

      // If user has no role, redirect to /negocios
      if (role.empty) {
        return false;
      }

      // Get the user role
      const userRole = role.docs[0].data().role;

      this.userRole = userRole;
      return userRole;
    },
    async fetchBusinesses() {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();
      const { $dayjs } = useNuxtApp();

      if (!user.value || this.areBusinessesFetched) {
        return false;
      }

      try {
        // Get all business for this user
        const userBusiness = await getDocs(
          query(
            collection(db, "userBusiness"),
            where("userUid", "==", user.value.uid),
            where("isEmployee", "==", false)
          )
        );

        // Get owned businesses
        this.businesses = userBusiness.docs.map((doc) => {
          const docData = doc.data();

          // Create thumbnail
          docData.imageUrlThumbnail = null;
          if (docData.imageUrl) {
            docData.imageUrlThumbnail = docData.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/");
          }

          return {
            id: doc.id,
            ...docData,
            type: "propietario",
            createdAt: $dayjs(docData.createdAt.toDate()).format("DD/MM/YYYY")
          };
        });

        // Get businesses where this user is an employee
        const userEmployeeBusiness = await getDocs(
          query(collection(db, "userBusiness"), where("userUid", "==", user.value.uid), where("isEmployee", "==", true))
        );

        this.businesses = [
          ...this.businesses,
          ...userEmployeeBusiness.docs.map((doc) => {
            const docData = doc.data();

            // Create thumbnail
            docData.imageUrlThumbnail = null;
            if (docData.imageUrl) {
              docData.imageUrlThumbnail = docData.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/");
            }

            return {
              id: doc.id,
              ...docData,
              type: docData.role.toLowerCase(),
              createdAt: $dayjs(docData.createdAt.toDate()).format("DD/MM/YYYY")
            };
          })
        ];

        // Update current business id in localStorage in case it's not set
        const currentBusinessId = useLocalStorage("cBId", null);
        if (!this.currentBusiness.id && this.businesses.length > 0) {
          // Find matching business
          let business = this.businesses[0];
          if (currentBusinessId.value) {
            business = this.businesses.find((b: any) => {
              if (!b.isEmployee) {
                return b.id === currentBusinessId.value;
              }
              return b.businessId === currentBusinessId.value;
            });

            // If for some reason the business is not found it might have an old businessId
            if (!business) {
              currentBusinessId.value = null;
              // Reload the full page
              window.location.reload();
              return;
            }
          }

          // If for some reason the business is not found it might have an old businessId
          if (!business) {
            currentBusinessId.value = null;
            return;
          }

          // Always save the original businessId
          currentBusinessId.value = !business.isEmployee ? business.id : business.businessId;

          // Update store
          this.currentBusiness = {
            id: !business.isEmployee ? business.id : business.businessId,
            name: business.name,
            phone: business.phone,
            imageUrl: business.imageUrl,
            imageUrlThumbnail: business.imageUrlThumbnail,
            employees: [],
            type: business.type
          };

          this.updateRoleInStore();
        }

        // If not business is found, clear the current business id
        if (currentBusinessId.value) {
          const business = this.businesses.find((b: any) => {
            if (!b.isEmployee) {
              return b.id === currentBusinessId.value;
            }
            return b.businessId === currentBusinessId.value;
          });

          if (!business) {
            currentBusinessId.value = null;
            return;
          }
        }

        this.$state.businessesFetched = true;

        return true;
      } catch (error) {
        console.error(error);
        useToast(ToastEvents.error, "Hubo un error al obtener la información, por favor intenta nuevamente");
        return false;
      }
    },
    async saveBusiness(businessInfo: any) {
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
        // Get all business for this user
        const userBusiness = await getDocs(
          query(collection(db, "userBusiness"), where("userUid", "==", user.value.uid))
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
          userBusinessImageId: businessInfo.userBusinessImageId || null,
          isEmployee: false,
          userUid: user.value.uid,
          createdAt: serverTimestamp()
        });

        // Create the role for this business
        await addDoc(collection(db, "roles"), {
          userUid: user.value.uid,
          businessId: newBusiness.id,
          role: "propietario",
          createdAt: serverTimestamp()
        });

        // Update user business image
        // TODO: Implement image on businesses
        /* if (businessInfo.userBusinessImageId) {
          await updateDoc(doc(db, "userBusinessImage", businessInfo.userBusinessImageId), {
            businessId: newBusiness.id
          });
        } */

        // Update current business id in localStorage in case it's not set
        if (!this.currentBusiness.id) {
          useLocalStorage("cBId", newBusiness.id);

          // Update store
          this.currentBusiness = {
            id: newBusiness.id,
            name: businessInfo.name,
            phone: businessInfo.phone,
            imageUrl: businessInfo.imageUrl || null,
            imageUrlThumbnail: businessInfo.imageUrlThumbnail || null,
            employees: [],
            type: "propietario" // Only owner can create a business
          };
        }

        // Update businesses
        this.businesses = [
          ...this.businesses,
          {
            id: newBusiness.id,
            name: businessInfo.name,
            phone: businessInfo.phone,
            description: businessInfo.description || null,
            address: businessInfo.address || null,
            imageUrl: businessInfo.imageUrl || null,
            userBusinessImageId: businessInfo.userBusinessImageId || null,
            type: "propietario", // Only owner can create a business
            userUid: user.value.uid,
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
    async changeCurrentBusiness(businessId: string) {
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
    async joinBusiness(code: string) {
      // Get Firestore and Current User
      const db = useFirestore();
      const user = useCurrentUser();

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
        // Get business with this code
        const userBusiness = await getDocs(
          query(
            collection(db, "userBusiness"),
            where("code", "==", code),
            where("status", "==", "Pendiente de aprobación"),
            where("userUid", "==", null)
          )
        );

        if (userBusiness.docs.length === 0) {
          useToast(
            ToastEvents.error,
            "El código ingresado no es válido. Es probable que ya haya sido utilizado o estes intentando unirte a tu propia tienda"
          );
          return false;
        }

        // Update business
        const business = userBusiness.docs[0];
        await updateDoc(doc(db, "userBusiness", business.id), {
          status: "Activo",
          userUid: user.value.uid,
          acceptedAt: serverTimestamp()
        });

        // Get business information
        const businessInfo = business.data();

        // Add user role document depending on the information
        await addDoc(collection(db, "roles"), {
          userUid: user.value.uid,
          // Here we use businessId because it's the owner's businessId
          businessId: businessInfo.businessId,
          role: businessInfo.role.toLowerCase(),
          createdAt: serverTimestamp()
        });

        // Update current business id in localStorage in case it's not set
        if (!this.currentBusiness.id) {
          useLocalStorage("cBId", businessInfo.businessId);

          // Create thumbnail
          businessInfo.imageUrlThumbnail = null;
          if (businessInfo.imageUrl) {
            businessInfo.imageUrlThumbnail = businessInfo.imageUrl.replace("upload/", "upload/c_thumb,w_200,g_face/");
          }

          // Update store
          this.currentBusiness = {
            id: business.id,
            businessId: businessInfo.businessId,
            name: businessInfo.name,
            phone: businessInfo.phone,
            isEmployee: true,
            imageUrl: businessInfo.imageUrl || null,
            imageUrlThumbnail: businessInfo.imageUrlThumbnail || null,
            employees: [],
            type: businessInfo.role.toLowerCase()
          };
        }

        // Update businesses
        this.businesses = [
          ...this.businesses,
          {
            id: business.id,
            businessId: businessInfo.businessId,
            name: businessInfo.name,
            isEmployee: true,
            imageUrl: businessInfo.imageUrl || null,
            imageUrlThumbnail: businessInfo.imageUrlThumbnail || null,
            employees: [],
            type: businessInfo.role.toLowerCase()
          }
        ];

        return true;
      } catch (error) {
        console.error(error);
        useToast(ToastEvents.error, "Hubo un error al guardar la información, por favor intenta nuevamente");
        return false;
      }
    }
  }
});