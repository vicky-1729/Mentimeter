import crypto from "node:crypto";
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand
} from "@aws-sdk/client-s3";

const s3 = new S3Client({});

const AUTH_BUCKET = process.env.AUTH_BUCKET;
const AUTH_BUCKET_PREFIX = process.env.AUTH_BUCKET_PREFIX || "auth/";
const TOKEN_SECRET = process.env.AUTH_TOKEN_SECRET;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "OPTIONS,POST"
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

function getS3Key(relativePath) {
  return `${AUTH_BUCKET_PREFIX}${relativePath}`;
}

async function readJsonFromS3(key) {
  const output = await s3.send(
    new GetObjectCommand({
      Bucket: AUTH_BUCKET,
      Key: getS3Key(key)
    })
  );
  const body = await output.Body.transformToString();
  return JSON.parse(body);
}

async function writeJsonToS3(key, data) {
  await s3.send(
    new PutObjectCommand({
      Bucket: AUTH_BUCKET,
      Key: getS3Key(key),
      Body: JSON.stringify(data),
      ContentType: "application/json"
    })
  );
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function makeToken(payload) {
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", TOKEN_SECRET)
    .update(encodedPayload)
    .digest("base64url");
  return `${encodedPayload}.${signature}`;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function parseBody(event) {
  if (!event.body) {
    return {};
  }
  return JSON.parse(event.body);
}

async function userExists(userKey) {
  try {
    await s3.send(
      new HeadObjectCommand({
        Bucket: AUTH_BUCKET,
        Key: getS3Key(userKey)
      })
    );
    return true;
  } catch {
    return false;
  }
}

async function handleSignup(event) {
  const { name, email, password } = parseBody(event);
  const normalizedEmail = normalizeEmail(email);

  if (!name || !normalizedEmail || !password) {
    return response(400, { message: "name, email and password are required" });
  }

  if (password.length < 6) {
    return response(400, { message: "password must be at least 6 characters" });
  }

  const userKey = `users/${encodeURIComponent(normalizedEmail)}.json`;
  const exists = await userExists(userKey);

  if (exists) {
    return response(409, { message: "User already exists" });
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  await writeJsonToS3(userKey, {
    name: String(name).trim(),
    email: normalizedEmail,
    passwordHash,
    salt,
    createdAt: new Date().toISOString()
  });

  return response(201, { message: "User created successfully" });
}

async function handleLogin(event) {
  const { email, password } = parseBody(event);
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !password) {
    return response(400, { message: "email and password are required" });
  }

  const userKey = `users/${encodeURIComponent(normalizedEmail)}.json`;

  try {
    const user = await readJsonFromS3(userKey);
    const computedHash = hashPassword(password, user.salt);

    if (computedHash !== user.passwordHash) {
      return response(401, { message: "Invalid email or password" });
    }

    const token = makeToken({
      email: user.email,
      exp: Date.now() + 1000 * 60 * 60 * 8
    });

    return response(200, {
      token,
      user: {
        name: user.name,
        email: user.email
      }
    });
  } catch {
    return response(401, { message: "Invalid email or password" });
  }
}

export const handler = async (event) => {
  if (!AUTH_BUCKET || !TOKEN_SECRET) {
    return response(500, { message: "Missing required Lambda environment variables" });
  }

  if (event.requestContext?.http?.method === "OPTIONS") {
    return response(200, { ok: true });
  }

  const method = event.requestContext?.http?.method || event.httpMethod;
  const path = event.rawPath || event.path || "";

  if (method === "POST" && path.endsWith("/auth/signup")) {
    return handleSignup(event);
  }

  if (method === "POST" && path.endsWith("/auth/login")) {
    return handleLogin(event);
  }

  return response(404, { message: "Not found" });
};
