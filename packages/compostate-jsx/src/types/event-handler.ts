import {
  TargetedAnimationEvent,
  TargetedClipboardEvent,
  TargetedCompositionEvent,
  TargetedDragEvent,
  TargetedEvent,
  TargetedFocusEvent,
  TargetedKeyboardEvent,
  TargetedMouseEvent,
  TargetedPointerEvent,
  TargetedTouchEvent,
  TargetedTransitionEvent,
  TargetedUIEvent,
  TargetedWheelEvent,
} from './targeted-event';

export interface EventHandler<E extends TargetedEvent> {
  /**
   * The `this` keyword always points to the DOM element the event handler
   * was invoked on. See: https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Event_handlers#Event_handlers_parameters_this_binding_and_the_return_value
   */
  (this: E['currentTarget'], event: E): void;
}

export type AnimationEventHandler<Target extends EventTarget> = EventHandler<
  TargetedAnimationEvent<Target>
>;
export type ClipboardEventHandler<Target extends EventTarget> = EventHandler<
  TargetedClipboardEvent<Target>
>;
export type CompositionEventHandler<Target extends EventTarget> = EventHandler<
  TargetedCompositionEvent<Target>
>;
export type DragEventHandler<Target extends EventTarget> = EventHandler<
  TargetedDragEvent<Target>
>;
export type FocusEventHandler<Target extends EventTarget> = EventHandler<
  TargetedFocusEvent<Target>
>;
export type GenericEventHandler<Target extends EventTarget> = EventHandler<
  TargetedEvent<Target>
>;
export type KeyboardEventHandler<Target extends EventTarget> = EventHandler<
  TargetedKeyboardEvent<Target>
>;
export type MouseEventHandler<Target extends EventTarget> = EventHandler<
  TargetedMouseEvent<Target>
>;
export type PointerEventHandler<Target extends EventTarget> = EventHandler<
  TargetedPointerEvent<Target>
>;
export type TouchEventHandler<Target extends EventTarget> = EventHandler<
  TargetedTouchEvent<Target>
>;
export type TransitionEventHandler<Target extends EventTarget> = EventHandler<
  TargetedTransitionEvent<Target>
>;
export type UIEventHandler<Target extends EventTarget> = EventHandler<
  TargetedUIEvent<Target>
>;
export type WheelEventHandler<Target extends EventTarget> = EventHandler<
  TargetedWheelEvent<Target>
>;
