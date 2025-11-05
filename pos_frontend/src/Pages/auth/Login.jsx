import React from "react";
import AuthForm from "../../Components/auth/AuthForm";

function Login() {
  return (
    <section className="size-full">
      <div className="">
        <AuthForm type="sign-in" />
      </div>
    </section>
  );
}

export default Login;
