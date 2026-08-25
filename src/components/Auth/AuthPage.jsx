import React, { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export default function AuthPage({ onLoginSuccess }) {
  const [isRegisterView, setIsRegisterView] = useState(false);

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
      {isRegisterView ? (
        <RegisterForm onToggleToLogin={() => setIsRegisterView(false)} />
      ) : (
        <LoginForm 
          onLoginSuccess={onLoginSuccess} 
          onToggleToRegister={() => setIsRegisterView(true)} 
        />
      )}
    </div>
  );
}