import React from "react";
import AuthCard from "../components/Auth/AuthCard";

const NewUser = () => {
  const redirectTo = new URLSearchParams(window.location.search).get("redirectTo") || "";
  return <AuthCard initialView="register" redirectTo={redirectTo} />;
};

export default NewUser;
