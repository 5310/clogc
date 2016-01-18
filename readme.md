# Clog C

Clog C is a command-line ping visualizer built to get an at-a-glance overview of our really poor Internet connection.

It is actually third in the line of the Clog apps all built to diagnose awful Internet connectivity: the first being a static visualizer for data scrounged off of my old DSL router, the second a realtime visualizer still is use, but is buggy. I decided to make a new one, but can't find the time to invest in an entirely new GUI app, so I went with a CLI one instead.

```
Usage: clogc [options] [<host>]

Options:
  --min <min>     Minimum latency normalization limit.  [default: 0]
  --max <max>     Maximum latency normalization limit.  [default: 800]
  --style <style> Style of the latency visualization.   [default: slab]
```

I just use it with `$ clogc --min 50`, which normalizes for my expected maximu latency of 50ms to Google DNS (8.8.8.8) if the connection is working correctly! (Spoilers: it isn't.)