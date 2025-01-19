import { atom, computed, syncEffect } from "./dist/esm/development/index.mjs";

function log(result) {
  console.log("logged", result);
  return result;
}

const a = atom(0);
const b = computed(() => log(`even: ${a() % 2 === 0}`));
const c = computed(() => log(`odd: ${a() % 2 === 1}`));
const d = computed(() => log(b() + ", " + c()));

syncEffect(() => {
  console.log("result", d());
});

console.log("Update");
a(101);
