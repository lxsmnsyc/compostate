/** @jsx c */
/** @jsxFrag Fragment */
import {
  c,
  For,
  Fragment,
  hydrate,
  render,
} from 'compostate-jsx';
import {
  computed,
  track,
  reactive,
  ref,
  effect,
} from 'compostate';

import './style.css';

interface TodoItem {
  id: number;
  done: boolean;
  message: string;
}

const initialData = new Array(1000)
  .fill(0)
  .map((_, index) => (
    reactive<TodoItem>({
      id: -index,
      done: false,
      message: `message-${index}`,
    })
  ));

const list = reactive<TodoItem[]>(initialData);

interface TodoListItemProps {
  item: TodoItem;
}

function TodoListItem(props: TodoListItemProps) {
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

let index = 0;

function TodoListForm() {
  const message = ref('');

  function onSubmit(e: Event) {
    e.preventDefault();

    list.unshift(
      reactive<TodoItem>({
        done: false,
        message: message.value,
        id: index,
      }),
    );
    index += 1;
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
        <For
          in={list}
          each={(item) => (
            <TodoListItem item={item} />
          )}
        />
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
