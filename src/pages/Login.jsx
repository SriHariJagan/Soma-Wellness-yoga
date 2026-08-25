import React from "react";
import LoginForm from "../components/Auth/LoginForm";

const Login = ({ onLoginSuccess }) => {
  return <LoginForm onLoginSuccess={onLoginSuccess} />;
};

export default Login;
