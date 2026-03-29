<template>
  <div class="flex flex-wrap items-center gap-3">
    <!-- Preset buttons -->
    <div class="flex space-x-1 bg-gray-100 p-1 rounded-lg">
      <button
        v-for="preset in presets"
        :key="preset.id"
        @click="applyPreset(preset.id)"
        :class="[
          'px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
          activePreset === preset.id
            ? 'bg-white text-primary shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        ]"
      >
        {{ preset.label }}
      </button>
    </div>

    <!-- Date inputs -->
    <div class="flex items-center gap-2">
      <input
        v-model="localFrom"
        type="date"
        class="py-1.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        @change="onManualChange"
      />
      <span class="text-gray-400 text-sm">—</span>
      <input
        v-model="localTo"
        type="date"
        class="py-1.5 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
        @change="onManualChange"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
const { $dayjs } = useNuxtApp();

const props = defineProps<{
  from: string;
  to: string;
}>();

const emit = defineEmits<{
  change: [range: { from: string; to: string }];
}>();

const localFrom = ref(props.from);
const localTo = ref(props.to);
const activePreset = ref<string>('month');

const presets = [
  { id: 'today', label: 'Hoy' },
  { id: 'week', label: 'Esta Semana' },
  { id: 'month', label: 'Este Mes' },
  { id: 'year', label: 'Este Año' },
];

watch(() => props.from, (val) => { localFrom.value = val; });
watch(() => props.to, (val) => { localTo.value = val; });

function applyPreset(id: string) {
  activePreset.value = id;
  const today = $dayjs();
  let from: string;
  let to = today.format('YYYY-MM-DD');

  switch (id) {
    case 'today':
      from = to;
      break;
    case 'week':
      from = today.startOf('week').format('YYYY-MM-DD');
      break;
    case 'month':
      from = today.startOf('month').format('YYYY-MM-DD');
      break;
    case 'year':
      from = today.startOf('year').format('YYYY-MM-DD');
      break;
    default:
      from = today.startOf('month').format('YYYY-MM-DD');
  }

  localFrom.value = from;
  localTo.value = to;
  emit('change', { from, to });
}

function onManualChange() {
  activePreset.value = '';
  if (localFrom.value && localTo.value) {
    emit('change', { from: localFrom.value, to: localTo.value });
  }
}
</script>
