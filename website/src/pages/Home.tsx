import type { JSX } from '@solidjs/web';
import { createSignal, For } from 'solid-js';
import { Tab, TabGroup, TabList, TabPanel } from 'terracotta/tabs';
import resourceSource from 'virtual:demo-source/resource';
import showcase from 'virtual:showcase';
import Demo from '../components/Demo';
import {
  ArrowRightIcon,
  AtomIcon,
  BroomIcon,
  ClockIcon,
  LayersIcon,
  PlugIcon,
  ShieldIcon,
} from '../components/Icons';
import PageMeta from '../components/PageMeta';
import { mount as mountResource } from '../demos/resource';
import { FIRST_PAGE } from '../lib/docs';

const PACKAGE_MANAGERS = [
  { id: 'npm', command: 'npm install compostate' },
  { id: 'pnpm', command: 'pnpm add compostate' },
  { id: 'yarn', command: 'yarn add compostate' },
  { id: 'bun', command: 'bun add compostate' },
];

const FEATURES = [
  {
    icon: AtomIcon,
    title: 'Fine-grained',
    body: 'Effects track exactly what they read, and rerun only when one of those values changes.',
    href: '/docs/concepts#effects',
  },
  {
    icon: LayersIcon,
    title: 'Lazy computeds',
    body: 'A computed runs on its first read, and stops an update when it returns an equal value.',
    href: '/docs/concepts#deriving-signals',
  },
  {
    icon: BroomIcon,
    title: 'Cleanups that nest',
    body: 'Every effect is a cleanup boundary. Stop a parent and everything created inside it stops too.',
    href: '/docs/concepts#cleanups',
  },
  {
    icon: ClockIcon,
    title: 'Async built in',
    body: 'Resources, suspense boundaries and the waitFor helpers handle promises without another library.',
    href: '/docs/concurrency',
  },
  {
    icon: ShieldIcon,
    title: 'Error boundaries',
    body: 'Catch errors from effects that rerun long after the code that created them returned.',
    href: '/docs/concepts#error-boundaries',
  },
  {
    icon: PlugIcon,
    title: 'One package',
    body: 'React, Preact and custom element bindings ship as subpath exports and share one reactive graph.',
    href: '/docs/react',
  },
];

const ENTRY_POINTS = [
  {
    name: 'compostate',
    body: 'The reactive core and the concurrency helpers.',
    href: '/docs/api',
  },
  {
    name: 'compostate/react',
    body: 'defineComponent and useCompostateSetup for React.',
    href: '/docs/react',
  },
  {
    name: 'compostate/preact',
    body: 'The same bindings for Preact.',
    href: '/docs/react',
  },
  {
    name: 'compostate/element',
    body: 'define and setRenderer for custom elements.',
    href: '/docs/custom-elements',
  },
];

function InstallCommand(): JSX.Element {
  const [copied, setCopied] = createSignal<string>();

  function copy(id: string, command: string): void {
    void navigator.clipboard.writeText(command).then(() => {
      setCopied(id);
      setTimeout(() => {
        setCopied(undefined);
      }, 1500);
    });
  }

  return (
    <TabGroup<string> class="install" horizontal={true} defaultValue="npm">
      <TabList class="install-tabs" aria-label="Package manager">
        <For each={PACKAGE_MANAGERS}>
          {manager => (
            <Tab class="install-tab" value={manager.id}>
              {manager.id}
            </Tab>
          )}
        </For>
      </TabList>
      <For each={PACKAGE_MANAGERS}>
        {manager => (
          <TabPanel class="install-panel" value={manager.id}>
            <code>
              <span class="prompt">$</span> {manager.command}
            </code>
            <button
              type="button"
              class="copy-button"
              onClick={() => {
                copy(manager.id, manager.command);
              }}
            >
              {copied() === manager.id ? 'Copied' : 'Copy'}
            </button>
          </TabPanel>
        )}
      </For>
    </TabGroup>
  );
}

function Showcase(): JSX.Element {
  return (
    <TabGroup<string>
      class="showcase"
      horizontal={true}
      defaultValue={showcase[0].id}
    >
      <TabList class="showcase-tabs" aria-label="Example">
        <For each={showcase}>
          {example => (
            <Tab class="showcase-tab" value={example.id}>
              {example.label}
            </Tab>
          )}
        </For>
      </TabList>
      <For each={showcase}>
        {example => (
          <TabPanel class="showcase-panel" value={example.id}>
            <p class="showcase-description">{example.description}</p>
            <div class="showcase-grid">
              <div innerHTML={example.input} />
              <div class="showcase-output" innerHTML={example.output} />
            </div>
          </TabPanel>
        )}
      </For>
    </TabGroup>
  );
}

export default function Home(): JSX.Element {
  return (
    <div class="home">
      <PageMeta description="A small fine-grained reactivity library. Atoms, computed values and effects, with bindings for React, Preact and custom elements." />

      <section class="hero">
        <div class="hero-glow" aria-hidden="true" />
        <p class="hero-badge">
          Bindings for <strong>React</strong>, <strong>Preact</strong> and{' '}
          <strong>custom elements</strong>
        </p>
        <h1 class="hero-title">
          Fine-grained <span class="gradient-text">reactive state.</span>
        </h1>
        <p class="hero-lead">
          compostate is a small reactive core built on atoms, computed values
          and effects. Write a value, and only the code that read it runs again.
        </p>
        <div class="hero-actions">
          <a class="button button-primary" href={FIRST_PAGE.href}>
            Get started <ArrowRightIcon />
          </a>
          <a class="button button-secondary" href="/docs/api">
            API reference
          </a>
        </div>
        <InstallCommand />
      </section>

      <section class="section">
        <div class="section-heading">
          <h2>What each write reruns</h2>
          <p>
            Each example shows its code and what it logs. Pick a tab to see how
            computed values, batching and cleanups change what runs.
          </p>
        </div>
        <Showcase />
      </section>

      <section class="section">
        <div class="section-heading">
          <h2>Async values, no extra library</h2>
          <p>
            A resource is a computed backed by a promise. Change the user and it
            fetches again, and the effect reading it sees each state.
          </p>
        </div>
        <Demo title="Resource" code={resourceSource} mount={mountResource} />
      </section>

      <section class="section">
        <div class="feature-grid">
          <For each={FEATURES}>
            {feature => (
              <a class="feature-card" href={feature.href}>
                <span class="feature-icon">
                  <feature.icon />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </a>
            )}
          </For>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <h2>One install, every binding</h2>
          <p>
            React and Preact are optional peer dependencies. Install only the
            one you use.
          </p>
        </div>
        <div class="entry-grid">
          <For each={ENTRY_POINTS}>
            {entry => (
              <a class="entry-card" href={entry.href}>
                <code>{entry.name}</code>
                <p>{entry.body}</p>
              </a>
            )}
          </For>
        </div>
      </section>

      <section class="section cta">
        <h2>Write a value. Watch only what read it run.</h2>
        <p>Start with the quick start, or read how the pieces fit together.</p>
        <div class="hero-actions">
          <a class="button button-primary" href="/docs/quick-start">
            Quick start <ArrowRightIcon />
          </a>
          <a class="button button-secondary" href="/docs/concepts">
            Concepts
          </a>
        </div>
      </section>
    </div>
  );
}
