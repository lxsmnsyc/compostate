const { signal, computation } = require('./packages/compostate');

const [seconds, setSeconds] = signal(0);
setInterval(() => {
  setSeconds(seconds() + 1)
}, 1000);

const [t, setT] = signal(1);
computation(() => setT(seconds() + 1))

const [g, setG] = signal(true);
computation(() => setG(t() > seconds()))

computation(() => console.log(seconds(), g(), t()))