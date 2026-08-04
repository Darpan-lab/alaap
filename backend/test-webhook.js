import { WebhookReceiver } from "livekit-server-sdk";
const apiKey = "APIUdqj7yp6iX2S";
const apiSecret = "sNGwIBZjEdfonVefxDZOsuKfZlJHoxyNRrg1OYBdFt4B";
const receiver = new WebhookReceiver(apiKey, apiSecret);
try {
  // Try parsing some dummy data? No, we need a valid signature.
  console.log("Receiver methods:", Object.keys(receiver));
} catch(e) { console.error(e); }
