import { toast } from "vue3-toastify";
import type { ToastEvents } from "~/interfaces";

enum Methods {
  "sendMail",
  "goSignUp",
  "goHome"
}

interface Method {
  position?: String;
  autoClose?: Number;
  onClick?: Function | Methods;
}

/**
 *
 * @param {ToastEvents} type
 * @param {string} message
 * @param {Methods | Object | null} method
 * @returns
 */
export const useToast = async (type: ToastEvents, message: string, method: Method | null = null) => {
  // Don't show toast in server side
  if (process.server) return;

  // To avoid specific and empty errors
  if (!message) return;

  //@ts-ignore
  if (method && typeof method === "object") {
    method.onClick =
      Object.hasOwn(method, "onClick") && typeof method.onClick == "string" ? methods[method.onClick] : method.onClick;

    toast[type](message, {
      //@ts-ignore
      position: "top-center",
      //@ts-ignore
      autoClose: 2000,
      ...method
    });

    return;
  }

  toast[type](message, {
    //@ts-ignore
    position: "top-center",
    //@ts-ignore
    autoClose: 2000
  });
};

const methods = {
  sendMail: () => {
    //@ts-ignore
    window.open("mailto:imanolcorimayotest@gmail.com", "_blank").focus();
  },
  goSignUp: async () => {
    return await navigateTo("/sign-up");
  },
  goHome: async () => {
    return await navigateTo("/");
  }
};
