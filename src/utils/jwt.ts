import { createDecoder, createSigner, createVerifier } from "fast-jwt";

const JWT_Signer = createSigner({
  key: process.env.REFRESH_SECRET,
  expiresIn: 6.048e8,
});
const JWT_Verifier = createVerifier({ key: process.env.REFRESH_SECRET });

const JWT_Decoder = createDecoder();

export { JWT_Signer, JWT_Verifier, JWT_Decoder };
