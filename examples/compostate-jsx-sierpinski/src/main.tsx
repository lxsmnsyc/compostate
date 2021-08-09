/** @jsx c */
/** @jsxFrag Fragment */
import {
  c,
  For,
  Fragment,
  render,
  derived,
} from 'compostate-jsx';
import {
  ref,
  computed,
  onCleanup,
  createTransition,
} from 'compostate';
import './main.css';

const TARGET = 25;

interface DotProps {
  x: number;
  y: number;
  s: number;
  text: string;
}

const Dot = (props: DotProps) => {
  const hover = ref(false);
  const onEnter = () => {
    hover.value = true;
  };
  const onExit = () => {
    hover.value = false;
  };

  return (
    <div
      className="dot"
      style={derived(() => ({
        width: `${props.s}px`,
        height: `${props.s}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        borderRadius: `${props.s / 2}px`,
        lineHeight: `${props.s}px`,
        background: hover.value ? '#ff0' : '#61dafb',
      }))}
      onMouseEnter={onEnter}
      onMouseLeave={onExit}
      textContent={derived(() => (hover.value ? `**${props.text}**` : props.text))}
    />
  );
};

interface TriangleProps {
  x: number;
  y: number;
  s: number;
  seconds: number;
}

const Triangle = (props: TriangleProps) => {
  if (props.s <= TARGET) {
    return (
      <Dot
        x={derived(() => props.x - TARGET / 2)}
        y={derived(() => props.y - TARGET / 2)}
        s={TARGET}
        text={derived(() => props.seconds)}
      />
    );
  }

  const newS = computed(() => props.s / 2);

  const slow = computed(() => {
    // compostate-jsx doesn't have interuptions :/
    const e = performance.now() + 0.8;
    // Artificially long execution time.
    while (performance.now() < e) {}
    return props.seconds;
  });

  return (
    <>
      <Triangle
        x={derived(() => props.x)}
        y={derived(() => props.y - newS.value / 2)}
        s={newS}
        seconds={slow}
      />
      <Triangle
        x={derived(() => props.x - newS.value)}
        y={derived(() => props.y + newS.value / 2)}
        s={newS}
        seconds={slow}
      />
      <Triangle
        x={derived(() => props.x + newS.value)}
        y={derived(() => props.y + newS.value / 2)}
        s={newS}
        seconds={slow}
      />
    </>
  );
};

const baseTransition = createTransition();

const TriangleDemo = () => {
  const elapsed = ref(0);
  const seconds = ref(0);
  const scale = computed(() => {
    const e = (elapsed.value / 1000) % 10;
    return 1 + (e > 5 ? 10 - e : e) / 10;
  });
  const start = Date.now();
  const t = setInterval(() => {
    baseTransition.start(() => {
      seconds.value = (seconds.value % 10) + 1;
    });
  }, 1000);

  let f: number;
  const update = () => {
    elapsed.value = Date.now() - start;
    f = requestAnimationFrame(update);
  };
  f = requestAnimationFrame(update);

  onCleanup(() => {
    clearInterval(t);
    cancelAnimationFrame(f);
  });

  return (
    <div
      className="container"
      style={derived(() => ({
        transform: `scaleX(${scale.value / 2.1}) scaleY(0.7) translateZ(0.1px)`,
      }))}
    >
      <Triangle x={0} y={0} s={1000} seconds={seconds} />
    </div>
  );
};

const root = document.getElementById('root');

if (root) {
  render(root, () => <TriangleDemo />);
}
