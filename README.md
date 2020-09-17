# Tuft

A fast, lightweight web framework for Node.js, with no dependencies.

![CI](https://github.com/tuftjs/tuft/workflows/CI/badge.svg)
[![Coverage Status](https://coveralls.io/repos/github/tuftjs/tuft/badge.svg)](https://coveralls.io/github/tuftjs/tuft)
[![Known Vulnerabilities](https://snyk.io/test/github/tuftjs/tuft/badge.svg?targetFile=package.json)](https://snyk.io/test/github/tuftjs/tuft?targetFile=package.json)
![npm](https://img.shields.io/npm/v/tuft)

Official website: [https://tuft.dev](https://tuft.dev)

## Getting started
You can install Tuft via npm:
```sh
npm install tuft
```

A simple "Hello, world!" example:
```js
const { tuft } = require('tuft')

tuft()
  .set('GET /', { text: 'Hello, world!' })
  .createServer({ port: 3000 })
  .start()
  .then(({ host, port }) => {
    console.log(`Server listening at http://${host}:${port}`)
  })
```

For more information on how to use Tuft, see the [official documentation](https://tuft.dev/docs).

## People
The creator and maintainer of Tuft is [Stuart Kennedy](https://github.com/rav2040).

## License
[MIT](https://github.com/tuftjs/tuft/blob/master/LICENSE)
