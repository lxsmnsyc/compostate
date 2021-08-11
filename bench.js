const { destructure, reactive, effect, template } = require('./packages/compostate');

const state = reactive({
  name: 'Alexis',
  greeting: 'Hello',
});

const { greeting, name } = destructure(state);

const message = template`${greeting}, ${name}!`;

effect(() => {
  console.log(message.value);
});

state.name = 'Rizal';
state.greeting = 'Kamusta';