import {
  atom,
  batch,
  computed,
  syncEffect,
} from "./dist/esm/development/index.mjs";

const greeting = atom("Hello");
const receiver = atom("Alexis");
const result = computed(() => `${greeting()}, ${receiver()}!`);

syncEffect(() => {
  console.log(result()); // 'Hello, Alexis!'
});

batch(() => {
  greeting("Bonjour"); // 'Bonjour, Alexis!'
  receiver("Compostate"); // 'Bonjour, Compostate!'
}); // 'Bonjour, Compostate!'
