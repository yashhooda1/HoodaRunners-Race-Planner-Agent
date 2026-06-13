import { NextRequest, NextResponse } from "next/server";
import { GoogleAuth } from "google-auth-library";

const REASONING_ENGINE_ID = "603102468800249856";
const PROJECT = "hoodarunner";
const LOCATION = "us-central1";
const BASE = `https://${LOCATION}-aiplatform.googleapis.com/v1beta1/projects/${PROJECT}/locations/${LOCATION}/reasoningEngines/${REASONING_ENGINE_ID}`;

async function getAccessToken(): Promise<string> {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const keyJson = Buffer.from(
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
      "base64"
    ).toString("utf-8");
    const key = JSON.parse(keyJson);
    const auth = new GoogleAuth({
      credentials: key,
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    return tokenRes.token!;
  }
  // Local dev — Application Default Credentials
  const auth = new GoogleAuth({
    scopes: ["https://www.googleapis.com/auth/cloud-platform"],
  });
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  return tokenRes.token!;
}

/** Extract readable text from a single ADK stream event object */
function extractText(event: Record<string, unknown>): string {
  // Pattern 1: event.content.parts[].text  (model turn)
  const content = event.content as Record<string, unknown> | undefined;
  if (content && Array.isArray(content.parts)) {
    const parts = content.parts as Array<Record<string, unknown>>;
    const texts = parts.map((p) => String(p.text ?? "")).filter(Boolean);
    if (texts.length) return texts.join("");
  }

  // Pattern 2: event.text (some versions)
  if (typeof event.text === "string" && event.text) return event.text;

  // Pattern 3: event.output
  if (typeof event.output === "string" && event.output) return event.output;

  return "";
}

export async function POST(req: NextRequest) {
  try {
    const { message, userId, sessionId } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const token = await getAccessToken();

    // stream_query uses the :streamQuery endpoint (NDJSON response)
    const res = await fetch(`${BASE}:streamQuery`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        classMethod: "stream_query",
        input: {
          message: message,
          user_id: userId || sessionId || "web-user",
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Agent Engine error:", res.status, errText);
      return NextResponse.json(
        { error: `Agent error ${res.status}`, detail: errText },
        { status: 502 }
      );
    }

    // The response is NDJSON (newline-delimited JSON) — collect all chunks
    const rawText = await res.text();
    const lines = rawText.split("\n").filter((l) => l.trim());

    let fullReply = "";

    for (const line of lines) {
      // Each line may be wrapped in a JSON array element from the HTTP/2 response
      let cleanLine = line.trim();
      // Strip leading "[" or "," or "]" from streaming array wrapper
      if (cleanLine.startsWith("[")) cleanLine = cleanLine.slice(1);
      if (cleanLine.startsWith(",")) cleanLine = cleanLine.slice(1);
      if (cleanLine === "]") continue;

      try {
        const obj = JSON.parse(cleanLine) as Record<string, unknown>;

        // The Vertex AI streaming wrapper: { result: { response: <event> } }
        // or directly the event
        const inner =
          (obj.result as Record<string, unknown>)?.response ??
          obj.response ??
          obj;

        const text = extractText(inner as Record<string, unknown>);
        if (text) fullReply += text;
      } catch {
        // Not valid JSON — skip
      }
    }

    if (!fullReply) {
      // Last resort: return raw body for debugging
      console.warn("No text extracted from stream. Raw:", rawText.slice(0, 500));
      fullReply = "The agent responded but I couldn't extract the text. Raw: " + rawText.slice(0, 300);
    }

    return NextResponse.json({ reply: fullReply });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json(
      { error: "Internal server error", detail: String(err) },
      { status: 500 }
    );
  }
}
