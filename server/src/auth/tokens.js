import jwt from "jsonwebtoken";

const ALGORITHM = "HS256"; // HMAC + SHA-256 with our secret
const EXPIRES_IN = "7d";

// Creates the login token the app sends back with every request.
// "sub" (subject) is the standard JWT field for "who this token is about".
export function createToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, {
    algorithm: ALGORITHM,
    expiresIn: EXPIRES_IN,
  });
}

// Checks the signature and expiry. Throws if the token is fake or expired.
// Only HS256 is accepted, so a token signed another way is rejected.
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET, { algorithms: [ALGORITHM] });
}

// What the app may see about a user: never the password hash.
export function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
