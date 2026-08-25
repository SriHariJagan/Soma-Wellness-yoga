import React from "react";
import RegisterForm from "../components/Auth/RegisterForm";
import { useNavigate } from "react-router-dom";

const NewUser = () => {
  const navigate = useNavigate();
  const redirectTo = new URLSearchParams(window.location.search).get("redirectTo") || "";

  return (
    <RegisterForm
      redirectTo={redirectTo}
      onToggleToLogin={() => navigate(redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login")}
      onRegisterSuccess={() => navigate(redirectTo ? `/login?redirectTo=${encodeURIComponent(redirectTo)}` : "/login")}
    />
  );
};

export default NewUser;
