import type { JSX } from '@solidjs/web';

interface IconProps {
  class?: string;
}

function Icon(props: IconProps & { children: JSX.Element }): JSX.Element {
  return (
    <svg
      class={props.class ? `icon ${props.class}` : 'icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

/** A sprout: one stem, two leaves. */
export function LogoMark(props: IconProps): JSX.Element {
  return (
    <svg
      class={props.class ? `logo-mark ${props.class}` : 'logo-mark'}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#84cc16" />
          <stop offset="1" stop-color="#16a34a" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
      <path
        d="M16 25v-9"
        stroke="#fff"
        stroke-width="2.4"
        stroke-linecap="round"
      />
      <path
        d="M16 16c0-4.4-3-7-7.5-7 0 4.4 3 7 7.5 7zM16 18.5c0-3.6 2.5-6 6.5-6 0 3.6-2.5 6-6.5 6z"
        fill="#fff"
      />
    </svg>
  );
}

export function ArrowRightIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M6 6l12 12M18 6 6 18" />
    </Icon>
  );
}

export function SunIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </Icon>
  );
}

export function MoonIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
    </Icon>
  );
}

export function GitHubIcon(props: IconProps): JSX.Element {
  return (
    <svg
      class={props.class ? `icon ${props.class}` : 'icon'}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.4-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9V21c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
    </svg>
  );
}

export function EditIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </Icon>
  );
}

export function FileIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M14 3H6v18h12V7z" />
      <path d="M14 3v4h4" />
    </Icon>
  );
}

export function HashIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M5 9h14M5 15h14M10 4 8 20M16 4l-2 16" />
    </Icon>
  );
}

export function ReturnIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M20 5v7H5M9 8l-4 4 4 4" />
    </Icon>
  );
}

export function ResetIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M4 12a8 8 0 1 0 2.3-5.7" />
      <path d="M4 4v4h4" />
    </Icon>
  );
}

export function AtomIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <circle cx="12" cy="12" r="2" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)" />
    </Icon>
  );
}

export function LayersIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </Icon>
  );
}

export function ClockIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Icon>
  );
}

export function ShieldIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M12 3 4 6v6c0 4.5 3.4 8.2 8 9 4.6-.8 8-4.5 8-9V6z" />
    </Icon>
  );
}

export function BroomIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M14 4 9.5 12.5" />
      <path d="M6 13h7l2 7H4z" />
      <path d="M8 16v4M11 16v4" />
    </Icon>
  );
}

export function PlugIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M9 3v5M15 3v5" />
      <path d="M6 8h12v3a6 6 0 0 1-12 0z" />
      <path d="M12 17v4" />
    </Icon>
  );
}

export function PlayIcon(props: IconProps): JSX.Element {
  return (
    <Icon class={props.class}>
      <path d="M7 5v14l12-7z" />
    </Icon>
  );
}
