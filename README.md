# Password Guardian

Password Guardian is a browser extension that evaluates the strength of passwords as you type. The extension highlights weak or compromised passwords by checking them against common patterns and the public "Have I Been Pwned" API.

## Development

1. Install dependencies
   ```bash
   npm install
   ```

2. Build the extension
   ```bash
   npm run build
   ```
   The production files will be generated in the `dist/` directory. Load this folder as an unpacked extension in Chrome.

### Optional: Building the analyzer

The `analyze-web` folder contains a small utility application used to train new keyword patterns. To build it:

```bash
cd analyze-web
npm install
npm run build
```

## License

This project is provided for educational purposes.
