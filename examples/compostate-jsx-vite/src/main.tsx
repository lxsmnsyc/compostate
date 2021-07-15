/** @jsx c */
/** @jsxFrag Fragment */
import {
  c,
  Fragment,
  Suspense,
  render,
  suspend,
  onEffect,
} from 'compostate-jsx';
import {
  computed,
  track,
  reactive,
  ref,
  resource,
} from 'compostate';

import './style.css';

interface TodoItem {
  id: number;
  done: boolean;
  message: string;
}

const list = reactive<TodoItem[]>([]);

interface TodoListItemProps {
  item: TodoItem;
}

function TodoListItemInternal(props: TodoListItemProps) {
  const { item } = props;
  function onToggle() {
    item.done = !item.done;
  }

  function onRemove() {
    const index = list.findIndex((value) => value.id === item.id);

    list.splice(index, 1);
  }

  return (
    <div
      className={computed(() => (
        `todo-item ${item.done ? 'complete' : 'pending'}`
      ))}
    >
      <div className="todo-item-content">
        {computed(() => item.message)}
      </div>
      <div className="todo-item-actions">
        <button
          className={computed(() => (
            `todo-item-toggle ${item.done ? 'complete' : 'pending'}`
          ))}
          onClick={onToggle}
        >
          {computed(() => (item.done ? 'Completed' : 'Pending'))}
        </button>
        <button className="todo-item-delete" onClick={onRemove}>
          Delete
        </button>
      </div>
    </div>
  );
}

const sleep = (value: number) => new Promise((resolve) => {
  setTimeout(resolve, value, true);
});

function TodoListItemLoading() {
  return (
    <div
      className="todo-item loading"
    >
      <div className="todo-item-content">
        Loading...
      </div>
      <div className="todo-item-actions">
        <button className="todo-item-toggle" disabled>
          Pending
        </button>
        <button className="todo-item-delete" disabled>
          Delete
        </button>
      </div>
    </div>
  );
}

function TodoListItem(props: TodoListItemProps) {
  const delayedProps = resource(async () => {
    const value = props.item;
    await sleep(3000);
    return value;
  });

  suspend(delayedProps);

  return (
    <>
      {computed(() => (
        delayedProps.status === 'success'
          ? <TodoListItemInternal item={delayedProps.value} />
          : <TodoListItemLoading />
      ))}
    </>
  );
}

function TodoListForm() {
  const message = ref('');

  function onSubmit(e: Event) {
    e.preventDefault();

    list.unshift(
      reactive<TodoItem>({
        done: false,
        message: message.value,
        id: list.length,
      }),
    );

    message.value = '';
  }

  const disableButton = computed(() => message.value === '');

  return (
    <form className="todo-list-form" onSubmit={onSubmit}>
      <input
        type="text"
        value={message}
        onInput={(e) => {
          message.value = (e.target as HTMLInputElement).value;
        }}
      />
      <button
        type="submit"
        disabled={disableButton}
      >
        Add
      </button>
    </form>
  );
}

function TodoList() {
  return (
    <>
      <TodoListForm />
      <div className="todo-list">
        {computed(() => track(list).map((item) => (
          <Suspense fallback={<TodoListItemLoading />}>
            <TodoListItem
              item={computed(() => item)}
            />
          </Suspense>
        )))}
      </div>
    </>
  );
}

function App() {
  return (
    <div className="app">
      <h1>Todo List</h1>
      <TodoList />
    </div>
  );
}

const root = document.getElementById('root');

if (root) {
  render(root, <App />);
}
