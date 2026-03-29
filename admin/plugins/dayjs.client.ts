import customParseFormat from 'dayjs/plugin/customParseFormat';

export default defineNuxtPlugin(() => {
  const { $dayjs } = useNuxtApp();
  
  // Extend dayjs with customParseFormat plugin globally
  $dayjs.extend(customParseFormat);
});