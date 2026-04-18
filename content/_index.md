+++
title = 'Home'
date = 2023-01-01T08:00:00-07:00
draft = false
+++

Help

## Enable the right TOC on index pages

Section pages (list pages rendered by `section.html`) do not display the right-column table of contents (TOC) by default. The partial call is commented out, and there is no guard to hide the empty column when a section's `_index.md` contains no headings. The following steps enable the TOC and collapse the column when it has nothing to display.

### Step 1: Uncomment the partial call

Open `themes/freeme/layouts/section.html` and find the commented-out partial on line 17:

```html
<!-- {{- partial "content-toc" . -}} -->
```

Replace it with the active call:

```html
{{- partial "content-toc" . -}}
```

### Step 2: Add a conditional guard to the partial

Open `themes/freeme/layouts/_partials/content-toc.html`. The partial currently renders its wrapper unconditionally. Wrap the output in an `if` block so the markup appears only when the page has headings:

```html
{{ $toc := .TableOfContents }}
{{ $ulOnly := replaceRE `(?s).*?(<ul>.*</ul>).*` `$1` $toc }}

{{ if $ulOnly }}
<div class="content-toc__inner">
    <nav class="content-toc__nav">
        {{ $ulOnly | safeHTML }}
    </nav>
</div>
{{ end }}
```

### Step 3: Collapse the column when the TOC is empty

The `<aside class="content-toc">` element is a flex child with `flex-basis: 312px`. When the partial renders nothing, the column remains visible as an empty white strip. To collapse it, compute `$ulOnly` in `section.html` and apply a modifier class.

Replace the `<aside>` block in `themes/freeme/layouts/section.html` with:

```html
{{ $toc := .TableOfContents }}
{{ $ulOnly := replaceRE `(?s).*?(<ul>.*</ul>).*` `$1` $toc }}

<aside class="content-toc{{ if not $ulOnly }} content-toc--hidden{{ end }}">
    {{- partial "content-toc" . -}}
</aside>
```

### Step 4: Add the CSS rule

Open `themes/freeme/assets/css/_layout.scss` and add the modifier rule after the existing `.content-toc` block:

```scss
.content-toc--hidden {
  display: none;
}
```

`display: none` removes the column from the flex row entirely. If you want to animate the collapse later, replace it with `flex-basis: 0; overflow: hidden` to avoid reflow on sibling elements.