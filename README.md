# heatmap.js

Dynamic Heatmaps for the Web.

[<img src="http://www.patrick-wied.at/static/heatmapjs/assets/img/heatmapjs-examples-docs-banner.jpg" width="100%">](http://www.patrick-wied.at/static/heatmapjs/?utm_source=gh 'View the heatmap.js website with usage examples, showcases, best practises, plugins ( googlemaps heatmap, leaflet) and more.')

## Kilian notes and caveats

The add data methods works counter counterintuitively. As adding 2 data points will
result only in the higher one to show up

```js
heatmap.addData({ x: 500, y: 500, value: 10, radius: 100 });
//The first point will show up
heatmap.addData({ x: 600, y: 500, value: 5, radius: 100 });
//The output will not change as the minimum value was just set to 5 and
//This value is not drawn.

//An additional data point with the true min point of the data set should be
//added to set the correct lower boundary
//heatmap.addData({ x: 0, y:0, value: 0, radius: 100});
```

Additionally there is a visual differenz between initializing the heatmap with a value of 5*X at a given location 
or adding 5 times 1*X. This discrepancy is only resolved upon creating a full rerender either due to an extrema 
change or a manual call to repaint.

### Changes in this fork

`setData` now allows to pass the option `calculateExtrema` which results in
the minimum and maximum values of the dataset to be used for color gradients. The values are taken into account after summing up values in the same location.

```js
heatmap.setData({
  data: data,
  calculateExtrema: true,
  min: 0,
});
```

`removeData` was implemented allowing to remove `weight` from a specified location. Heatmap-js creates it's effect by iteratively drawing individual data points on an canvas with a given opacity creating a blending effect for busy areas. New data points are painted on top 
of the existing canvas resulting in dirty patches before data is rerendered completely. 

Since it is not possible to subtract a gradient from a canvas removeData requires a full redraw in order to have an effect!

````js
removeData: function (data, redraw = true, adjustExtrema = false, minDeletionThreshold = 0)
````

|Parameter | Description |
| --- | --- |
| data | Data point with `x`, `y`, and value. The value is the amount of weight to remove at the specified location
| redraw | redraw the entire canvas. If data should be added afterwards redrawing can be postponed by setting the flag to false |
| adjustExtrema | should min,max be recalculated if the  bucket with an extrema value was modified by the reduction operation? This flag is helpful if the highest current data point should always represent the maximum gradient |
| minDeletionThreshold | If the remaining value in the location is lower than the given number the data point is considered deleted |

## mars3d update

- fix: An error "Cannot assign to read only property 'data' of object '#<ImageData>'"
- add: Added support for typescript in index.d.ts
- The NPM package was released `@mars3d/heatmap.js`

## How to get started

The file you're ultimately looking for is **heatmap.js** or **heatmap.min.js**

heatmap.js is also hosted on npm:

`npm install --save https://github.com/KilianB/heatmap.js/tarball/master`

### How to run the local examples

Start a webserver (e.g. python SimpleHTTPServer from the project directory root):

`python -m SimpleHTTPServer 1337 &`

Then browse to

`http://localhost:1337/examples/`

## Get involved

Please have a look at the [contribution guidelines](CONTRIBUTE.md) before submitting contributions.

**Disclaimer**: PRs can take time to receive feedback or be merged ( I'm only one person with very little time ) but I'm trying to get back to everyone eventually

## Questions?

In order to keep technical questions in a central place where other people can learn from it, the best thing you can do is [post your question to stackoverflow with the tag **heatmap.js**.](http://stackoverflow.com/questions/ask?tags=heatmap.js)

If you do have a very specific question (or need commercial support) don't hesitate to contact me directly [via email](mailto:heatmap-q@patrick-wied.at).

## Mailing list

Want to receive the latest updates and news about heatmap.js?

There is a [mailing list](http://eepurl.com/0mmV5). No spam, just news and important updates.
