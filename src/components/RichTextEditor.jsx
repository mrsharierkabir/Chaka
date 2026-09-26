import { useEffect, useRef } from 'react';

const BUTTONS = [
  { cmd: 'bold', label: 'B', style: { fontWeight: 700 } },
  { cmd: 'italic', label: 'I', style: { fontStyle: 'italic' } },
  { cmd: 'underline', label: 'U', style: { textDecoration: 'underline' } },
  { cmd: 'insertUnorderedList', label: '• List' },
  { cmd: 'insertOrderedList', label: '1. List' },
  { cmd: 'formatBlock:H3', label: 'Heading' },
  { cmd: 'removeFormat', label: 'Clear' },
];

export default function RichTextEditor({ value, onChange, placeholder }) {
  const ref = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Only sync from outside on first mount / when switching to a different
    // product — typing keeps re-rendering itself via the DOM, not React.
    if (ref.current && isFirstRender.current) {
      ref.current.innerHTML = value || '';
      isFirstRender.current = false;
    }
  }, [value]);

  function exec(cmd) {
    ref.current?.focus();
    if (cmd.startsWith('formatBlock:')) {
      document.execCommand('formatBlock', false, cmd.split(':')[1]);
    } else {
      document.execCommand(cmd, false, null);
    }
    onChange(ref.current?.innerHTML || '');
  }

  function onLink() {
    const url = window.prompt('Link URL');
    if (url) {
      ref.current?.focus();
      document.execCommand('createLink', false, url);
      onChange(ref.current?.innerHTML || '');
    }
  }

  return (
    <div className="rte">
      <div className="rte-toolbar">
        {BUTTONS.map((b) => (
          <button type="button" key={b.label} style={b.style} onMouseDown={(e) => e.preventDefault()} onClick={() => exec(b.cmd)}>
            {b.label}
          </button>
        ))}
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onLink}>🔗 Link</button>
      </div>
      <div
        ref={ref}
        className="rte-content"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || 'Write a description…'}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}
