---
title: "Document geometry and scrolling"
linkTitle: "Geometry and scrolling"
weight: 70
description:
---

Understanding how the browser renders elements on the screen requires you understand a coordinate-based view of the document in the browser.

## Document coordinates and viewport coordinates

The `x` coordinate increases from left to right, and the `y` increases from top to bottom. But you need to understand whether these coordinates are relative to the document or the viewport:
- Document: the rendered HTML DOM
- Viewport: portion of the browser that displays document content. This excludes the brower tabs, menus, toolbars, etc
  - Viewport coordinates are sometimes called "window coordinates" 
  - `<iframe>` element is the viewport


You need to know how to convert document and viewport coordinates with _offsets_:
- When the document is smaller than the viewport and there has been no scrolling, the coordinates are equal
- If the element has a `y` document coordinate of 100px, then you scroll down 25px, the element has a viewport `y` coordinate of 75px
- If element has `x` coordinate of 200px and then you scroll the viewport to the right horizontally by 200px, it has a document `x` coordinate of 600px.
  
JS tends to use the viewport coordinates because the document coordinates do not really work - it is difficult to pinpoint an element with a single set of document coordinates:
- CSS `overflow` lets you put too much content in an element
- Elements can have their own scrollbars, which makes them their own viewport
- mouse and pointer events use viewport coordinates

CSS gives you positioning elements that use different coordinate systems:
- `position: fixed` uses viewport coordinates for `top` and `left`
- `position: relative` positions the element relative to where it would have been positioned in the normal document flow
- `position: absolute` either uses the document for `top` or `left`, or it creates its own container coordinate system
  - Ex: You have a relatively positioned container element and then set `position: absolute` on a child element. The child element is positioned relative to the container element, which creates its own coordinate context

## Querying element geometry

Elements are rectangular when they are rendered in the browser.
- block elements are always rectangular
- inline elements might take up multiple lines, so they are an array of rectangles
- `getBoundingClientRect()` gets the total size of element - border and padding, not margin
  - `left` to `right` is the width, `top` to `bottom` is the height
- `getClientRects()` gets an array of rectangles, if there are more than one

## Get element at a point (coordinate)

You can use the `elementFromPoint(x, y)` function to determine which element is at that viewport coordinate:

```js
let coords = document.elementFromPoint(555, 490);
console.log(coords);    // <button class="btn">Button</button>

// log everything that a mouse hovers over
window.addEventListener('mouseover', (e) => {
    console.log(document.elementFromPoint(e.clientX, e.clientY));
});
```

## Scrolling

### scrollTo(x,y)

Use `scrollTo(x, y)` on the Window object to set scrollbar offsets:
- the browser will scroll here so that the specified point is at the top-left corner of the viewport
- if you give a point that is outside the viewport, it gets as close as it can
- `x` offset: `document.documentElement.offsetHeight`
- `y` offset: `window.innerHeight`

```js
let docHeight = document.documentElement.offsetHeight;
let viewHeight = window.innerHeight;
window.scrollTo(0, docHeight - viewHeight);
```

### scrollBy(x,y)

Scrolls to a location that is relative to the current scroll position:

```js
// scroll to the bottom of the page
setInterval(() => { scrollBy(0, 5), 500; });
```

### Smooth scrolling

Pass either `scrollTo()` or `scrollBy()` an object to make sure it scrolls smoothly:

```js
let docHeight = document.documentElement.offsetHeight;
let viewHeight = window.innerHeight;

// scrollTo
window.scrollTo({
    left: 0,
    top: docHeight - viewHeight,
    behavior: "smooth"
});

// scrollBy
window.scrollBy({
    left: 0,
    top: 200,
    behavior: "smooth"
});
```

### scrollIntoView()

Element method that will scroll until the element is in view:
- by default, aligns the top of the element with the viewport
- pass `false` to align the bottom edge of the element with the viewport
- pass object for more control:
  - `block` determines vertical positioning
  - `inline` determines horizontal positioning
  - both accept `start`, `end`, `nearest`, `center`

```js
b.scrollIntoView({
    behavior: "smooth",
    block: "center",
    inline: "nearest"
});
```

## Intersection Observer

Scroll event listeners fire hundreds of times per second. The **Intersection Observer API** is more efficient: the browser calls your callback only when an element crosses a visibility threshold, with no polling required.

