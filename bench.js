const { ref, template, effect } = require('./packages/compostate');

const person = ref('Alexis');
const greeting = ref('Hello');
const message = template`${greeting}, ${person}!`;

effect(() => {
  console.log(message.value);
});

person.value = 'John Doe';
greeting.value = 'Bonjour';