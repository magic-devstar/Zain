import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import Login from "./Login";
import Signup from "./Signup";
// import TwoFactorAuthenticationage from "./TwoFactorAuthenticationage";

function AuthMainPage() {
    return (
        <>
            <Routes>
                {/* Home page  */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<Login />} />
                <Route path="/sign-up" element={<Signup />} />

                {/* Not Found Page */}
                <Route
                    path="*"
                    element={
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                height: "100vh",
                            }}
                        >
                            <h1 className="black-text">404 - Page Not Found</h1>
                        </div>
                    }
                />
            </Routes>
        </>
    );
}

export default AuthMainPage;