Common use cases:
- Lazy-loading images below the fold
- Triggering CSS animations when elements enter the viewport
- Infinite scroll — loading more content when the bottom is reached
- Analytics — tracking which sections a user actually sees

```js
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);   // stop watching once visible
        }
    });
}, {
    threshold: 0.15,                    // fire when 15% of the element is in view
    rootMargin: '0px 0px -60px 0px',    // shrink the bottom of the viewport by 60px
});

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));
```

| Option | Description |
|--------|-------------|
| `threshold` | A number (0–1) or array of numbers — the fraction of the element that must be visible to trigger the callback |
| `rootMargin` | Grows or shrinks the intersection root — same syntax as CSS `margin`. Use negative values to trigger before an element fully enters the viewport |
| `root` | The scroll container to observe relative to. Defaults to the browser viewport |

### Real-world example: lazy-loading images

Swap a placeholder `src` for the real image URL only when the image scrolls into view. This reduces initial page load time significantly:

```js
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(({ isIntersecting, target }) => {
        if (!isIntersecting) return;

        target.src = target.dataset.src;
        target.removeAttribute('data-src');
        imageObserver.unobserve(target);
    });
});

document.querySelectorAll('img[data-src]').forEach(img => imageObserver.observe(img));
```

```html
<!-- Low-res placeholder loads immediately; real image loads on scroll -->
<img
  data-src="/images/product-hero.jpg"
  src="/images/placeholder-blur.jpg"
  alt="Product hero"
  width="1200" height="600"
>
```

### Real-world example: scroll progress bar

A reading progress bar shows how far down the page the user has scrolled. Use `{ passive: true }` so the scroll listener never blocks rendering:

```js
const bar = document.querySelector('#progress-bar');

window.addEventListener('scroll', () => {
    const scrolled = window.scrollY;
    const total = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${Math.round((scrolled / total) * 100)}%`;
}, { passive: true });
```

```html
<div id="progress-bar" style="
  position: fixed; top: 0; left: 0; height: 3px;
  background: #0057ff; width: 0%; transition: width 0.1s linear;
"></div>
```

## Viewport size, content size, scroll position


### Browser window size

Figure out the size of the viewport, the size of the content, and the scroll offsets:
- viewport size: `window.innerWidth` and `window.innerHeight`
  - HTML headers have a `viewport` tag in the head to indicate the desired viewport width
- document size: `document.documentElement`. Use one of the following to get width and height:
  - `document.documentElement.getBoundingClientRect()`
  - `document.documentElement.offsetWidth` and `document.documentElement.offsetHeight`
- scroll offsets (read-only): `window.scrollX` and `window.scrollY`
  - read-only, so use `window.scrollTo()` to scroll the document

```js
// viewport size
wh = window.innerHeight;
ww = window.innerWidth;

// document size
docH = document.documentElement.getBoundingClientRect().height;
docW = document.documentElement.getBoundingClientRect().width;

dH = document.documentElement.offsetHeight;
dW = document.documentElement.offsetWidth;

// scroll offsets
wX = window.scrollX;
wY = window.scrollY;
```

### Element sizes

Element sizing is complicated. Every element has the properties listed below.

Offset properties:
- `offsetWidth`: on-screen size in pixels
- `offsetHeight`: on-screen size in pixels
- `offsetLeft`: `x` coordinate, relative to parent for positioned els
- `offsetTop`: `y` coordinate, relative to parent for positioned els
- `offsetParent`: element that these properties are relative to

Client properties - all are read-only:
- `clientWidth`: on-screen size in pixels, only content area and padding
- `clientHeight`: on-screen size in pixels, only content area and padding
- `clientLeft`: not helpful - horizontal distance between outside of el padding and its border
- `clientTop`: not helpful - vertical distance between outside of el padding and its border

Scroll properties:
- `scrollWidth`: el's content area + padding and overflowing content. When no overflow, this is equal to `clientWidth`
- `scrollHeight`: el's content area + padding and overflowing content. When no overflow, this is equal to `clientHeight`
- `scrollLeft`: writeable. Scroll offset of element content within the element's viewport.
- `scrollTop`: writeable. Scroll offset of element content within the element's viewport.