"use client";

import { useEffect, useRef, useState } from "react";
import { sanitizeRichText, safeMediaUrl, videoEmbedUrl } from "../../../lib/rich-text";

const fontChoices = ["Arial", "Georgia", "Helvetica", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana"];
const formats = [{ label: "Paragraph", value: "p" }, { label: "Heading 1", value: "h1" }, { label: "Heading 2", value: "h2" }, { label: "Heading 3", value: "h3" }, { label: "Quote", value: "blockquote" }];

export default function RichTextEditor({ value, onChange, disabled = false }: { value: string; onChange: (html: string) => void; disabled?: boolean }) {
  const editor = useRef<HTMLDivElement>(null);
  const skipExternalUpdate = useRef(false);
  const savedRange = useRef<Range | null>(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [mediaPanel, setMediaPanel] = useState<"image" | "video" | null>(null);
  const selectedMedia = useRef<HTMLElement | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaAlt, setMediaAlt] = useState("");
  const [mediaWidth, setMediaWidth] = useState("100");
  const [mediaUnit, setMediaUnit] = useState("%");
  const [mediaAlign, setMediaAlign] = useState("center");
  const [mediaError, setMediaError] = useState("");
  const [uploading, setUploading] = useState(false);
  function openMedia(kind: "image" | "video", element: HTMLElement | null = null) {
    selectedMedia.current = element;
    setMediaPanel(kind); setMediaError("");
    setMediaUrl(element?.getAttribute("src") ?? "");
    setMediaAlt(element?.getAttribute(kind === "image" ? "alt" : "title") ?? "");
    const width = element?.style.width || "100%";
    setMediaWidth(width.replace(/[^0-9]/g, "")); setMediaUnit(width.endsWith("px") ? "px" : "%");
    setMediaAlign(element?.style.marginLeft === "auto" ? element.style.marginRight === "auto" ? "center" : "right" : "left");
  }
  async function uploadImage(file: File) {
    setUploading(true); setMediaError("");
    try {
      const form = new FormData(); form.set("file", file);
      const response = await fetch("/api/saas-admin/homepage/assets", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Image upload failed.");
      setMediaUrl(result.url);
    } catch (error) { setMediaError(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setUploading(false); }
  }
  function applyMedia() {
    const url = mediaUrl.trim(); const width = Number(mediaWidth);
    if (!safeMediaUrl(url)) { setMediaError("Use an HTTPS media URL or an image uploaded here."); return; }
    if (!Number.isInteger(width) || width < 1 || width > (mediaUnit === "%" ? 100 : 2000)) { setMediaError("Width must be 1–100% or 1–2000px."); return; }
    const embed = mediaPanel === "video" ? videoEmbedUrl(url) : null;
    const tag = mediaPanel === "image" ? "img" : embed ? "iframe" : "video";
    const media = document.createElement(tag);
    media.setAttribute("src", embed || url);
    media.setAttribute(tag === "img" ? "alt" : "title", mediaAlt);
    media.style.cssText = `display:block;width:${width}${mediaUnit};max-width:100%;height:auto;margin-left:${mediaAlign === "left" ? "0" : "auto"};margin-right:${mediaAlign === "right" ? "0" : "auto"};${tag === "iframe" ? "aspect-ratio:16 / 9;" : ""}`;
    if (tag === "video") { media.setAttribute("controls", ""); media.setAttribute("preload", "metadata"); }
    if (tag === "iframe") media.setAttribute("allowfullscreen", "");
    const clean = sanitizeRichText(media.outerHTML);
    if (selectedMedia.current && editor.current?.contains(selectedMedia.current)) {
      selectedMedia.current.outerHTML = clean;
    } else {
      restoreSelection();
      if (!savedRange.current || !editor.current?.contains(savedRange.current.commonAncestorContainer)) {
        const range = document.createRange(); range.selectNodeContents(editor.current!); range.collapse(false);
        const selection = window.getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
      }
      document.execCommand("insertHTML", false, `${clean}<p><br></p>`);
    }
    selectedMedia.current = null; setMediaPanel(null); changed();
  }

  useEffect(() => {
    if (skipExternalUpdate.current) { skipExternalUpdate.current = false; return; }
    if (editor.current && editor.current.innerHTML !== sanitizeRichText(value)) editor.current.innerHTML = sanitizeRichText(value);
  }, [value, sourceMode]);
  useEffect(() => {
    const rememberSelection = () => {
      const selection = window.getSelection();
      if (selection?.rangeCount && editor.current?.contains(selection.anchorNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", rememberSelection);
    return () => document.removeEventListener("selectionchange", rememberSelection);
  }, []);
  function restoreSelection() {
    editor.current?.focus();
    if (savedRange.current && editor.current?.contains(savedRange.current.commonAncestorContainer)) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedRange.current);
    }
  }
  function run(command: string, argument?: string) {
    restoreSelection();
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
      <button type="button" title="Insert table" disabled={disabled || sourceMode} onMouseDown={event => event.preventDefault()} onClick={() => { restoreSelection(); document.execCommand("insertHTML", false, "<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table><p><br></p>"); changed(); }}>Table</button>
      <button type="button" disabled={disabled || sourceMode} onMouseDown={event => event.preventDefault()} onClick={() => openMedia("image")}>Image</button>
      <button type="button" disabled={disabled || sourceMode} onMouseDown={event => event.preventDefault()} onClick={() => openMedia("video")}>Video</button>
      <button type="button" className={sourceMode ? "active" : ""} title="Edit HTML source" disabled={disabled} onClick={() => setSourceMode(current => !current)}>{sourceMode ? "Rich text" : "Source"}</button>
    </div>
    {mediaPanel && !sourceMode && <fieldset className="rich-text-media-panel" disabled={disabled || uploading}>
      <legend>{selectedMedia.current ? "Edit" : "Add"} {mediaPanel}</legend>
      <label>Media URL<input type="url" value={mediaUrl} onChange={event => setMediaUrl(event.target.value)} placeholder={mediaPanel === "image" ? "https://…/image.jpg" : "YouTube, Vimeo, or direct video URL"} /></label>
      {mediaPanel === "image" && <label>Upload image<input type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={event => { const file = event.target.files?.[0]; if (file) void uploadImage(file); event.target.value = ""; }} /><small>PNG, JPG, WebP or AVIF, up to 3 MB</small></label>}
      <label>{mediaPanel === "image" ? "Alternative text" : "Video title"}<input value={mediaAlt} onChange={event => setMediaAlt(event.target.value)} maxLength={300} /></label>
      <label>Width<input type="number" min={1} max={mediaUnit === "%" ? 100 : 2000} value={mediaWidth} onChange={event => setMediaWidth(event.target.value)} /></label>
      <label>Unit<select value={mediaUnit} onChange={event => setMediaUnit(event.target.value)}><option value="%">% of content width</option><option value="px">Pixels</option></select></label>
      <label>Alignment<select value={mediaAlign} onChange={event => setMediaAlign(event.target.value)}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
      <div className="rich-text-media-actions"><button type="button" onClick={applyMedia}>{selectedMedia.current ? "Apply changes" : "Insert media"}</button><button type="button" onClick={() => { setMediaPanel(null); selectedMedia.current = null; }}>Cancel</button>{selectedMedia.current && <button type="button" onClick={() => { selectedMedia.current?.remove(); selectedMedia.current = null; setMediaPanel(null); changed(); }}>Remove media</button>}</div>
      {uploading && <p role="status">Uploading image…</p>}{mediaError && <p role="alert">{mediaError}</p>}
      <small>Click an image or video in the editor to adjust it. Videos use playback controls; embeds support YouTube and Vimeo.</small>
    </fieldset>}
    {sourceMode ? <textarea className="rich-text-source" aria-label="HTML source" value={value} disabled={disabled} onChange={event => onChange(event.target.value)} spellCheck={false} /> : <div ref={editor} className="rich-text-canvas" contentEditable={!disabled} suppressContentEditableWarning onInput={changed} onBlur={changed} onClick={event => { const target = (event.target as HTMLElement).closest("img,video,iframe"); if (!disabled && target && editor.current?.contains(target)) openMedia(target.tagName === "IMG" ? "image" : "video", target as HTMLElement); }} role="textbox" aria-label="Page content" aria-multiline="true" />}
    {!sourceMode && <div className="rich-text-media-actions"><button type="button" disabled={disabled} onClick={() => { const media = editor.current?.querySelectorAll<HTMLElement>("img,video,iframe"); if (!media?.length) { openMedia("image"); setMediaError("Add an image or video first."); return; } const current = Array.from(media).indexOf(selectedMedia.current!); const next = media[(current + 1) % media.length]; openMedia(next.tagName === "IMG" ? "image" : "video", next); }}>Select next image / video</button></div>}
  </div>;
}
