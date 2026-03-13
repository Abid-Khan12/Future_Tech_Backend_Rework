import { rateLimit } from "express-rate-limit";

const limiter = rateLimit({
   windowMs: 60000,
   limit: 50,
   standardHeaders: "draft-8",
   legacyHeaders: false,
   message: {
      error: "Too many request please try again later.",
   },
});

export default limiter;
