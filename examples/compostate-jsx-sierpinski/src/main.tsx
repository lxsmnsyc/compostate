/** @jsx c */
/** @jsxFrag Fragment */
import {
  c,
  Fragment,
  render,
} from 'compostate-jsx';
import {
  onCleanup,
  createTransition,
  computedAtom,
  atom,
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
  const hover = atom(false);
  const onEnter = () => {
    hover(true);
  };
  const onExit = () => {
    hover(false);
  };

  return (
    <div
      className="dot"
      style={() => ({
        width: `${props.s}px`,
        height: `${props.s}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        borderRadius: `${props.s / 2}px`,
        lineHeight: `${props.s}px`,
        background: hover() ? '#ff0' : '#61dafb',
      })}
      onMouseEnter={() => onEnter}
      onMouseLeave={() => onExit}
      textContent={() => (hover() ? `**${props.text}**` : props.text)}
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
        x={() => props.x - TARGET / 2}
        y={() => props.y - TARGET / 2}
        s={TARGET}
        text={() => props.seconds}
      />
    );
  }

  const newS = computedAtom(() => props.s / 2);

  const slow = computedAtom(() => {
    // compostate-jsx doesn't have interuptions :/
    const e = performance.now() + 0.8;
    // Artificially long execution time.
    while (performance.now() < e) {}
    return props.seconds;
  });

  return (
    <>
      <Triangle
        x={() => props.x}
        y={() => props.y - newS.value / 2}
        s={newS}
        seconds={slow}
      />
      <Triangle
        x={() => props.x - newS.value}
        y={() => props.y + newS.value / 2}
        s={newS}
        seconds={slow}
      />
      <Triangle
        x={() => props.x + newS.value}
        y={() => props.y + newS.value / 2}
        s={newS}
        seconds={slow}
      />
    </>
  );
};

const baseTransition = createTransition();

const TriangleDemo = () => {
  const elapsed = atom(0);
  const seconds = atom(0);
  const scale = computedAtom(() => {
    const e = (elapsed() / 1000) % 10;
    return 1 + (e > 5 ? 10 - e : e) / 10;
  });
  const start = Date.now();
  const t = setInterval(() => {
    baseTransition.start(() => {
      seconds((seconds() % 10) + 1);
    });
  }, 1000);

  let f: number;
  const update = () => {
    elapsed(Date.now() - start);
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
      style={() => ({
        transform: `scaleX(${scale() / 2.1}) scaleY(0.7) translateZ(0.1px)`,
      })}
    >
      <Triangle x={0} y={0} s={1000} seconds={seconds} />
    </div>
  );
};

const root = document.getElementById('root');

if (root) {
  render(root, () => <TriangleDemo />);
}
