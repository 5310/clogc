#!/usr/bin/env node
'use strict'

const rx = require('rx-lite').Observable
const spawn = require('child_process').spawn
const color = require('cli-color')
const docopt = require('docopt').docopt

function ping (host) {
  host = host === undefined ? '8.8.8.8' : host
  switch (process.platform) {
    case 'linux':
      return rx.fromEvent(spawn('ping', ['-O', host]).stdout, 'data')
        .skip(1)
        .map((data) => data.toString())
        .map((output) => {
          switch (true) {
            case (output.startsWith('64 bytes')):
              return Number.parseFloat(output.match(/time=(\d+(\.\d+)?) ms/)[1])
            case (output.startsWith('no answer')):
              return -1
            case (output.search('Destination Host Unreachable') > -1):
              return -2
            default:
              return -3
          }
        })
    case 'win32':
      return rx.fromEvent(spawn('ping', ['-t', host]).stdout, 'data')
        .skip(1)
        .map((data) => data.toString())
        .map((output) => {
          switch (true) {
            case (output.startsWith('Reply from')):
              return Number.parseFloat(output.match(/time=(\d+)ms/)[1])
            case (output.startsWith('Request timed out')):
              return -1
            case (output.startsWith('Destination host unreachable')):
              return -2
            default:
              return -3
          }
        })
    default:
      throw new Error('OS not supported')
  }
}

const SYMBOLS = {
  SPARK: [
    '▁',
    '▂',
    '▃',
    '▄',
    '▅',
    '▆',
    '▇',
    '█'
  ],
  SLAB: [
    '▏',
    '▎',
    '▍',
    '▌',
    '▋',
    '▊',
    '▉',
    '█'
  ],
  SHADE: [
    '░',
    '▒',
    '▓',
    '█'
  ],
  BANG: '!',
  CROSS: '×'
}
const PALETTE = {
  ANSI: {
    LATENCY: [
      color.white,
      color.white,
      color.yellow
    ],
    LOSS: color.bgRed,
    UNREACHABLE: color.bgRedBright,
    UNKNOWN: color.magenta
  },
  XTERM: {
    LATENCY: [
      color.xterm(231),
      color.xterm(231),
      color.xterm(231),
      color.xterm(230),
      color.xterm(230),
      color.xterm(229),
      color.xterm(228),
      color.xterm(220)
    ],
    LOSS: color.bgXterm(202),
    UNREACHABLE: color.bgXterm(160),
    UNKNOWN: color.xterm(55)
  }
}

function clogc (opts) {
  opts = opts || {}
  let host = opts.host
  let min = opts.max === undefined ? 0 : opts.min
  let max = opts.max === undefined ? 800 : opts.max
  let style = opts.style === undefined ? 'SLAB' : opts.style.toUpperCase()
  return ping(host)
    .map((log) => { // Normalizing latencies.
      if (log >= 0) {
        let latency = Math.log(log - min) / Math.log(max - min)
        latency = latency < 0 ? 0 : latency >= 1 ? 1 : latency
        return latency
      } else {
        return log
      }
    })
    .map((log) => { // Visualizing logs.
      let legend = SYMBOLS[style]
      let palette = PALETTE[process.platform === 'linux' ? 'XTERM' : 'ANSI']
      let unknownColor = palette.UNKNOWN
      let unrechableColor = palette.UNREACHABLE
      let lossColor = palette.LOSS
      let latencyColors = palette.LATENCY
      switch (log) {
        case -3:
          return unknownColor(SYMBOLS.BANG)
        case -2:
          return unrechableColor(SYMBOLS.CROSS)
        case -1:
          return lossColor(SYMBOLS.CROSS)
        default:
          let latency = (log * legend.length) | 0
          latency = latency < 0 ? 0 : latency >= legend.length ? legend.length - 1 : latency
          return latencyColors[latency](legend[latency])
      }
    })
}

const DOC = `
Usage: clogc.js [options] [<host>]

Options:
  --min <min>     Minimum latency normalization limit.  [default: 0]
  --max <max>     Maximum latency normalization limit.  [default: 800]
  --style <style> Style of the latency visualization.   [default: slab]
`

if (require.main === module) {
  let opts = docopt(DOC)
  opts = {
    host: opts['<host>'] === null ? undefined : opts['<host>'],
    min: opts['--min'] === null ? undefined : opts['--min'],
    max: opts['--max'] === null ? undefined : opts['--max'],
    style: opts['--style'] === null ? undefined : opts['--style']
  }
  clogc(opts)
    .forEach((log) => process.stdout.write(log))
}
