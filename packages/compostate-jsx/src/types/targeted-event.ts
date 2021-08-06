export type TargetedEvent<
    Target extends EventTarget = EventTarget,
    TypedEvent extends Event = Event
  > = Omit<TypedEvent, 'currentTarget'> & {
    readonly currentTarget: Target;
  };

export type TargetedAnimationEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  AnimationEvent
>;

export type TargetedClipboardEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  ClipboardEvent
>;

export type TargetedCompositionEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  CompositionEvent
>;

export type TargetedDragEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  DragEvent
>;

export type TargetedFocusEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  FocusEvent
>;

export type TargetedKeyboardEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  KeyboardEvent
>;

export type TargetedMouseEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  MouseEvent
>;

export type TargetedPointerEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  PointerEvent
>;

export type TargetedTouchEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  TouchEvent
>;

export type TargetedTransitionEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  TransitionEvent
>;

export type TargetedUIEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  UIEvent
>;

export type TargetedWheelEvent<Target extends EventTarget> = TargetedEvent<
  Target,
  WheelEvent
>;
