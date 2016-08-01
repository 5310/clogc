# Clog C

Clog C is a command-line ping visualizer built to get an at-a-glance overview of our really poor Internet connection.

It is actually third (and the second version thereod) in the line of the Clog apps all built to diagnose awful Internet connectivity: the first being a static visualizer for data scrounged off of my old DSL router, the second a realtime visualizer still is use, but is buggy. I decided to make a new one, but can't find the time to invest in an entirely new GUI app, so I went with a CLI one instead.

```
Usage: clogc.js [options] [<host>]

Options:
  -c --col <col>     Colums to display.  [default: 1]
```

I just use it with `$ clogc -c 0` on my desktop, which pings the default Google DNS server and fills the entire width of my terminal with the output, and on the phone I use `$ clogc` by default which outputs every minute on its own line.
