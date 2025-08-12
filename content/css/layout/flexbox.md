+++
title = 'Flexbox'
date = '2025-08-06T10:11:35-04:00'
weight = 30
draft = false
+++

[Flex visual cheatsheet](https://flexbox.malven.co/)

Flexbox is short for Flexible Box Layout, and can define 1-D layouts. Each Flexbox layout consists of the following components:

Flex container
: The container element with properties that control the direction and behavior of the flex items.

Flex items
: Elements within the flex container with properties that control the relative size of each element.

 
Flexbox works from the content out. You don't need to set the size, because that is determined by the content. Common use cases include the following:
- Arrange elements in a row or column
- Vertically center items
- Make elements equal height


## Quick start

In general, start a flexbox with the following methods:
1. Apply `display: flex` to the flex container.
2. Set a `gap` or `flex-direction`, as needed.
3. Declare `flex` values for the flex items to control their size, as needed.


## Flex container

When you set `display: flex;` on an element, it becomes a _flex container_, and all direct child elements become _flex items_. A flex container takes up 100% of its available width, while the height is determined natually by its contents. The `line-height` of the text inside each flex item is what determines the height of each item.

{{< admonition "Inline flex containers" note >}}
If you use `display: inline-flex`, all elements become flex items, but they are inline elements instead of block. You will rarely use `inline-flex`.
{{< /admonition >}}

A flex container has two axises:
- **Main axis**: Runs the same direction as the `flex-direction` setting. Ex: `row` (default), it goes left to right. `column`, top to bottom.
- **Cross axis**: Runs perpendicular to main axis.

### Flex direction

By default, `flex-direction` is set to `row`. You need to set `flex-direction` on the container only when you want to change the flex direction to `column`.

When set to `column`, the container swaps the direction of the main-axis and the cross-axis. This means that flex properties like `flex-basis`, `flex-grow`, and `flex-shrink` apply to the element height, not width. The flex container's height is still determined by the contents of its flex items when you use  `flex-direction: column;`.

### Properties

Apply the following properties to the flex container:

| Property          | Description                                                                                                                                                                                                                          | Values                                             |
| :---------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------- |
| `display`         | Defines the element as a flex container.                                                                                                                                                                                             | `flex`                                             |
| `flex-direction`  | Specifies which direction the main-axis runs.                                                                                                                                                                                        | `row`, `row-reverse`, `column`, `column-reverse`   |
| `flex-wrap`       | Whether the flex items wrap to the next line.                                                                                                                                                                                        | `no-wrap`, `wrap`, `wrap-reverse`                  |
| `flex-flow`       | Shorthand for `flex-direction` and `flex-wrap`.                                                                                                                                                                                      | See individual property values.                    |
| `justify-content` | Flex item alignment along the main axis.                                                                                                                                                                                             | See [Main-axis alignment](#main-axis-alignment).   |
| `align-items`     | Flex item alignment along the cross axis.                                                                                                                                                                                            | See [Cross-axis alignment](#cross-axis-alignment). |
| `align-content`   | When `flex-wrap` is set to `wrap`, aligns the cross axis lines in a flex container. For example, if there is extra space available and you set this to `flex-end`, all wrapped lines are placed at the bottom of the flex container. | See [Main-axis alignment](#main-axis-alignment).   |
| `gap`             | Space between flex items (rows and columns). Consider how this interacts with `justify-content` or `align-content`.                                                                                                                  | Absolue or relative units.                         |
| `row-gap`         | Space between rows of flex                                                                                                                                                                                                           | Absolue or relative units.                         |
| `column-gap`      | Space between columns of flex items.                                                                                                                                                                                                 | Absolue or relative units.                         |

### Main-axis alignment

{{< admonition "Property contexts" note >}}
`align-content` accepts the same values as `justify-content` (with the addition of `stretch`), but it does not affect main-axis alignment. It only affects spacing when flex items wrap to create new rows or columns.
{{< /admonition >}}

`justify-content` accepts the values in the following list. Not that `flex-start` and `flex-end` refer to the flex direction, and `start`, `end`, `left`, and `right` refer to the `writing-mode` direction (left-to-right in English):
- `flex-start`, `start`, `left`
- `flex-end`, `end`, `right`
- `center`
- `space-between`: Items are evenly distributed along the main axis with no space at the edges.
- `space-around`: Items are evenly distributed with one unit of space between the edges, and two units of space between each item. 
- `space-evenly`: Items are distributed with equal units of space between items and the edges.
- `stretch` (align-content only): Lines expand to take up all remaining space.

### Cross-axis alignment

{{< admonition "Setting height or width on flex items" note >}}
By default, `align-items` is set to `stretch`, which means that the flex items will take up the entire space of the container along the cross axis.

If you explicitly set the height or width on a flex items, this results in unusual spacing within the flex container.
{{< /admonition >}}

`align-items` accepts these values:
- `flex-start`
- `flex-end`
- `center`
- `stretch` (default)
- `baseline`


## Flex items

By default, flex items are the same height, and the height is determined by their content. Margins between flex items do not collapse like in the regular document flow.

When arranged in a row, flex items are placed horizontally along the main axis, and vertically along the cross-axis. Column layouts have a vertical main axis and horizontal cross axis.

### flex property

The `flex` property controls the size of the flex items along the main axis. It consists of three individual properties:

```css
flex: <flex-grow> <flex-shrink> <flex-basis>
```
By default, `flex` is set to `flex: 0 1 auto`. This means that the item will not grow to fill space in the container, can shrink if there is not enough space, and the starting size is based on either its width or its intrinsic size.

If you set just one property, it applies the setting to `flex-grow`, and sets `flex-shrink` to `1` and `flex-basis` to `0`. For example, the following are equvalent:

```scss
.flex-item {
  flex: 0;
  flex: 0 1 0;
}
```
{{< admonition "" note >}}
`flex: 0;` means that the flex item will not grow beyond its default size
{{< /admonition >}}

When `flex-direction` is set to `row`, the `flex` property applies to the width of the container. When `flex-direction` is column, the `flex` property applies to the height of the container.

This is tricky when you are using `flex-direction: column;`. When arranged in a row, flex items take up the width of their container because they are block elements. When arranged in a column, flex items default to the height of their container because they are block elements. If there is no content, that height is 0.

#### Shorthand

The shorthand `flex` property is usually all you need. For example, the following styles creates two flex items, one twice as large as the other and includes a gap:

```css
.flex {
    display: flex;
    gap: var(--gap-size);
}

.column-main {
    flex: 2;
}

.column-sidebar {
    flex: 1;
}
```

When you need flex items to grow to fill their container, set `flex` to any value other than `0`. Setting `flex: 1;` will set both `flex-grow` and `flex-shrink` to `1`, while setting flex-basis to `0%`.


### flex-basis

{{< admonition "" tip >}}
Depending on the `flex-direction`, `flex-basis` refers to the following:
- `row`: width 
- `column`: height
{{< /admonition >}}

`flex-basis` defines the prefered size of a flex item. It is the starting size of an element before any space distribution, and before `flex-grow` or `flex-shrink` are applied. Set this like you would set a width (px, ems, percentages, etc).

The default setting is `auto`. This is a special setting that computes sizing after looking to the element's defined `width`:
- **Defined `width`**: Applies the `width` setting to the element.
- **No `width`**: Sizes the element based on its contents.

If the element has a defined height or width and `flex-basis` is set to anything other than `auto`, then the browser ignores the height or width setting and applies the `flex-basis` setting. For example, if the element has a width of `400px` and `flex-basis` is set to `350px`, then the starting size for the flex item is `350px`. 

{{< admonition "" tip >}}
If you set `flex-basis` to anything other than `auto`, flexbox ignores any `width` setting and only uses the contents. This is because `flex-grow` and `flex-shrink` begin calculating the sizing values at 0. If the flex item is empty, then it will not have any width or height.
{{< /admonition >}}

### flex-grow

When the browser calculates the `flex-basis`, it does not fill the width of the flex container. Any remaining space is consumed according to the `flex-grow` setting on each flex item.

If `flex-grow` is set to `0`, the item does not grow beyond its `flex-basis` value. If it is set to any number other than 0, then the items grow until the space is used.

The `flex-grow` value acts as a weight. For example, if you set item A to `1` and item B to `2`, then item B will take up twice as much of the remaining space as item A.

### flex-shrink

`flex-shrink` indicates whether a flex item should shrink to prevent overflow in the event that its initial size is larger than the flex container. For example:
- `flex-shrink: 0;` means that the item does not shrink.
- Items with a higher value shrink more than items with a lower value.


Here we set `flex-basis` for each item to 33% of the flex container width and set `flex-shrink` to `1` so the items can shrink, as needed. This is helpful if you use a flex `gap` in your styles. The browser starts with the specified `flex-basis`, but then shrinks the flex items depending on other styles that use the same space, such as `gap`:

```css
dl {
  display: flex;
  justify-content: center;
  gap: 12px;                  /* gap that takes away from flex item size */
}

dl > div {
  flex-basis: 33%;            /* 1/3 of container */
  flex-shrink: 1;             /* browser adjusts for gap */
}
```

### Properties

Apply the following properties to the flex container:

| Properties    | Description                                                                                                                                                                                                 | Values                                                                                        |
| :------------ | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------- |
| `order`       | Controls the order in which flex items appear in the container, independent of the source HTML order. All items are `0`, so to place an item before all items in the default requires you set this to `-1`. | `<integer>` (default: `0`)                                                                    |
| `flex-grow`   | How much a flex item can grow relative to other items when there’s extra space in the container.                                                                                                            | `<number>` (default: `0`)                                                                     |
| `flex-shrink` | How much a flex item can shrink relative to other items when there’s not enough space in the container.                                                                                                     | `<number>` (default: `1`)                                                                     |
| `flex-basis`  | Sets the initial main size of a flex item before space distribution from grow/shrink happens.                                                                                                               | `auto` \| `<length>` \| `<percentage>` (default: `auto`)                                      |
| `flex`        | Shorthand for setting `flex-grow`, `flex-shrink`, and `flex-basis` in one declaration.                                                                                                                      | `none` \| `<flex-grow> <flex-shrink> <flex-basis>`                                            |
| `align-self`  | Overrides the container’s `align-items` value for a specific flex item, controlling cross-axis alignment.                                                                                                   | `auto` \| `flex-start` \| `flex-end` \| `center` \| `baseline` \| `stretch` (default: `auto`) |


## Use cases

[Typical use cases (MDN)](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Flexible_Box_Layout/Typical_Use_Cases_of_Flexbox)

### Centered layout in viewport

To center an element with Flexbox, you can make the `<body>` element the flex container, and then center the flex items verticaly and horizontally:

```css
body {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### Cards

You can use flexbox to make cards that are all the same size. For example, if you have a row of cards with a button at the bottom you can push the button all the way to the bottom with these settings:
- `flex-direction` to `column` on the `content` div
- `flex: 1;` on the `content`. This sets `flex-grow` and `flex-shrink` to `1`, and `flex-basis` to `auto`, which means that the `content` div will take up the vertical space of the container and can shrink. `auto` means we look for a `height` setting and use the contents if it is not set.

```html
<div class="cards">
  <div class="card">
    <div class="content">
      <p>This card doesn't have much content.</p>
    </div>
    <footer>Card footer</footer>
  </div>
  <!-- more cards... -->
</div>
```

```css
.card {
  display: flex;
  flex-direction: column;
}

.card .content {
  /* flex: 1 1 auto; */
  flex: 1;
}
```

### Forms and search bars

These styles target the text input. The input grows and shrinks according to the container size. Its initial size is set with `flex-basis` to use either a defined size or its contents: 

```html
<form class="example">
  <div class="wrapper">
    <input type="text" id="text">
    <input type="submit" value="Send">
  </div>
</form>
```

```css
.wrapper {
  display: flex;
}

.wrapper input[type="text"] {
  flex: 1 1 auto;
}
```