# SVG pictures

A fenced `svg` block and a raw `<svg>` that fills its own block are drawn inline, in the colours of the theme.

```svg
<svg viewBox="0 0 360 120" width="360" role="img" aria-label="Three steps">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
      <path d="M0 0 L8 4 L0 8 z" fill="var(--muted)"/>
    </marker>
  </defs>
  <rect x="8" y="30" width="90" height="60" rx="8" fill="var(--surface)" stroke="var(--border)"/>
  <text x="53" y="66" text-anchor="middle" fill="var(--text)" font-size="14">Write</text>
  <line x1="98" y1="60" x2="132" y2="60" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)"/>
  <rect x="135" y="30" width="90" height="60" rx="8" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"/>
  <text x="180" y="66" text-anchor="middle" fill="var(--accent)" font-size="14">Review</text>
  <line x1="225" y1="60" x2="259" y2="60" stroke="var(--muted)" stroke-width="2" marker-end="url(#arrow)"/>
  <rect x="262" y="30" width="90" height="60" rx="8" fill="var(--green)" stroke="var(--border)"/>
  <text x="307" y="66" text-anchor="middle" fill="var(--surface)" font-size="14">Merge</text>
</svg>
```

Text between the two pictures.

<svg viewBox="0 0 360 80" width="360" role="img" aria-label="Status colours">
  <circle cx="40" cy="40" r="26" fill="var(--red)"/>
  <circle cx="120" cy="40" r="26" fill="var(--orange)"/>
  <circle cx="200" cy="40" r="26" fill="var(--green)"/>
  <circle cx="280" cy="40" r="26" fill="var(--blue)"/>
  <circle cx="335" cy="40" r="14" fill="var(--unknown-name)"/>
</svg>

End of the page.
