import { atom } from 'compostate';

const arr = [];

for (let i = 0; i < 1000; i += 1) {
  arr[i] = atom(0);
}

setInterval(() => {
  console.log(arr.length);
}, 1000);
