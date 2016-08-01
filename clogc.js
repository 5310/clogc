#!/usr/bin/env node
'use strict'

const most = require('most')
const spawn = require('child_process').spawn
// const color = require('cli-color')
const docopt = require('docopt').docopt

const time = (date) => {
  const pad = (n, width) => `${n}`.length >= width ? `${n}` : new Array(width - `${n}`.length + 1).join('0') + `${n}`
  return `${pad(date.getHours(), 2)}:${pad(date.getMinutes(), 2)}`
}

const buffer = (stream) => {
  let buffer
  return stream
    .map((x) => [buffer, x])
    .tap(
      function (bx) {
        buffer = bx[1]
      }
    )
}

const ping = (host) => {
  switch (process.platform) {
    case 'linux':
      return most.fromEvent('data', spawn('ping', ['-D', '-O', host]).stdout)
        .skip(1)
        .map((data) => data.toString())
        .map((string) => { // Parse timestamps.
          const tokens = string.split(' ')
          return {
            time: new Date(Number.parseFloat(tokens[0].slice(1, -1)) * 1000),
            value: tokens.slice(1).join(' ')
          }
        })
        .map((output) => { // Parse latency and failure status.
          switch (true) {
            case (output.value.startsWith('64 bytes')):
              output.value = Number.parseFloat(output.value.match(/time=(\d+(\.\d+)?) ms/)[1])
              break
            case (output.value.startsWith('no answer')):
              output.value = -1
              break
            case (output.value.search('Destination Host Unreachable') > -1):
              output.value = -2
              break
            default:
              output.value = -3
          }
          return output
        })
        .thru(buffer).filter((bo) => { // Filter out redundant time outs for auth failures.
          return bo[0] ? !(bo[0].value === -3 && bo[1].value === -1) : true
        }).map((bo) => bo[1])
    default:
      throw new Error('OS not supported')
  }
}

const clogc = (opts) => {
  const legend = {
    latency: [
      {step: 20, symbol: '●'},
      {step: 100, symbol: '◉'},
      {step: Number.POSITIVE_INFINITY, symbol: '○'}
    ],
    connFail: '·',
    authFail: '/',
    separator: `—`
  }
  return ping(opts.host)
    .map((ping) => { // Latency normalization.
      switch (ping.value) {
        case -3:
          ping.viz = legend.authFail
          break
        case -2:
          ping.viz = legend.connFail
          break
        case -1:
          ping.viz = legend.connFail
          break
        default:
          ping.viz = legend.latency.find((bracket) => ping.value < bracket.step).symbol
      }
      return ping
    })
    .thru((ping$) => { // Formatting and timed grouping.
      let colc = 0
      return ping$
        .thru(buffer)
        .flatMap((bp) => {
          let prefix = []
          if (opts.col > 0) { // If there minute-grouped are columns to draw.
            if (!bp[0]) {
              prefix.push(time(bp[1].time) + '  ')
              prefix.push(...new Array(bp[1].time.getSeconds()).fill(' '))
            } else if (bp[0].time.getMinutes() !== bp[1].time.getMinutes()) {
              prefix.push((colc = ++colc % opts.col) === 0 ? '\n' + time(bp[1].time) + '  ' : legend.separator)
            }
          } else { // Or if it's hour grouped.
            if (!bp[0]) {
              prefix.push(time(bp[1].time) + '  ' + '\n')
            } else if (bp[0].time.getHours() !== bp[1].time.getHours()) {
              prefix.push('\n' + time(bp[1].time) + '  ' + '\n')
            }
          }
          return most.from(prefix.concat(bp[1].viz))
        })
    })
}

const DOC = `
Usage: clogc.js [options] [<host>]

Options:
  -c --col <col>     Colums to display.  [default: 1]
`

if (require.main === module) {
  let opts = docopt(DOC)
  opts = {
    host: opts['<host>'] || '8.8.8.8',
    col: Number.parseInt(opts['--col'], 10)
  }
  clogc(opts)
    .forEach((log) => process.stdout.write(log))
}
