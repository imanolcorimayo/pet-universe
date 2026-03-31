import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  devtools: { enabled: true },
  ssr: false,
  css: ["~/assets/css/main.css", "vue3-toastify/dist/index.css"],
  modules: [
    "@pinia/nuxt",
    "nuxt-vuefire",
    "unplugin-icons/nuxt",
    '@vueuse/nuxt',
    "dayjs-nuxt",
    "@sentry/nuxt/module",
  ],

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },

  plugins: [],
  runtimeConfig: {
    public: {
      env: process.env.ENVIRONMENT || "dev",
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      firebaseMeasurementId: process.env.FIREBASE_MEASUREMENT_ID,
      sentryDsn: process.env.SENTRY_DSN,
      imageApiUrl: process.env.IMAGE_API_URL || 'http://petapi.local',
      imageApiKey: process.env.IMAGE_API_KEY || '',
      imageCdnBase: process.env.IMAGE_CDN_BASE || 'https://wiseutils-cdn.nyc3.cdn.digitaloceanspaces.com/pet-universe/products',
    }
  },

  sentry: {
    sourceMapsUploadOptions: {
      org: "pet-universe",
      project: "javascript-nuxt",
    },
  },

  sourcemap: {
    client: "hidden",
  },

  vuefire: {
    // ensures the auth module is enabled
    auth: {
      enabled: true
    },
    config: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: `${process.env.FIREBASE_PROJECT_ID}.firebaseapp.com`,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.FIREBASE_PROJECT_ID}.appspot.com`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID
    }
  },

  app: {
    head: {
      charset: "utf-8",
      viewport: "width=device-width, initial-scale=1",
      title: "Pet Universe - Sistema de Gestión para Tiendas de Mascotas",
      meta: [
        { name: "description", content: "Sistema de gestión para tiendas de mascotas" }
      ]
    }
  }
})