import crypto from "crypto";

const generateSlug = (): string => {
   return crypto
      .randomBytes(9)
      .toString("base64")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 12);
};

export default generateSlug;
