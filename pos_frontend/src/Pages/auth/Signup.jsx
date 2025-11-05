import React from "react";
import AuthForm from "../../Components/auth/AuthForm";

function Signup() {
  return (
    <section className="size-full">
      <div className="">
        <AuthForm type="sign-up" />
      </div>
    </section>
  );
}

export default Signup;
