/* ABI Mobile App — Wheel picker (ล้อเลื่อนเลือกค่า แบบ iOS) — เลื่อนนิ้ว/เมาส์ คลิก หรือกดลูกศรได้ */
const ROW = 40;

function WheelPicker({ label, items, value, onChange, ariaLabel }) {
  const ref = React.useRef(null);
  const settle = React.useRef(null);
  const idx = Math.max(0, items.findIndex((it) => it.value === value));
  const [hover, setHover] = React.useState(idx);
  // ใช้ค่าล่าสุดเสมอ (callback ที่หน่วงเวลาไว้จะไม่ใช้ props เก่า)
  const latest = React.useRef({});
  latest.current = { items, value, onChange };

  // เลื่อนไปยังค่าที่เลือกเมื่อรายการหรือค่าเปลี่ยนจากภายนอก
  React.useEffect(() => () => clearTimeout(settle.current), []);
  React.useEffect(() => {
    clearTimeout(settle.current);
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== idx) el.scrollTop = idx * ROW;
    setHover(idx);
  }, [idx, items]);

  const commit = (i) => {
    const { items, value, onChange } = latest.current;
    const n = Math.max(0, Math.min(items.length - 1, i));
    setHover(n);
    if (items[n] && items[n].value !== value) onChange(items[n].value);
  };
  const go = (i) => {
    const n = Math.max(0, Math.min(items.length - 1, i));
    ref.current.scrollTo({ top: n * ROW, behavior: 'smooth' });
    commit(n);
  };
  const onScroll = () => {
    const i = Math.round(ref.current.scrollTop / ROW);
    setHover(i);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => commit(i), 120);
  };
  const onKey = (e) => {
    const step = { ArrowDown: 1, ArrowUp: -1, PageDown: 5, PageUp: -5 }[e.key];
    if (step) go(hover + step);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
      <span style={{ fontFamily: 'var(--font-body)', fontSize: 12.5, color: 'var(--ink-500)', paddingLeft: 2 }}>{label}</span>
      <div className="abi-wheel-box">
        <div ref={ref} className="abi-wheel" role="listbox" tabIndex={0} aria-label={ariaLabel || label}
          aria-activedescendant={items[hover] ? `${ariaLabel || label}-${hover}` : undefined}
          onScroll={onScroll} onKeyDown={onKey}>
          {items.map((it, i) => (
            <div key={it.value} id={`${ariaLabel || label}-${i}`} role="option" aria-selected={i === hover}
              className={'abi-wheel-item' + (i === hover ? ' on' : '')} onClick={() => go(i)}>{it.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { WheelPicker });
