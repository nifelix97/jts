import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useState } from "react";
import { FiLock, FiMail } from "react-icons/fi";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import loginAnimation from "../assets/Login.json";
import { Button, Card, Input, PasswordInput, SectionTitle } from "../components/ui";
import { useAppDispatch } from "../store/hooks";
import { useLoginMutation } from "../store/services/authService";
import { setCredentials } from "../store/slices/authSlice";



export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // 1. Call the API
      const result = await login({ email, password }).unwrap();

      // 2. Save token + user in Redux (and localStorage)
      dispatch(setCredentials(result));

      // 3. Navigate after a tick so Redux state is committed before the
      //    dashboard mounts and fires the permissions query
      const role = result.data.user.role;
      const roleRoutes: Record<string, string> = {
        ADMIN: "/admin",
        RECEPTIONIST: "/reception",
        SALES: "/sales",
        DAF: "/finance/daf",
        ACCOUNTANT: "/finance/accountant1",
        PRODUCTION_MANAGER: "/production-manager",
        STOCK: "/stock",
        SUPERVISOR: "/supervisor",
        WORKER: "/worker",
        HR: "/hr",
        HOBE: "/hobe",
        CASHIER: "/cashier",
      };
      setTimeout(() => navigate(roleRoutes[role] ?? "/"), 0);
    } catch {
      toast.error("Invalid email or password.");
    }
  };

  return (
    <div
      className="
        min-h-screen w-full flex items-center justify-center
        bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900
        px-4 xs:px-6 sm:px-8
      "
    >
      {/* Outer card — white/light container */}
      <Card
        className="
          !p-0 !rounded-3xl !border-0
          w-full max-w-xs xxs:max-w-sm xs:max-w-md sm:max-w-xl md:max-w-3xl lg:max-w-4xl xl:max-w-5xl
          bg-custom-50 shadow-2xl overflow-hidden
          flex flex-col md:flex-row
        "
      >
        {/* Left — illustration */}

        <div
          className="
            hidden md:flex flex-1 items-center justify-center
            bg-gradient-to-br from-primary-400 to-primary-900
            p-6 lg:p-12 flex flex-col
          "
        >
          <div className="text-white lg:text-2xl">
            <h1>Welcome Santrack System</h1>
          </div>
          <DotLottieReact
            data={loginAnimation}
            loop
            autoplay
            className="w-full max-w-xs lg:max-w-sm xl:max-w-md"
          />
        </div>

        {/* Right — login form card */}
        <Card
          className="
            !rounded-3xl !border-0
            flex flex-col justify-center
            w-full md:w-80 lg:w-96 xl:w-[26rem]
            !bg-primary-700
            !px-8 !py-10 xs:!px-10 xs:!py-12
            m-0 md:m-4 lg:m-6
            shadow-xl
          "
        >
          {/* Title */}
          <SectionTitle
            title="Login"
            align="center"
            className="mb-8 [&_h2]:text-secondary-200 [&_h2]:text-2xl xs:[&_h2]:text-3xl"
          />

          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
            noValidate
          >
            {/* Email */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300 pointer-events-none select-none z-10">
                <FiMail className="w-4 h-4" />
              </span>
              <Input
                id="email"
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                fullWidth
                className="!bg-secondary-200 !border-transparent pl-9 focus:!border-primary-300 focus:!ring-primary-300/40"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300 pointer-events-none select-none z-10">
                <FiLock className="w-4 h-4" />
              </span>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
                inputClassName="!bg-secondary-200 !border-transparent pl-9 focus:!border-primary-300 focus:!ring-primary-300/40 !rounded-xl"
              />
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded accent-yellow-400 cursor-pointer"
                />
                <span className="text-xs text-secondary-200 font-[family-name:var(--font-family-primary)]">
                  Remember me
                </span>
              </label>
              <Link
                to="/forgot-password"
                className="
                  text-xs text-yellow-400 hover:text-yellow-300
                  font-[family-name:var(--font-family-primary)]
                  transition-colors duration-200
                  focus:outline-none focus:underline
                "
              >
                Forgot your password?
              </Link>
            </div>

            {/* Login button — yellow override via className */}
            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={isLoading}
              className="
                !bg-yellow-400 hover:!bg-yellow-300 active:!bg-yellow-500
                !text-secondary-100 tracking-widest uppercase
                focus:!ring-yellow-300/60
                disabled:opacity-60 disabled:cursor-not-allowed
              "
            >
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </Card>
      </Card>
    </div>
  );
}
