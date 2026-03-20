import crypto from "node:crypto";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

const DATA_BUCKET = process.env.DATA_BUCKET;
const DATA_BUCKET_PREFIX = process.env.DATA_BUCKET_PREFIX || "data/";
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,GET,POST"
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function parseBody(event) {
  if (!event.body) {
    return {};
  }
  return JSON.parse(event.body);
}

function getS3Key(relativePath) {
  return `${DATA_BUCKET_PREFIX}${relativePath}`;
}

function verifyToken(authorizationHeader) {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice(7);
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(encodedPayload)
    .digest("base64url");

  if (expected !== signature) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Date.now()) {
    return null;
  }

  return payload;
}

async function readJsonFromS3(key) {
  try {
    const output = await s3.send(
      new GetObjectCommand({
        Bucket: DATA_BUCKET,
        Key: getS3Key(key)
      })
    );
    const body = await output.Body.transformToString();
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function writeJsonToS3(key, data) {
  await s3.send(
    new PutObjectCommand({
      Bucket: DATA_BUCKET,
      Key: getS3Key(key),
      Body: JSON.stringify(data),
      ContentType: "application/json"
    })
  );
}

export const handler = async (event) => {
  if (!DATA_BUCKET || !TOKEN_SECRET) {
    return response(500, { message: "Missing required Lambda environment variables" });
  }

  if (event.requestContext?.http?.method === "OPTIONS") {
    return response(200, { ok: true });
  }

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path || "";

  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  const tokenPayload = verifyToken(authHeader);

  if (!tokenPayload) {
    return response(401, { message: "Unauthorized" });
  }

  const userDataKey = `data/${encodeURIComponent(tokenPayload.email)}.json`;

  if (method === "GET" && path.endsWith("/data/me")) {
    const data = await readJsonFromS3(userDataKey);
    return response(200, {
      email: tokenPayload.email,
      data: data || {}
    });
  }

  if (method === "POST" && path.endsWith("/data/me")) {
    const { data } = parseBody(event);
    const payload = {
      ...data,
      updatedAt: new Date().toISOString()
    };

    await writeJsonToS3(userDataKey, payload);

    return response(200, {
      message: "Data saved",
      email: tokenPayload.email,
      data: payload
    });
  }

  return response(404, { message: "Not found" });
};
