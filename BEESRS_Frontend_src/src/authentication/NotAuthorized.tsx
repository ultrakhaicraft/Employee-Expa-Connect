import { motion } from "framer-motion";
import { FaHome, FaLock } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import type { FC } from "react";
import { colors } from "@/lib/colors";

const NotAuthorized: FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none flex items-center justify-center" style={{ background: `linear-gradient(135deg, #ffffff 0%, #f5f7fb 100%)` }}>
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full blur-3xl opacity-40"
            style={{
              width: 220,
              height: 220,
              left: `${(i * 17) % 100}%`,
              top: `${(i * 23) % 100}%`,
              background: `radial-gradient(ellipse at center, ${colors.primary.from}30 0%, ${colors.primary.to}10 60%, transparent 70%)`,
            }}
            animate={{ x: [-20, 20, -20], y: [10, -10, 10], rotate: [0, 10, 0] }}
            transition={{ duration: 8 + i, repeat: Infinity, ease: "easeInOut", delay: i * 0.15 }}
          />
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full rounded-2xl p-8 text-center shadow-xl"
        style={{
          background: `linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))`,
          border: `1px solid ${colors.primary.to}30`,
          backdropFilter: 'blur(14px)'
        }}
      >
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${colors.primary.from}, ${colors.primary.to})`,
            boxShadow: `0 12px 40px ${colors.primary.to}40, inset 0 0 20px #ffffff40`
          }}
        >
          <FaLock className="text-white text-3xl" />
        </div>
        <h1
          className="text-3xl font-bold mb-3"
          aria-label="403 - Access Denied"
          style={{
            background: `linear-gradient(to right, ${colors.primary.from}, ${colors.primary.to})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          403 - Not Authorized
        </h1>
        <p
          className="text-gray-600 mb-8"
          aria-label="Explanation for access denial"
        >
          You do not have permission to access this page.
        </p>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="text-white font-semibold py-2.5 px-4 rounded-full inline-flex items-center transition duration-300 ease-in-out focus:outline-none"
          aria-label="Go back to homepage"
          onClick={() => navigate("/")}
          style={{
            background: `linear-gradient(90deg, ${colors.primary.from}, ${colors.primary.to})`,
            boxShadow: `0 10px 24px ${colors.primary.to}40`
          }}
        >
          <FaHome className="mr-2" />
          Go to Homepage
        </motion.button>
      </motion.div>
    </div>
  );
};

export default NotAuthorized;
