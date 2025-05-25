export const formatCurrency = (price: number, minimumFractionDigits = 2) => {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits
  }).format(price);
};

export const formatToMillion = (price: number) => {
  // Transfor to million and round to 2 decimals
  const million = price / 1000000;

  return (
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2
    }).format(million) + "M"
  );
};

export const formatQuantity = (quantity: number) => {
  const wholePart = Math.trunc(quantity); // Get the whole number part (handles negatives correctly)
  const decimalPart = Math.abs(quantity - wholePart); // Get the absolute decimal/fractional part

  // Handle different fractional parts
  let fractionText = "";
  if (decimalPart === 0.25) {
    fractionText = "1/4";
  } else if (decimalPart === 0.5) {
    fractionText = "1/2";
  } else if (decimalPart === 0.75) {
    fractionText = "3/4";
  }

  // Construct the formatted string
  if (fractionText) {
    return wholePart !== 0
      ? `${wholePart} ${wholePart < 0 ? "-" : "+"} ${fractionText}`
      : `${quantity < 0 ? "-" : ""}${fractionText}`;
  } else {
    return `${wholePart}`;
  }
};

export const validateClient = (client: any) => {
  if (!client) return false;

  // Validate it has client name
  if (!client.clientName) {
    return false;
  }

  // Validate is has phone number
  if (!client.phone) {
    return false;
  }

  // Validate is has email
  if (!client.address) {
    return false;
  }

  return true;
};

export const formattedDate = (date: string) => {
  const { $dayjs } = useNuxtApp();
  // List of months in Spanish to use in the date format
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // Get the spanish month
  const month = months[$dayjs(date).month()];

  // Return the formatted date
  return `${month} ${$dayjs(date).format("D, YYYY")}`;
};

export const formatStatus = (status: string) => {
  // Replace "-" with " " and capitalize the all first letters
  return status.replaceAll("-", " ").replaceAll(/\b\w/g, (l) => l.toUpperCase());
};

export const calculateRatio = (total: number, part: number) => {
  if (total === 0) return 0;

  return (part * 100) / total;
};

export const formatPhoneNumber = function (phone = "") {
  // Check if the client has " 9" in the phone number
  if (phone === "+54 9") {
    phone = "";
    return;
  }

  // Check if the client has " 9 " in the phone number
  const has9InPhone = phone.includes(" 9 ");

  // Remove all non-numeric characters except "+"
  let cleanNumber = phone.replace(/[^\d+]/g, "");

  let mobPhoneAux = "";
  if (cleanNumber.startsWith("+54") && !has9InPhone) {
    mobPhoneAux = "+54 9 ";
    cleanNumber = cleanNumber.substring(3);
  } else if (cleanNumber.startsWith("+549") && has9InPhone) {
    mobPhoneAux = "+54 9 ";
    cleanNumber = cleanNumber.substring(4);
  }

  // Format as (111) 111-1111
  if (cleanNumber.length >= 3 && !cleanNumber.startsWith("+54")) {
    cleanNumber = cleanNumber.replace(/^(\d{3})(\d)/, "($1) $2");
  }
  if (cleanNumber.length >= 9) {
    cleanNumber = cleanNumber.replace(/^(\(\d{3}\) \d{3})(\d{1,4})/, "$1-$2");
  }

  // Limit the length to 15 characters (Argentina format)
  return mobPhoneAux + cleanNumber.substring(0, 14);
};

export const slugify = (text: string) => {
  return (
    text
      .toString()
      .toLowerCase()
      // Normalize Unicode characters
      // Breaks down accented characters into their base letter and separate diacritical marks (e.g., é becomes e + ´).
      .normalize("NFD")
      // Remove diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
      // Remove non alphanumeric characters except spaces
      .replace(/[^a-z0-9 \-]/g, "")
      // Replace spaces with dashes
      .replace(/\s+/g, "-")
  );
};

// codifyCode for payment methods - converts input to uppercase and replaces spaces with underscores
export const codifyCode = (code: string) => {
  return code
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
};

// For business configuration
export const BUSINESS_SHIPPING_TYPES = ["Solo Envío", "Envío y Retiro en Local", "Solo Retiro en Local"];
export const BUSINESS_SHIPPING_TYPES_UTILS = {
  delivery: "Solo Envío",
  both: "Envío y Retiro en Local",
  pickup: "Solo Retiro en Local"
};

// For orders
export const ORDER_SHIPPING_TYPES = ["Envío", "Retiro en Local"];
export const ORDER_SHIPPING_TYPES_UTILS = { delivery: "Envío", pickup: "Retiro en Local" };
export const ORDER_STATUS_OPTIONS = [
  "requiere-actualizacion-inventario",
  "pendiente",
  "pendiente-modificado",
  "entregado",
  "cancelado",
  "rechazado"
];
export const ORDER_STATUS_VALUES = {
  requiereActualizacionInventario: "requiere-actualizacion-inventario",
  pendiente: "pendiente",
  pendienteModificado: "pendiente-modificado",
  entregado: "entregado",
  cancelado: "cancelado",
  rechazado: "rechazado"
};
