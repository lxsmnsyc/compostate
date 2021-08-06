function createIndexContext() {
  let index = 0;
  let stack = [];

  return {
    push(item) {
      stack[index++] = item;
    },
    pop() {
      stack[--index] = null;
    },
    current() {
      return stack[index - 1];
    }
  }
}

function createClosureContext() {
  let current;
  return {
    push(item) {
      const parent = current;
      current = item;
      return () => {
        current = parent;
      };
    },
    current() {
      return current;
    }
  }
}

class Context {
  push(value) {
    const parent = this.current;
    this.current = value;
    return () => {
      this.current = parent;
      return value;
    };
  }

  getContext() {
    return this.current;
  }
}

class IndexContext {
  constructor() {
    this.index = 0;
    this.stack = [];
  }
  push(item) {
    this.stack[this.index++] = item;
  }
  pop() {
    this.stack[--this.index] = null;
  }
  current() {
    return this.stack[this.index - 1];
  }
}

var A = createIndexContext();
var B = createClosureContext();
var C = new Context();

function multiplyA() {
  return A.current() * A.current();
}

function multiplyB() {
  return B.current() * B.current();
}

function multiplyC() {
  return C.getContext() * C.getContext();
}

console.time('A');
for (let i = 0; i < 100000; i += 1) {
  A.push(i);
  multiplyA();
  A.pop();
}
console.timeEnd('A');
console.time('B');
for (let i = 0; i < 100000; i += 1) {
  const pop = B.push(i);
  multiplyB();
  pop();
}
console.timeEnd('B');
console.time('C');
for (let i = 0; i < 100000; i += 1) {
  const pop = C.push(i);
  multiplyC();
  pop();
}
console.timeEnd('C');