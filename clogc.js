#!/usr/bin/env node
'use strict'

const most = require('most')
const spawn = require('child_process').spawn
// const color = require('cli-color')
const docopt = require('docopt').docopt

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
      return most.fromEvent('data', spawn('ping', ['-O', host]).stdout)
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
        .thru(buffer).filter((bo) => !(bo[0] === -3 && bo[1] === -1)).map((bo) => bo[1])
    case 'win32':
      return most.fromEvent('data', spawn('ping', ['-t', host]).stdout)
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
      switch (ping) {
        case -3:
          return legend.authFail
        case -2:
          return legend.connFail
        case -1:
          return legend.connFail
        default:
          return legend.latency.find((bracket) => ping < bracket.step).symbol
      }
    })
    .thru((ping$) => { // Formatting and timed grouping.
      let colc = 1
      return ping$
        .timestamp()
        .map((tp) => ({time: new Date(tp.time), value: tp.value}))
        .thru(buffer)
        .flatMap((btp) => {
          let prefix = []
          if (opts.col > 0) { // If there minute-grouped are columns to draw.
            if (!btp[0]) {
              prefix.push(`hh:mm  `)
              prefix.push(...new Array(btp[1].time.getSeconds() - 1).fill(' '))
            } else if (btp[0].time.getMinutes() !== btp[1].time.getMinutes()) {
              prefix.push((colc = ++colc % opts.col) === 0 ? '\n' + `hh:mm  ` : legend.separator)
            }
          } else { // Or if it's hour grouped.
            if (!btp[0]) {
              prefix.push(`hh:mm  ` + '\n')
            } else if (btp[0].time.getHours() !== btp[1].time.getHours()) {
              prefix.push('\n' + `hh:mm  ` + '\n')
            }
          }
          return most.from(prefix.concat(btp[1].value))
        })
    })
}

const DOC = `
Usage: clogc.js [options] [<host>]

Options:
  --col <col>     Colums to display.  [default: 1]
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
