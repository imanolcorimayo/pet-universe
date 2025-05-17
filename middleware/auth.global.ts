export default defineNuxtRouteMiddleware(async (to, from) => {
  // If going to /welcome or blocked just continue
  // process.server should never be activated since ssr was set to false
  if (to.path.includes("/welcome") || to.path.includes("/blocked") || process.server) return;

  // If going to the home page, always redirect to /dashboard
  if (to.path === "/") return navigateTo("/dashboard");

  const user = await getCurrentUser();
  const indexStore = useIndexStore();

  // Redirect to sign-in
  if (!user) {
    return navigateTo({
      path: "/welcome",
      query: {
        redirect: to.fullPath
      }
    });
  }

  // Business id, if not found redirect to /negocios
  const businessId = useLocalStorage("cBId", null);
  if (to.path !== "/negocios" && !businessId.value) {
    return navigateTo("/negocios");
  }

  try {
    // Update in store to manage roles globally
    const userRole = await indexStore.updateUserRole();

    if (!userRole && to.path !== "/negocios") {
      useToast("error", "No tienes permisos para acceder a esta sección. Elegí una tienda para continuar.");
      return navigateTo("/negocios");
    }

    // Allowed routes to navigate for non admin users
    const allowedRoutes = ["/dashboard", "/caja", "/ventas", "/blocked", "/404", "/negocios", "/"];

    if (userRole === "propietario" || allowedRoutes.includes(to.path)) {
      return;
    }

    useToast("error", "No tienes permisos para acceder a esta sección. Contactate con soporte si tenés problemas.");
    return navigateTo("/dashboard");
  } catch (error) {
    console.error("ERROR ", error);
  }
});