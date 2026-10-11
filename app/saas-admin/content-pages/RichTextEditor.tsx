"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeRichText } from "../../../lib/rich-text";

const fontChoices = ["Arial", "Georgia", "Helvetica", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana"];
const formats = [{ label: "Paragraph", value: "p" }, { label: "Heading 1", value: "h1" }, { label: "Heading 2", value: "h2" }, { label: "Heading 3", value: "h3" }, { label: "Quote", value: "blockquote" }];

export default function RichTextEditor({ value, onChange, disabled = false }: { value: string; onChange: (html: string) => void; disabled?: boolean }) {
  const editor = useRef<HTMLDivElement>(null);
  const skipExternalUpdate = useRef(false);
  const [sourceMode, setSourceMode] = useState(false);
  useEffect(() => {
    if (skipExternalUpdate.current) { skipExternalUpdate.current = false; return; }
    if (editor.current && editor.current.innerHTML !== sanitizeRichText(value)) editor.current.innerHTML = sanitizeRichText(value);
  }, [value, sourceMode]);
  function run(command: string, argument?: string) {
    editor.current?.focus();
    document.execCommand(command, false, argument);
    changed();
  }
  function changed() {
    if (!editor.current) return;
    skipExternalUpdate.current = true;
    onChange(editor.current.innerHTML);
  }
  function insertLink() {
    const url = window.prompt("Enter a website URL or email link");
    if (url) run("createLink", url);
  }
  const button = (label: string, title: string, command: string, argument?: string) => <button type="button" key={title} title={title} aria-label={title} disabled={disabled || sourceMode} onMouseDown={event => event.preventDefault()} onClick={() => run(command, argument)}>{label}</button>;
  return <div className={`rich-text-editor ${disabled ? "disabled" : ""}`}>
    <div className="rich-text-toolbar" role="toolbar" aria-label="Text formatting">
      <select aria-label="Text style" disabled={disabled || sourceMode} defaultValue="p" onMouseDown={event => event.stopPropagation()} onChange={event => run("formatBlock", `<${event.target.value}>`)}>{formats.map(format => <option value={format.value} key={format.value}>{format.label}</option>)}</select>
      {button("B", "Bold", "bold")}{button("I", "Italic", "italic")}{button("U", "Underline", "underline")}
      <select aria-label="Font family" disabled={disabled || sourceMode} defaultValue="Arial" onMouseDown={event => event.stopPropagation()} onChange={event => run("fontName", event.target.value)}>{fontChoices.map(font => <option key={font}>{font}</option>)}</select>
      <label className="rich-text-color" title="Text color">A<input type="color" aria-label="Text color" disabled={disabled || sourceMode} onChange={event => run("foreColor", event.target.value)} /></label>
      <label className="rich-text-color highlight" title="Highlight color">▰<input type="color" aria-label="Highlight color" disabled={disabled || sourceMode} defaultValue="#fff176" onChange={event => run("hiliteColor", event.target.value)} /></label>
      {button("• List", "Bulleted list", "insertUnorderedList")}{button("1. List", "Numbered list", "insertOrderedList")}
      {button("⇤", "Align left", "justifyLeft")}{button("↔", "Align center", "justifyCenter")}{button("⇥", "Align right", "justifyRight")}
      <button type="button" title="Insert link" aria-label="Insert link" disabled={disabled || sourceMode} onMouseDown={event => event.preventDefault()} onClick={insertLink}>Link</button>
      <button type="button" title="Insert table" disabled={disabled || sourceMode} onMouseDown={event => event.preventDefault()} onClick={() => { editor.current?.focus(); document.execCommand("insertHTML", false, "<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>"); changed(); }}>Table</button>
      <button type="button" className={sourceMode ? "active" : ""} title="Edit HTML source" disabled={disabled} onClick={() => setSourceMode(current => !current)}>{sourceMode ? "Rich text" : "Source"}</button>
    </div>
    {sourceMode ? <textarea className="rich-text-source" aria-label="HTML source" value={value} disabled={disabled} onChange={event => onChange(event.target.value)} spellCheck={false} /> : <div ref={editor} className="rich-text-canvas" contentEditable={!disabled} suppressContentEditableWarning onInput={changed} onBlur={changed} role="textbox" aria-label="Page content" aria-multiline="true" />}
  </div>;
}
