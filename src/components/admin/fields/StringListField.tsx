"use client";

import { Plus, X, ChevronUp, ChevronDown } from "lucide-react";

/**
 * Ordered list of plain strings — amenities, story paragraphs.
 * Order is meaningful (paragraphs read in sequence), so it is reorderable.
 */
export default function StringListField({
  label,
  values,
  onChange,
  placeholder,
  multiline = false,
  hint,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  multiline?: boolean;
  hint?: string;
}) {
  function update(index: number, value: string) {
    const next = [...values];
    next[index] = value;
    onChange(next);
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <span className="label-admin">{label}</span>
        {hint && <span className="text-[11px] text-muted">{hint}</span>}
      </div>

      <ul className="mt-3 space-y-3">
        {values.map((value, index) => (
          <li key={index} className="flex items-start gap-2">
            <span className="w-6 shrink-0 pt-3 text-[10px] tracking-[0.2em] text-muted">
              {String(index + 1).padStart(2, "0")}
            </span>

            {multiline ? (
              <textarea
                value={value}
                rows={3}
                onChange={(event) => update(index, event.target.value)}
                placeholder={placeholder}
                className="field-admin-boxed resize-y"
              />
            ) : (
              <input
                type="text"
                value={value}
                onChange={(event) => update(index, event.target.value)}
                placeholder={placeholder}
                className="field-admin"
              />
            )}

            <div className="flex shrink-0 items-center gap-1 pt-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
                className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-charcoal disabled:opacity-25"
              >
                <ChevronUp size={14} />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === values.length - 1}
                aria-label="Move down"
                className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-charcoal disabled:opacity-25"
              >
                <ChevronDown size={14} />
              </button>
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                aria-label="Remove"
                className="flex h-8 w-8 items-center justify-center text-muted transition-colors hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => onChange([...values, ""])}
        className="btn-admin-ghost mt-3 !px-0"
      >
        <Plus size={13} />
        Add
      </button>
    </div>
  );
}
