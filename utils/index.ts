export const formatPrice = (price: number, minimumFractionDigits = 2) => {
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

export const validateSell = (sell: any) => {
  const { $dayjs } = useNuxtApp();

  if (!sell) return false;

  // Validate it has quantity
  if (!sell.quantity) return false;

  // Validate quality
  if (!sell.quality) return false;

  // Validate if has buyingPrice and it's a float number
  if (!sell.buyingPrice || isNaN(sell.buyingPrice)) return false;

  // Validate if has sellingPrice and it's a float number
  if (!sell.sellingPrice || isNaN(sell.sellingPrice)) return false;

  // Validate if has date and validate date format using dayjs
  if (!sell.date || !$dayjs(sell.date, { format: "YYYY-MM-DD" }).isValid()) return false;

  return true;
};

export const validateProduct = (product: any) => {
  if (!product) return false;

  // Validate it has product name
  if (!product.productName) {
    return false;
  }

  // Validate is has unit and it's a float number
  if (
    !product.unit ||
    !["Kg", "Unitario", "Bolsa", "Cajon", "Jaula", "Bandeja", "Gramo", "Litro", "Docena"].includes(product.unit)
  ) {
    return false;
  }

  // Validate is has step and it's a float number
  if (!product.step || isNaN(product.step) || ![0.25, 0.5, 1].includes(product.step)) {
    return false;
  }

  // Validate is has price and it's a float number
  if (!product.price || isNaN(product.price)) {
    return false;
  }

  // Validate if has category
  if (!product.category) return false;

  // Validate if has "isAvailable" and it's a boolean
  if (typeof product.isAvailable !== "boolean") return false;

  // Validate if has "highlightProduct" and it's a boolean
  if (product.highlightProduct && typeof product.highlightProduct !== "boolean") {
    return false;
  }

  return true;
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

export const createMessage = (products: any, client: any, shippingPrice: any, totalWithShipping: any) => {
  // Verify if the address is empty
  const deliveryAddress = client.address ? client.address : "N/A";

  // Add the introduction name
  let message = `Detalles de tu pedido:\n\n`;

  products.forEach((product: any) => {
    const productPrice = formatPrice(product.total);

    // Verify if it's a fraction and add 1/4, 1/2 or 3/4 accordingly
    const quantityText = formatQuantity(product.quantity);

    message += `- ${quantityText} ${product.productName} ${productPrice}\n`;
  });

  // Añade el costo de envío
  message += `\n🚚 Costo de Envío: ${formatPrice(shippingPrice)}\n`;

  // Añade el total
  message += `💵 Total a Pagar: ${formatPrice(totalWithShipping)}\n`;

  // Añade la dirección de envío
  message += `\n📍 Dirección de Envío: ${deliveryAddress}\n`;

  // Cierra con un mensaje amigable
  message += `\n¡Gracias por tu compra! Si necesitas algo más, no dudes en avisarnos. 😊`;

  return message;
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
      .trim()
      // Remove diacritical marks
      .replace(/[\u0300-\u036f]/g, "")
      // Remove non alphanumeric characters except spaces
      .replace(/[^a-z0-9 \-]/g, "")
      // Replace spaces with dashes
      .replace(/\s+/g, "-")
  );
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
