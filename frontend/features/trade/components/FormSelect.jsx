"use client";

import { inputBase, labelStyle, onFocusGreen, onBlurReset } from "./FormInput";

/**
 * FormSelect — labelled dropdown select field.
 * @param {string}   label   - Field label
 * @param {string}   name    - Field name (for onChange target.name)
 * @param {string}   value   - Current value
 * @param {Function} onChange - Change handler
 * @param {Array}    options  - Array of { value, label } objects
 */
export function FormSelect({ label, name, value, onChange, options }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        style={{ ...inputBase, cursor: "pointer" }}
        onFocus={onFocusGreen}
        onBlur={onBlurReset}
      >
        <option value="">Select...</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
