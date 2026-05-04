# Camera Scanner Setup Guide

This guide covers setting up camera access for the POS barcode scanner feature during development and production.

## Development Setup

### HTTPS Requirement for Camera Access

Modern browsers require HTTPS for camera access due to security policies. During development, you have several options:

#### Option 1: Use mkcert (Recommended for Local Development)

1. Install mkcert:
```bash
# Windows (using Chocolatey)
choco install mkcert

# Or download from https://github.com/FiloSottile/mkcert/releases
```

2. Create a local certificate authority:
```bash
mkcert -install
```

3. Generate a certificate for localhost:
```bash
mkcert localhost 127.0.0.1 ::1
```

4. Move the certificates to your project:
```bash
mv localhost+2.pem ./
mv localhost+2-key.pem ./
```

5. Update your `package.json` dev script:
```json
{
  "scripts": {
    "dev": "next dev --experimental-https --experimental-https-key ./localhost+2-key.pem --experimental-https-cert ./localhost+2.pem"
  }
}
```

#### Option 2: Use ngrok (External Testing)

1. Install ngrok:
```bash
npm install -g ngrok
```

2. Start your Next.js app normally:
```bash
npm run dev
```

3. In another terminal, expose your local server:
```bash
ngrok http 3000
```

4. Use the HTTPS URL provided by ngrok.

#### Option 3: Use Vercel Dev (Quick Setup)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Link your project:
```bash
vercel link
```

3. Run locally with Vercel:
```bash
vercel dev
```

## Browser Permissions

### Granting Camera Access

1. When you first try to use the camera scanner, the browser will prompt for permission
2. Click "Allow" to grant camera access
3. If you accidentally deny, you can reset permissions:
   - **Chrome**: Settings → Privacy and security → Site Settings → Camera
   - **Firefox**: Settings → Privacy & Security → Permissions → Camera
   - **Safari**: Safari → Settings → Websites → Camera

### Common Issues and Solutions

#### "Camera access denied"
- Check browser permissions
- Ensure you're using HTTPS or localhost
- Try refreshing the page and granting permission again

#### "No camera detected"
- Check if your device has a camera
- Ensure no other app is using the camera
- Try a different browser

#### "Camera already in use"
- Close other video conferencing apps (Zoom, Teams, etc.)
- Restart your browser
- Check browser tabs that might be using the camera

## Production Deployment

### HTTPS in Production

- Vercel automatically provides HTTPS certificates
- No additional configuration needed
- Camera access will work out of the box

### Testing Camera Functionality

1. Navigate to the admin dashboard products page
2. Click "Scan Kamera" button
3. Grant camera permissions when prompted
4. Point camera at a barcode
5. Verify the barcode is detected and processed

## Supported Barcode Formats

The camera scanner supports the following formats:
- EAN-13 (most common retail barcodes)
- EAN-8 
- Code 128
- UPC-A
- UPC-E

## Troubleshooting

### Debug Mode

To enable debug logging for the camera scanner:
1. Open browser developer tools
2. Look for console logs starting with "Camera access error:"
3. Check for specific error messages

### Mobile Devices

On mobile devices:
- Use the device's native camera app for best results
- Ensure good lighting conditions
- Hold the device steady when scanning

### Performance Tips

- Good lighting improves scan accuracy
- Keep the barcode flat and unobstructed
- Hold camera at appropriate distance (not too close, not too far)
- Ensure barcode is in focus before scanning

## Security Considerations

- Camera access is only granted when user explicitly allows it
- Camera stream is stopped when scanner modal is closed
- No camera data is stored or transmitted
- All processing happens locally in the browser
