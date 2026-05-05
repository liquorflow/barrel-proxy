# barrel-proxy

A zero-config reverse proxy with live-reload support for local multi-service development.

---

## Installation

```bash
npm install -g barrel-proxy
```

---

## Usage

Create a `barrel.config.js` in your project root:

```js
module.exports = {
  port: 3000,
  services: [
    { route: "/api", target: "http://localhost:4000" },
    { route: "/auth", target: "http://localhost:4001" },
    { route: "/", target: "http://localhost:5173" },
  ],
};
```

Then start the proxy:

```bash
barrel-proxy
```

All configured services will be accessible through a single port (`3000` by default). Changes to `barrel.config.js` are picked up automatically — no restart needed.

### CLI Options

| Flag | Description | Default |
|------|-------------|---------|
| `--port` | Port to listen on | `3000` |
| `--config` | Path to config file | `barrel.config.js` |
| `--no-reload` | Disable live-reload | `false` |

---

## Why barrel-proxy?

When working with microservices or a split frontend/backend setup locally, managing multiple ports gets messy fast. `barrel-proxy` gives you a single entry point with no boilerplate.

---

## License

[MIT](LICENSE)