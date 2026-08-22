// A thin, provider-agnostic SMS sender. Configure it entirely through env vars
// (see backend/.env.example) so switching from a phone-as-gateway app (for a
// SIM you're topping up manually) to a paid provider later (Greenweb,
// BoomCast, Twilio, etc.) never requires touching this code.
//
// Most SMS HTTP APIs — including the free "SMS Gateway" style Android apps
// that turn a phone + SIM into an HTTP endpoint — accept a simple GET or POST
// request with the destination number, message text, and an API key as query
// params or a JSON body. SMS_* env vars describe exactly that shape.
//
// If SMS_API_URL isn't set yet, this falls back to just logging the code to
// the server console — enough to fully test the OTP flow before you've set
// up any gateway at all.

const PROVIDER_URL = process.env.SMS_API_URL;
const METHOD = (process.env.SMS_METHOD || "GET").toUpperCase();
const PHONE_PARAM = process.env.SMS_PHONE_PARAM || "to";
const MESSAGE_PARAM = process.env.SMS_MESSAGE_PARAM || "message";
const API_KEY_PARAM = process.env.SMS_API_KEY_PARAM || "api_key";
const API_KEY = process.env.SMS_API_KEY || "";
let EXTRA_PARAMS = {};
try {
  EXTRA_PARAMS = process.env.SMS_EXTRA_PARAMS ? JSON.parse(process.env.SMS_EXTRA_PARAMS) : {};
} catch {
  console.warn("[sms] SMS_EXTRA_PARAMS is not valid JSON — ignoring it.");
}

async function sendSms(phone, message) {
  if (!PROVIDER_URL) {
    // Development / pre-gateway fallback — never blocks the OTP flow.
    console.log(`[sms:SIMULATED] to ${phone}: ${message}`);
    return { simulated: true };
  }

  const params = {
    [PHONE_PARAM]: phone,
    [MESSAGE_PARAM]: message,
    ...(API_KEY ? { [API_KEY_PARAM]: API_KEY } : {}),
    ...EXTRA_PARAMS,
  };

  let res;
  if (METHOD === "POST") {
    res = await fetch(PROVIDER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
  } else {
    const url = new URL(PROVIDER_URL);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    res = await fetch(url.toString());
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`SMS provider returned ${res.status}: ${text.slice(0, 200)}`);
  }

  return { simulated: false, status: res.status };
}

module.exports = { sendSms };
