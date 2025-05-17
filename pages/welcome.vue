<template>
  <div>
    <div
      class="container flex flex-col justify-center align-center gap-[2.857rem] h-[90vh] max-w-[80rem] px-[1.429rem] m-auto"
    >
      <div class="w-full flex justify-center align-center">
        <IcTwotonePets class="w-[100px] h-auto text-primary" />
      </div>
      <div class="flex flex-col justify-center gap-[0.571rem] text-center">
        <h1>Bienvenido a Pet Universe! 🐾</h1>
        <span class="text-gray-600 text-[1.143rem]">Inicia sesión para administrar tu tienda de mascotas</span>
      </div>
      <div class="flex flex-col items-center">
        <button class="w-full max-w-80 btn bg-primary text-white" @click="googleSignIn">
          <div class="flex items-center justify-center gap-[0.571rem]">
            <FlatColorIconsGoogle class="text-[1.5rem]" />
            <span class="">Iniciar Sesión Con Google</span>
          </div>
        </button>
      </div>
    </div>
  </div>
  <TheFooter />
</template>

<script setup>
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import FlatColorIconsGoogle from "~icons/flat-color-icons/google";
import IcTwotonePets from '~icons/ic/twotone-pets';

definePageMeta({
  layout: false
});

const googleAuthProvider = new GoogleAuthProvider();

// ---- Define Vars ----------
const auth = useFirebaseAuth();
const route = useRoute();
const error = ref(false);

// ---- Define Methods ----------
// Use Firebase to login
function googleSignIn() {
  signInWithPopup(auth, googleAuthProvider)
    .then((result) => {
      // If success, then just redirect to the home page
      navigateTo(route.query && route.query.redirect ? route.query.redirect : "/dashboard");
    })
    .catch((reason) => {
      console.error("Failed signInRedirect", reason);
      error.value = reason;
    });
}

useHead({
  title: "Bienvenido a Pet Universe",
  meta: [
    {
      name: "description",
      content: "Sistema de gestión para tiendas de mascotas"
    }
  ]
});
</script>