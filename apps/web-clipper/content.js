// Content script — returns page title + body text
(() => ({
  title: document.title,
  content: document.body.innerText,
}))();
