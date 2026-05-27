import "dotenv/config";

const token = process.env.EVOLUTION_WEBHOOK_TOKEN;
if (!token) {
  console.error("EVOLUTION_WEBHOOK_TOKEN is required.");
  process.exit(1);
}

const port = process.env.API_PORT || process.env.PORT || "3000";
const url = `http://localhost:${port}/webhooks/evolution?token=${encodeURIComponent(token)}`;

const payload = {
  event: "Message",
  instanceId: process.env.EVOLUTION_INSTANCE_ID || "sample-instance",
  instanceToken: "sample-token",
  data: {
    Info: {
      Chat: "5511999999999@s.whatsapp.net",
      Sender: "5511999999999@s.whatsapp.net",
      IsFromMe: false,
      IsGroup: false,
      ID: "sample-message-1",
      Type: "text",
      PushName: "Maria",
      Timestamp: new Date().toISOString(),
      MediaType: ""
    },
    Message: {
      conversation: "quanto custa manicure?"
    }
  }
};

const response = await fetch(url, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(payload)
});

console.log(response.status, await response.text());
process.exit(response.ok ? 0 : 1);
