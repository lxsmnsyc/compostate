const { ref, effect, batch, computed, watch } = require('./packages/compostate');

const a = ref('A');
const b = ref('B');

const c = computed(() => a.value + b.value);
const d = computed(() => b.value + a.value);

const e = computed(() => `${c.value} ${d.value}`);

watch(() => e.value, console.log);

batch(() => {
  a.value = 'C';
  b.value = 'D';
})
