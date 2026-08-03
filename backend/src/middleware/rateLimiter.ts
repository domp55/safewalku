import rateLimit from "express-rate-limit";

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10000,
    skip: (req) => {
        const ip = req.ip || req.socket.remoteAddress || "";
        return ip.includes("127.0.0.1") || ip.includes("::1") || ip.includes("localhost") || process.env.NODE_ENV !== "production";
    },
    message: {
        message: "Demasiadas solicitudes."
    }
});

export default limiter;