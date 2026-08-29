import React from "react";
import AuthCard from "../components/Auth/AuthCard";

const Login = ({ onLoginSuccess }) => (
  <AuthCard initialView="login" onLoginSuccess={onLoginSuccess} />
);

export default Login;
