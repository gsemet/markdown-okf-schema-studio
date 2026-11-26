# Hostile document

The reader still sees this sentence.

<script>window.hostileRan = "inline script";</script>

<script nonce="hostile" src="https://example.invalid/hostile.js"></script>

<img src="x-missing.png" onerror="window.hostileRan = 'onerror attribute'">

<iframe src="https://example.invalid/frame.html"></iframe>

<object data="https://example.invalid/object.swf"></object>

<embed src="https://example.invalid/embed.swf">

<form action="https://example.invalid/post"><input name="q"><button>Send</button></form>

<style>.hostile-style { background: url("https://example.invalid/style.png"); }</style>

<link rel="stylesheet" href="https://example.invalid/sheet.css">

<meta http-equiv="refresh" content="0; url=https://example.invalid/refresh">

<a href="javascript:window.hostileRan='javascript link'" onclick="window.hostileRan='onclick attribute'">A hostile link</a>

<img src="https://example.invalid/raw.png" alt="A remote raw image">

![A remote Markdown image](https://example.invalid/markdown.png)
