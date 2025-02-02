import {
  atom,
  batch,
  computed,
  resource,
  syncEffect,
  waitForAll,
} from "./dist/esm/development/index.mjs";

// const greeting = atom("Hello");
// const receiver = atom("Alexis");
// const result = computed(() => `${greeting()}, ${receiver()}!`);


// syncEffect(() => {
//   console.log(result()); // 'Hello, Alexis!'
// });

// batch(() => {
//   greeting("Bonjour"); // 'Bonjour, Alexis!'
//   receiver("Compostate"); // 'Bonjour, Compostate!'
// }); // 'Bonjour, Compostate!'

function sleep(value, ms) {
  return new Promise((res) => {
    setTimeout(res, ms, value);
  })
}

const foo = resource(() => sleep('foo', 1000));
const bar = resource(() => sleep('bar', 1000));

syncEffect(() => {
  const values = waitForAll([foo, bar]);

  console.log('Received', values);
});